import { defineConfig, devices } from '@playwright/test';

// Use PORT from environment or default to 3000
const PORT = process.env['PORT'] || 3000;
const BASE_URL = process.env['E2E_BASE_URL'] || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : 4,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // Test with different viewport sizes
    {
      name: 'tablet',
      use: {
        ...devices['iPad (gen 7)'],
      },
    },

    // Accessibility testing with specific settings
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        // Force high contrast mode
        colorScheme: 'dark',
        // Test with larger fonts
        deviceScaleFactor: 1.5,
      },
    },
  ],

  // Run your local dev server before starting the tests
  ...(process.env['CI'] ? {} : {
    webServer: {
        command: 'npm run dev',
        url: BASE_URL,
        timeout: 120000,
        reuseExistingServer: !process.env['CI'],
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          PORT: String(PORT),
        },
      },
  }),
});