import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Configuration for Web Client
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Force dark mode by default (matches app default)
    colorScheme: 'dark',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use system Chromium in Docker (Alpine Linux)
        launchOptions: {
          executablePath: process.env['CHROME_BIN'] || '/usr/bin/chromium-browser',
        },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // Use system Firefox in Docker (Alpine Linux)
        launchOptions: {
          executablePath: process.env['FIREFOX_BIN'] || '/usr/bin/firefox',
        },
      },
    },
    // Skip webkit (Safari) - not available in Alpine Linux
    // Mobile viewports using chromium
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        launchOptions: {
          executablePath: process.env['CHROME_BIN'] || '/usr/bin/chromium-browser',
        },
      },
    },
  ],

  // Run the local dev server before starting the tests
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 120 * 1000,
  },
});
