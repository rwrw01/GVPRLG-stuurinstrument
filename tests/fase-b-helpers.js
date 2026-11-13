// @ts-check
import { expect } from '@playwright/test';

import { mailpitLaatsteLink, totpCode } from './auth-helpers';

/**
 * Opens a page in a new context without any session, regardless of the project's storageState.
 * @param {import('@playwright/test').Browser} browser - Browser fixture
 * @returns {Promise<import('@playwright/test').Page>} a page in a fresh context
 */
export async function schonePagina(browser) {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  return context.newPage();
}

/**
 * Selects the measurement year on the /beheer page and waits for the user table.
 * @param {import('@playwright/test').Page} page - Page on /beheer
 * @param {number} jaar - Year to select
 */
export async function kiesBeheerJaar(page, jaar) {
  await page.getByLabel('Meetjaar').selectOption(String(jaar));
  await expect(page.getByRole('table', { name: 'Gebruikers' })).toContainText(`Platformen ${jaar}`);
}

/**
 * Row of the /beheer user table for one e-mail address.
 * @param {import('@playwright/test').Page} page - Page on /beheer
 * @param {string} email - E-mail address in the row
 * @returns {import('@playwright/test').Locator} the table row
 */
export function gebruikerRij(page, email) {
  return page.getByRole('table', { name: 'Gebruikers' }).getByRole('row').filter({ hasText: email });
}

/**
 * Looks up one user through the admin API (requires a beheerder session).
 * @param {import('@playwright/test').APIRequestContext} request - Request context of a beheerder page
 * @param {number} jaar - Year for the platform links
 * @param {string} email - E-mail address
 * @returns {Promise<{ id: string, status: string, gekoppeld: boolean, platformIds: string[] }>} the user row
 */
export async function vindBeheerGebruiker(request, jaar, email) {
  const response = await request.get(`/api/beheer/gebruikers?jaar=${jaar}`);
  expect(response.ok()).toBeTruthy();
  const gebruiker = (await response.json()).gebruikers.find((/** @type {{ email: string }} */ g) => g.email === email);
  if (!gebruiker) throw new Error(`User ${email} not found in /api/beheer/gebruikers`);
  return gebruiker;
}

/**
 * Follows the Keycloak invitation mail and enrols an authenticator: reads the secret from the
 * manual-entry view of the QR screen and confirms it with a generated code.
 * @param {import('@playwright/test').Page} page - Page of a fresh context
 * @param {string} email - Invited user
 * @returns {Promise<string>} the base32 secret now bound to the user
 */
export async function koppelAuthenticator(page, email) {
  await page.goto(await mailpitLaatsteLink(page.request, email));
  const doorgaan = page.getByRole('link', { name: /hier|here/i });
  if (await doorgaan.isVisible()) await doorgaan.click();

  await page.locator('#mode-manual').click();
  const secret = (await page.locator('#kc-totp-secret-key').innerText()).replace(/\s+/g, '').toUpperCase();
  expect(secret).toMatch(/^[A-Z2-7]+=*$/);
  await page.locator('#totp').fill(await totpCode(email, secret));
  await page.locator('#saveTOTPBtn').click();
  await expect(page.locator('#totp')).toHaveCount(0);
  return secret;
}
