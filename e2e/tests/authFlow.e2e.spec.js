/**
 * E2E Authentication Flow Tests
 *
 * Self-contained: registers a fresh buyer account, then exercises
 * login / invalid-credential / logout flows against the live UI.
 */

import { test, expect } from '@playwright/test';

const TEST_PASSWORD = 'E2eSecurePass123!';
const freshEmail = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@ojawa-test.com`;

// Cookie consent + onboarding tutorial + PWA prompt intercept clicks —
// dismiss them before interacting with the page.
// dispatchEvent fires the handler directly — avoids hit-test stalls when
// fixed overlays briefly overlap each other during entry animations.
const dismissOverlays = async (page) => {
  for (const name of [/^accept$/i, /skip tutorial/i, /not now/i]) {
    const btn = page.getByRole('button', { name }).first();
    if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await btn.dispatchEvent('click').catch(() => {});
      await page.waitForTimeout(300);
    }
  }
};

// /login can render as: a user-type picker, a register-mode form
// (after register→login forwarding), or the sign-in form. Normalize
// to the sign-in form.
const revealLoginForm = async (page) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  // The sign-in submit button only exists in 'existing' mode.
  // Loop: dismiss overlays, then click whichever sign-in toggle is
  // present until the real submit button renders.
  for (let i = 0; i < 6; i++) {
    await dismissOverlays(page);
    if (await page.locator('button[type="submit"]:has-text("Sign In")').isVisible().catch(() => false)) break;
    const toggle = page.getByRole('button', { name: 'Sign in instead' })
      .or(page.getByRole('button', { name: 'Sign in here' }))
      .first();
    if (await toggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await toggle.dispatchEvent('click');
      await page.waitForTimeout(500);
      continue;
    }
    break;
  }
  await expect(page.locator('button[type="submit"]:has-text("Sign In")')).toBeVisible({ timeout: 10000 });
};

// Tests run fully parallel — each test registers its own user so
// there is no cross-test dependency on execution order.
const registerUser = async (page, email) => {
  await page.goto('/register', { waitUntil: 'domcontentloaded' });
  await dismissOverlays(page);
  await page.fill('input[name="displayName"]', 'E2E Test User');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', TEST_PASSWORD);
  await page.fill('input[name="confirmPassword"]', TEST_PASSWORD);
  await dismissOverlays(page);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/login/, { timeout: 30000 });
};

const loginWithCredentials = async (page, email, password) => {
  await revealLoginForm(page);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
};

test.describe('Authentication Flow E2E', () => {
  test('should complete user registration', async ({ page }) => {
    await registerUser(page, freshEmail());
    // registerUser asserts the redirect to /login
  });

  test('should login with valid credentials', async ({ page }) => {
    const email = freshEmail();
    await registerUser(page, email);
    await loginWithCredentials(page, email, TEST_PASSWORD);
    // Buyer lands on /buyer (or intended destination / generic dashboard)
    await page.waitForURL(/\/(buyer|dashboard|checkout|vendor|logistics|admin|home)/, { timeout: 15000 });
  });

  test('should reject invalid credentials', async ({ page }) => {
    await loginWithCredentials(page, 'wrong@example.com', 'wrongpassword');
    // Should show an error and stay on /login
    await expect(page.locator('text=/invalid|incorrect|error|failed/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('should logout successfully', async ({ page }) => {
    const email = freshEmail();
    await registerUser(page, email);
    await loginWithCredentials(page, email, TEST_PASSWORD);
    await page.waitForURL(/\/(buyer|dashboard|checkout|vendor|logistics|admin|home)/, { timeout: 15000 });

    // Logout lives in the desktop navbar dropdown; on mobile it's in
    // the hamburger menu as navbar-mobile-logout-button.
    const desktopMenu = page.locator('button[aria-haspopup="menu"]').first();
    if (await desktopMenu.isVisible().catch(() => false)) {
      await desktopMenu.click();
      await page.locator('[data-testid="navbar-logout-button"]').click();
    } else {
      // Mobile: hamburger toggle is the only md:hidden button in the nav
      await page.locator('nav .md\\:hidden button').first().click();
      await page.locator('[data-testid="navbar-mobile-logout-button"]').click();
    }

    // Logout navigates home
    await page.waitForURL(/ojawa\.africa\/($|login|home|products)/, { timeout: 15000 });
  });
});
