const { defineConfig, devices } = require('@playwright/test');

const testEmail = process.env.E2E_TEST_EMAIL || 'onyedika.akoma@gmail.com';
const testPassword = process.env.E2E_TEST_PASSWORD || 'dikaoliver2660';

module.exports = defineConfig({
  testDir: '.',
  testMatch: /axe-core\.test\.js/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'test-results/accessibility-html' }],
    ['json', { outputFile: 'test-results/accessibility-results.json' }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `cd ../apps/buyer && set VITE_TEST_MODE=true && set VITE_BYPASS_EMAIL_VERIFICATION=true && set VITE_E2E_TEST_EMAIL=${testEmail} && set VITE_E2E_TEST_PASSWORD=${testPassword} && npm run dev`,
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
