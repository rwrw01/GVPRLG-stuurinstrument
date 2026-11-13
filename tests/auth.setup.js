// @ts-check
import { test as setup } from '@playwright/test';

import { login } from './auth-helpers';
import { GEBRUIKERS, SESSIE_BEHEERDER, SESSIE_INVULLER } from './e2e-data';

// One real Keycloak TOTP login per user per run; the specs reuse the app session cookie.
setup.describe.configure({ timeout: 90_000 });

setup('log in als beheerder', async ({ page }) => {
  await login(page, GEBRUIKERS.beheerder.email);
  await page.context().storageState({ path: SESSIE_BEHEERDER });
});

setup('log in als invuller', async ({ page }) => {
  await login(page, GEBRUIKERS.invuller.email);
  await page.context().storageState({ path: SESSIE_INVULLER });
});
