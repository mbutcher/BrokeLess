import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3001/api/v1',
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
  },
  reporter: [['list'], ['html', { open: 'never' }]],
});
