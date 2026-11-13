// @ts-check
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect } from '@playwright/test';
import { TOTP } from 'otpauth';

import { DEV_TOTP_SEED } from './keycloak-admin';

const PERIODE_MS = 30_000;
const MAILPIT_URL = process.env.E2E_MAILPIT_URL ?? 'http://127.0.0.1:8025';
// Shared by all Playwright worker processes: Keycloak refuses a TOTP code that was already used
// by the same user, so every user may get at most one code per 30 s period across the whole run.
const PERIODE_BESTAND = join(tmpdir(), 'gvprlg-e2e-totp-perioden.json');

/** @returns {Record<string, number>} last used TOTP period per user */
function leesPerioden() {
  try {
    return JSON.parse(readFileSync(PERIODE_BESTAND, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Generates a TOTP code for the user, waiting for the next 30 s period when a code of the
 * current period was already handed out for this user (Keycloak rejects code re-use).
 * @param {string} email - User the code is for (key of the period guard)
 * @param {string} [secret] - Base32 secret; defaults to the dev realm seed
 * @returns {Promise<string>} a fresh 6-digit code
 */
export async function totpCode(email, secret = DEV_TOTP_SEED) {
  const vorige = leesPerioden()[email];
  let periode = Math.floor(Date.now() / PERIODE_MS);
  if (vorige !== undefined && vorige >= periode) {
    periode = vorige + 1;
    // The only fixed wait in the suite: the next TOTP period (plus a small margin).
    await new Promise((resolve) => setTimeout(resolve, periode * PERIODE_MS - Date.now() + 250));
  }
  writeFileSync(PERIODE_BESTAND, JSON.stringify({ ...leesPerioden(), [email]: periode }));
  return new TOTP({ secret, digits: 6, period: 30, algorithm: 'SHA1' }).generate({ timestamp: periode * PERIODE_MS + 1000 });
}

/**
 * Completes the Keycloak username + OTP pages the browser is currently on.
 * @param {import('@playwright/test').Page} page - Page showing the Keycloak username form
 * @param {string} email - Username
 * @param {string} [secret] - Base32 TOTP secret; defaults to the dev realm seed
 * @returns {Promise<void>}
 */
export async function vulKeycloakIn(page, email, secret) {
  await page.locator('#username').fill(email);
  await page.locator('#kc-login').click();
  await expect(page.locator('#otp')).toBeVisible();
  await page.locator('#otp').fill(await totpCode(email, secret));
  await page.locator('#kc-login').click();
}

/**
 * Starts the login from the app and completes Keycloak, without asserting where it ends.
 * @param {import('@playwright/test').Page} page - Page of a context without app session
 * @param {string} email - Username
 * @param {string} [secret] - Base32 TOTP secret; defaults to the dev realm seed
 * @returns {Promise<void>}
 */
export async function startLogin(page, email, secret) {
  await page.goto('/inloggen');
  await page.getByRole('button', { name: 'Inloggen' }).click();
  await vulKeycloakIn(page, email, secret);
}

/**
 * Logs in through the real Keycloak TOTP flow and waits until the user menu is visible.
 * @param {import('@playwright/test').Page} page - Page of a context without app session
 * @param {string} email - Username of a user that exists in the app
 * @param {string} [secret] - Base32 TOTP secret; defaults to the dev realm seed
 * @returns {Promise<void>}
 */
export async function login(page, email, secret) {
  await startLogin(page, email, secret);
  await expect(page.getByRole('navigation', { name: 'Gebruikersmenu' })).toBeVisible();
}

/**
 * Logs out via the user menu (app cookie cleared, Keycloak session ended) and waits for the
 * login page the app shows to a visitor without session.
 * @param {import('@playwright/test').Page} page - Logged-in page
 * @returns {Promise<void>}
 */
export async function logout(page) {
  await page.getByRole('navigation', { name: 'Gebruikersmenu' }).getByRole('link', { name: 'Uitloggen' }).click();
  await expect(page).toHaveURL(/\/inloggen/);
}

/**
 * Returns the first link in the newest Mailpit message to the given address, polling until it arrives.
 * @param {import('@playwright/test').APIRequestContext} request - Request context (any)
 * @param {string} aan - Recipient address
 * @returns {Promise<string>} the link (e.g. the Keycloak action-token URL)
 */
export async function mailpitLaatsteLink(request, aan) {
  /** @type {string | undefined} */
  let id;
  await expect.poll(async () => {
    const response = await request.get(`${MAILPIT_URL}/api/v1/search`, { params: { query: `to:${aan}` } });
    id = (await response.json()).messages?.[0]?.ID;
    return id;
  }, { message: `wait for a mail to ${aan}` }).toBeTruthy();
  const bericht = await (await request.get(`${MAILPIT_URL}/api/v1/message/${id}`)).json();
  const link = /https?:\/\/[^\s"<>]+/.exec(bericht.Text)?.[0];
  if (!link) throw new Error(`No link in mail ${id} to ${aan}`);
  return link;
}
