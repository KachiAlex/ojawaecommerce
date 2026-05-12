/**
 * E2E Payment Flow Tests
 */

import { test, expect } from '@playwright/test';

test.describe('Payment Flow E2E', () => {
  test('should complete full purchase flow', async ({ page }) => {
    // 1. Browse products
    await page.goto('/products');
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 });
    
    // 2. Add product to cart
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.locator('button:has-text("Add to Cart")').click();
    
    // 3. Go to cart
    await page.goto('/cart');
    await expect(page.locator('text=Cart')).toBeVisible();
    
    // 4. Proceed to checkout
    await page.click('button:has-text("Checkout")');
    await expect(page).toHaveURL(/.*checkout/);
    
    // 5. Fill shipping address
    await page.fill('input[name="address"]', '123 Test Street');
    await page.fill('input[name="city"]', 'Lagos');
    await page.fill('input[name="state"]', 'Lagos');
    
    // 6. Select payment method
    await page.click('input[value="flutterwave"]');
    
    // 7. Initiate payment (mock or test mode)
    // Note: Actual payment would require test credentials
    await page.click('button:has-text("Pay Now")');
    
    // 8. Verify order created (or payment initiated)
    // This depends on your actual flow
  });

  test('should handle payment cancellation', async ({ page }) => {
    await page.goto('/checkout');
    
    // Fill form
    await page.fill('input[name="address"]', '123 Test Street');
    
    // Cancel payment
    await page.click('button:has-text("Cancel")');
    
    // Should return to cart
    await expect(page).toHaveURL(/.*cart/);
  });
});

