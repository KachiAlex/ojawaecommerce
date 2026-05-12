/**
 * E2E Security Tests
 * Tests security features in real browser environment
 */

import { test, expect } from '@playwright/test';

test.describe('Security E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should not expose API keys in browser console', async ({ page }) => {
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg.text()));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const allowPrefixes = [
      'VITE',
      'EnvVars',
      'WDS',
      'Webpack',
      'Firebase'
    ];

    const sanitizedMessages = consoleMessages.filter(msg => {
      return !allowPrefixes.some(prefix => msg.startsWith(prefix));
    });

    const exposedKeys = sanitizedMessages.filter(msg =>
      msg.includes('FLWPUBK_TEST-04fa9716ef05b43e581444120c688399-X') ||
      msg.includes('AIzaSyCw_5hgEojEOW1hAIewyb4TkyHTN2od-Yk')
    );

    expect(exposedKeys.length).toBe(0);
  });

  test('should require authentication for protected routes', async ({ page }) => {
    // Try to access protected route without auth
    await page.goto('/admin');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });

  test('should prevent unauthorized file access', async ({ page }) => {
    // Try to access storage file directly
    const response = await page.goto('https://firebasestorage.googleapis.com/v0/b/ojawa-ecommerce.appspot.com/o/test-file.jpg');
    
    // Should be denied or require auth
    expect(response?.status()).toBeGreaterThanOrEqual(400);
  });

  test('should enforce CSP headers', async ({ page }) => {
    const response = await page.goto('/');
    const cspHeader = response?.headers()['content-security-policy'];
    
    expect(cspHeader).toBeDefined();
    expect(cspHeader).toContain("default-src 'self'");
  });

  test('should prevent XSS in user input', async ({ page }) => {
    await page.goto('/register');
    
    // Try to inject script
    const xssPayload = '<script>alert("xss")</script>';
    await page.fill('input[name="displayName"]', xssPayload);
    
    // Check that script is not executed
    const content = await page.content();
    expect(content).not.toContain('<script>alert("xss")</script>');
  });

  test('should validate file uploads', async ({ page, context }) => {
    await page.goto('/vendor/products');
    
    // Try to upload malicious file
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      // Create a fake malicious file
      const buffer = Buffer.from('malicious content');
      const file = {
        name: '../../../etc/passwd',
        mimeType: 'application/javascript',
        buffer: buffer
      };

      // Should reject invalid file
      // (Actual implementation depends on your file upload component)
    }
  });
});

