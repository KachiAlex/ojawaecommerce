/**
 * E2E Authentication Flow Tests
 */

import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'onyedika.akoma@gmail.com';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'dikaoliver2660';

const loginWithValidCredentials = async (page) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', TEST_EMAIL);
  await page.fill('input[name="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
};

test.describe('Authentication Flow E2E', () => {
  test.skip('should complete user registration', async ({ page }) => {
    await page.goto('/register');
    
    // Fill registration form
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
    await page.fill('input[name="displayName"]', 'Test User');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should redirect or show success
    await page.waitForTimeout(2000);
    // Verify redirect or success message
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill login form
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard or home
    await page.waitForURL(/\/(dashboard|home)/, { timeout: 10000 });
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=/invalid|incorrect|error/i')).toBeVisible({ timeout: 5000 });
  });

  test('should logout successfully', async ({ page }) => {
    // First login with known credentials
    await loginWithValidCredentials(page);

    // Then logout
    await page.click('button:has-text("Logout")');
    
    // Should redirect to home or login
    await expect(page).toHaveURL(/\/(home|login)/);
  });
});

