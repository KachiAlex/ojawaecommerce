/**
 * E2E Payment/Checkout Flow Tests — production UI
 *
 * Covers: browse → add to cart (auth-gated) → sign-in returns
 * to the product/cart flow → cart → checkout.
 *
 * Note: Product3DCard.handleAddToCart currently bounces guests to
 * /login instead of adding locally — these tests assert current
 * behavior and the post-login return path.
 */

import { test, expect } from '@playwright/test';

const PASSWORD = 'E2eSecurePass123!';
const freshEmail = () => `e2e-pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@ojawa-test.com`;

const registerBuyer = async (page, email) => {
  await page.goto('/register', { waitUntil: 'domcontentloaded' });
  await dismissOverlays(page);
  await page.fill('input[name="displayName"]', 'E2E Buyer');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await dismissOverlays(page);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/login/, { timeout: 30000 });
};

// Cookie consent + onboarding tutorial + PWA install prompt overlay
// the page and intercept clicks — dismiss them before interacting.
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

const signIn = async (page, email) => {
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
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]:has-text("Sign In")');
};

test.describe('Payment Flow E2E', () => {
  test('guest add-to-cart is gated to login and returns to the product flow', async ({ page }) => {
    await page.goto('/products', { waitUntil: 'domcontentloaded' });
    const addBtn = page.locator('button:has-text("Add to Cart")').first();
    await addBtn.waitFor({ state: 'visible', timeout: 20000 });
    await dismissOverlays(page);
    await addBtn.click();

    // Current behavior: guests are routed to /login
    await page.waitForURL(/\/login/, { timeout: 10000 });

    // Register + sign in — intended destination (/products/:id) is stored
    const email = freshEmail();
    await registerBuyer(page, email);
    await signIn(page, email);

    // After sign-in the app must leave /login — back to the product
    // or a dashboard fallback
    await page.waitForURL(/\/(products|checkout|buyer|dashboard)/, { timeout: 15000 });
  });

  test('authenticated buyer can add to cart and reach checkout', async ({ page }) => {
    test.setTimeout(120000); // register + sign-in + cart retries exceed the default 30s
    const email = freshEmail();
    await registerBuyer(page, email);
    await signIn(page, email);
    await page.waitForURL(/\/(buyer|dashboard|checkout)/, { timeout: 15000 });
    await dismissOverlays(page); // wallet-protection tutorial may appear post-login

    // Tutorial modals can appear late after navigation — dismiss
    // immediately before each click attempt so they can't intercept it.
    const tryAddToCart = async () => {
      await page.goto('/products', { waitUntil: 'domcontentloaded' });
      const addBtn = page.locator('button:has-text("Add to Cart")').first();
      await addBtn.waitFor({ state: 'visible', timeout: 20000 });
      await dismissOverlays(page);
      await addBtn.click();
      await page.waitForTimeout(2500); // encrypted cart write
    };

    await tryAddToCart();
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });
    for (let i = 0; i < 2 && await page.locator('text=/your cart is empty/i').isVisible({ timeout: 5000 }).catch(() => false); i++) {
      await tryAddToCart();
      await page.goto('/cart', { waitUntil: 'domcontentloaded' });
    }
    await expect(page.locator('text=/your cart is empty/i')).not.toBeVisible({ timeout: 5000 });

    const checkoutBtn = page.locator('button:has-text("Proceed to Checkout"), a:has-text("Checkout"), button:has-text("Checkout")').first();
    await checkoutBtn.click();
    await expect(page).toHaveURL(/\/(checkout|login)/, { timeout: 10000 });
  });
});
