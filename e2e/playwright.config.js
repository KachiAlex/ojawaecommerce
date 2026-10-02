// Playwright E2E Test Configuration
import { defineConfig, devices } from '@playwright/test';

const testEmail = process.env.E2E_TEST_EMAIL || 'test@example.com';
const testPassword = process.env.E2E_TEST_PASSWORD || 'password123';

// Default: chromium + Mobile Chrome — the engines real users run.
// Firefox/WebKit/Mobile Safari destabilize under parallel workers on
// this box (Juggler crashes, hit-test stalls) — run them serially with:
//   E2E_ALL_BROWSERS=1 npx playwright test --workers=1
const allBrowsers = process.env.E2E_ALL_BROWSERS === '1';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Production targets are remote — latency spikes under parallel load
  // flake occasionally, so allow one retry even outside CI.
  retries: process.env.CI ? 2 : 1,
  workers: allBrowsers ? 1 : (process.env.CI ? 1 : undefined),
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    ...(allBrowsers ? [
      {
        name: 'firefox',
        use: { ...devices['Desktop Firefox'] },
      },
      {
        name: 'webkit',
        use: { ...devices['Desktop Safari'] },
      },
      {
        name: 'Mobile Safari',
        use: { ...devices['iPhone 12'] },
      },
    ] : []),
  ],
  webServer: process.env.PLAYWRIGHT_TEST_BASE_URL ? undefined : {
    command: `cd ../frontend && set VITE_TEST_MODE=true && set VITE_BYPASS_EMAIL_VERIFICATION=true && set VITE_E2E_TEST_EMAIL=${testEmail} && set VITE_E2E_TEST_PASSWORD=${testPassword} && npm run dev`,
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

