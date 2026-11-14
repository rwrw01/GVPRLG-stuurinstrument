import { defineConfig } from '@playwright/test';

const APP_URL = 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/e2e-global-setup.ts',
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
    // Real Keycloak TOTP logins (dev realm) whose sessions the backend projects reuse.
    { name: 'auth-setup', testMatch: 'auth.setup.js', use: { baseURL: APP_URL } },
    {
      name: 'backend-fase-a',
      testMatch: ['gvprlg-backend-fase-a.spec.js', 'gvprlg-spinnenweb.spec.js', 'gvprlg-overzicht.spec.js'],
      dependencies: ['auth-setup'],
      use: { baseURL: APP_URL, storageState: 'playwright/.auth/beheerder.json' },
    },
    {
      name: 'backend-fase-b',
      testMatch: 'gvprlg-fase-b-auth.spec.js',
      dependencies: ['auth-setup'],
      use: { baseURL: APP_URL },
    },
  ],
});
