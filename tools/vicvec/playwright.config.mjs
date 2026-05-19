import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:4179',
    viewport: { width: 1440, height: 1000 },
    actionTimeout: 8_000,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node tests/static-server.mjs 4179',
    url: 'http://127.0.0.1:4179/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
});
