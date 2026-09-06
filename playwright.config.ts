import { randomBytes } from 'node:crypto';
import { defineConfig, devices } from '@playwright/test';
import { apiUrl, clientOrigin, serverOrigin } from './e2e/support/settings.js';

process.env.CLAYPOT_E2E_KEY ??= randomBytes(32).toString('hex');

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  outputDir: 'test-results',
  reporter: [
    [process.env.CI ? 'github' : 'list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: clientOrigin,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
      testMatch: /(?:authentication|discovery|mobile)\.spec\.ts/,
    },
  ],
  webServer: [
    {
      command: 'node --import tsx e2e/support/server.ts',
      url: `${serverOrigin}/__test__/ready`,
      timeout: 180_000,
      reuseExistingServer: false,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 15_000 },
      env: { CLAYPOT_E2E_KEY: process.env.CLAYPOT_E2E_KEY },
    },
    {
      command:
        'npm run dev --workspace @claypot/client -- --host 127.0.0.1 --port 4173 --strictPort',
      url: clientOrigin,
      timeout: 60_000,
      reuseExistingServer: false,
      env: { VITE_API_URL: apiUrl, BROWSER: 'none' },
    },
  ],
});
