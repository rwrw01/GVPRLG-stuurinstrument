import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  // Next.js dev compiles routes on first hit; the default 5s expect timeout is too tight for that cold start.
  expect: { timeout: 15000 },
  use: {
    browserName: 'chromium',
    headless: true,
    baseURL: 'http://localhost:3456',
  },
  webServer: {
    command: 'npx serve -l 3456 .',
    port: 3456,
    reuseExistingServer: true,
  },
  projects: [
    { name: 'static-site', testMatch: 'volwassenheidsmeting.spec.js' },
    {
      name: 'backend-fase-a',
      testMatch: 'gvprlg-backend-fase-a.spec.js',
      use: { baseURL: 'http://localhost:3000' },
    },
  ],
});
