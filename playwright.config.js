import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
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
