// @ts-check
import { test, expect } from '@playwright/test';

import { login, logout, startLogin } from './auth-helpers';
import { gebruikerRij, kiesBeheerJaar, koppelAuthenticator, schonePagina, vindBeheerGebruiker } from './fase-b-helpers';
import {
  FASE_B_JAAR,
  GEBRUIKERS,
  PLATFORM_CONCEPT,
  PLATFORM_DEFINITIEF,
  PLATFORM_INVULLER,
  PLATFORM_NIEUWE_GEBRUIKER,
  SESSIE_BEHEERDER,
  SESSIE_INVULLER,
} from './e2e-data';
import { verstuurUitnodiging } from './keycloak-admin';

const MENU = { name: 'Gebruikersmenu' };
const NIET_GEKOPPELD = 'U bent niet gekoppeld aan het platform van deze businessunit voor dit meetjaar.';
const INGETROKKEN = 'Uw toegang is ingetrokken of nog niet geactiveerd.';
const NIET_GEKOPPELD_FORMULIER = 'U bent niet gekoppeld aan dit platform; u kunt deze vragenlijst alleen bekijken.';
const ALLEEN_LEZEN = 'Je hebt alleen leesrechten. Wijzigingen opslaan is niet mogelijk.';

// Journeys share dev-stack state (one invuller, one fase-B year) and may wait for a TOTP period.
// Tests in this file run in order in one worker (no fullyParallel); restores happen in finally blocks.
test.describe.configure({ timeout: 120_000 });

/**
 * Picks score 3 for the first question and clicks "Opslaan als concept".
 * @param {import('@playwright/test').Page} page - Page on the invulformulier
 */
async function slaEersteVraagOpAlsConcept(page) {
  await page.locator('.question-row').first().locator('.score-option:nth-child(3) .score-btn').click();
  await page.getByRole('button', { name: 'Opslaan als concept' }).click();
}

test.describe('GVPRLG fase B — inloggen met Keycloak (TOTP)', () => {
  test('inlogpagina is kort en verbergt de uitleg achter een vraagteken', async ({ browser }) => {
    const page = await schonePagina(browser);
    await page.goto('/inloggen');
    await expect(page.getByText('Je logt in met je e-mailadres en daarna een eenmalige code.')).toBeVisible();
    const uitleg = page.getByText('De code komt uit je authenticator-app');
    await expect(uitleg).toBeHidden();
    await page.getByRole('button', { name: 'Hoe werkt inloggen?' }).click();
    await expect(uitleg).toBeVisible();
    const contact = page.getByRole('link', { name: 'Gebruikersvereniging PinkRoccade Local Government' });
    await expect(contact).toHaveAttribute('href', 'https://gvprlg.nl/contact/');
    await expect(contact).toHaveAttribute('rel', /noopener/);
    await page.context().close();
  });

  test('toont na inloggen direct de naam van de gebruiker', async ({ page }) => {
    await login(page, GEBRUIKERS.invuller.email);
    await expect(page).toHaveURL('http://localhost:3000/');
    await expect(page.getByRole('navigation', MENU)).toContainText(GEBRUIKERS.invuller.naam);
    // No second prompt and no loop: a reload stays in the app with the same user.
    await page.reload();
    await expect(page).toHaveURL('http://localhost:3000/');
    await expect(page.getByRole('navigation', MENU)).toContainText(GEBRUIKERS.invuller.naam);
  });

  test('uitloggen vraagt bij opnieuw inloggen weer om een code', async ({ page }) => {
    await login(page, GEBRUIKERS.beheerder.email);
    await logout(page);
    expect((await page.request.get('/api/ik')).status()).toBe(401);

    await page.getByRole('button', { name: 'Inloggen', exact: true }).click();
    // The Keycloak session is gone too: no silent SSO, the username and code are asked again.
    await expect(page.locator('#username')).toBeVisible();
    await page.locator('#username').fill(GEBRUIKERS.beheerder.email);
    await page.locator('#kc-login').click();
    await expect(page.locator('#otp')).toBeVisible();
  });

  test('e-mail zonder app-gebruiker ziet Geen toegang', async ({ page }) => {
    await startLogin(page, GEBRUIKERS.zonderAppGebruiker.email);
    await expect(page).toHaveURL(/\/geen-toegang/);
    await expect(page.getByRole('heading', { name: 'Geen toegang' })).toBeVisible();
    await expect(page.getByRole('navigation', MENU)).toHaveCount(0);
    expect((await page.request.get('/api/ik')).status()).toBe(401);
  });
});

test.describe('GVPRLG fase B — invuller', () => {
  test.use({ storageState: SESSIE_INVULLER });

  test('invuller wijzigt eigen platform, ziet een ander platform alleen-lezen en krijgt daar 403', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto(`/metingen/${FASE_B_JAAR}/${PLATFORM_INVULLER}`);
    const opgeslagen = page.waitForEvent('dialog');
    await slaEersteVraagOpAlsConcept(page);
    expect((await opgeslagen).message()).toBe('Opgeslagen als concept.');
    const eigen = await (await page.request.get(`/api/metingen/${FASE_B_JAAR}/businessunits/${PLATFORM_INVULLER}`)).json();
    expect(eigen.businessUnit.status).toBe('concept');

    await page.goto(`/metingen/${FASE_B_JAAR}/informatievoorziening`);
    await expect(page.getByText(NIET_GEKOPPELD_FORMULIER)).toBeVisible();
    await expect(page.locator('.question-row').first().locator('input[type="radio"]').first()).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Opslaan als concept' })).toHaveCount(0);
    // The server check is unchanged: a direct save is still refused.
    const geweigerd = await page.request.put(`/api/metingen/${FASE_B_JAAR}/businessunits/informatievoorziening`, {
      data: { status: 'concept', algemeneToelichting: 'niet gekoppeld', vraagScores: [] },
    });
    expect(geweigerd.status()).toBe(403);
    expect((await geweigerd.json()).detail).toBe(NIET_GEKOPPELD);
    const leeg = await (await page.request.get(`/api/metingen/${FASE_B_JAAR}/businessunits/informatievoorziening`)).json();
    expect(leeg.businessUnit).toBeNull();
  });

  test('invuller ziet concepten van andere platformen', async ({ page }) => {
    await page.goto(`/metingen/${FASE_B_JAAR}`);
    await expect(page.locator(`[data-platform="${PLATFORM_CONCEPT}"] .platform-status`)).toHaveText('In bewerking');
    // "Invullen" only on the business unit of the assigned platform; elsewhere only "Bekijken".
    const eigenKaart = page.locator(`[data-businessunit="${PLATFORM_INVULLER}"]`);
    await expect(eigenKaart.getByRole('link', { name: 'Invullen' })).toBeVisible();
    const andereKaart = page.locator(`[data-businessunit="${PLATFORM_CONCEPT}"]`);
    await expect(andereKaart.getByRole('link', { name: 'Bekijken' })).toBeVisible();
    await expect(andereKaart.getByRole('link', { name: 'Invullen' })).toHaveCount(0);
    await page.goto(`/metingen/${FASE_B_JAAR}/${PLATFORM_CONCEPT}/resultaat`);
    await expect(page.locator('.badge')).toHaveText('concept');
    await expect(page.getByText('Totaal: 2,0 / 5')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Heropenen' })).toHaveCount(0);
  });
});

test.describe('GVPRLG fase B — lezer', () => {
  test('lezer ziet het invulformulier alleen-lezen en een directe PUT geeft 403', async ({ browser }) => {
    const page = await schonePagina(browser);
    try {
      await login(page, GEBRUIKERS.lezer.email);
      await page.goto(`/metingen/${FASE_B_JAAR}/${PLATFORM_CONCEPT}`);
      await expect(page.getByText(ALLEEN_LEZEN)).toBeVisible();
      // The concept seeded by the beheerder (score 2 everywhere) is visible, but nothing is editable.
      const eersteVraag = page.locator('.question-row').first();
      await expect(eersteVraag.locator('input[type="radio"][value="2"]')).toBeChecked();
      await expect(eersteVraag.locator('input[type="radio"]').first()).toBeDisabled();
      await expect(page.locator('#algemene-toelichting')).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Opslaan als concept' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /Afronden/ })).toHaveCount(0);

      const response = await page.request.put(`/api/metingen/${FASE_B_JAAR}/businessunits/${PLATFORM_CONCEPT}`, {
        data: { status: 'concept', algemeneToelichting: 'lezer', vraagScores: [] },
      });
      expect(response.status()).toBe(403);
      expect((await response.json()).detail).toContain('alleen leesrechten');

      // The start screen is for every active user, the lezer (supplier management) included.
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Overzicht', level: 2 })).toBeVisible();
      await expect(page.locator('.openingszin')).not.toBeEmpty();
      await expect(page.getByRole('table', { name: 'Gemiddelde score per businessunit en jaar' })).toBeVisible();
      const hoofdmenu = page.getByRole('navigation', { name: 'Hoofdmenu' });
      await expect(hoofdmenu.getByRole('link', { name: 'Auditlog' })).toBeVisible();
      await expect(hoofdmenu.getByRole('link', { name: 'Gebruikers' })).toHaveCount(0);
    } finally {
      await page.context().close();
    }
  });
});

test.describe('GVPRLG fase B — beheer', () => {
  test.use({ storageState: SESSIE_BEHEERDER });

  test('nieuwe gebruiker: uitnodiging via Mailpit, QR koppelen, eerste login bindt account', async ({ page, browser }) => {
    const nieuw = GEBRUIKERS.nieuweGebruiker;
    await page.goto('/beheer');
    await kiesBeheerJaar(page, FASE_B_JAAR);
    const formulier = page.getByRole('form', { name: 'Gebruiker toevoegen' });
    await formulier.getByLabel('E-mail').fill(nieuw.email);
    await formulier.getByLabel('Naam').fill(nieuw.naam);
    await formulier.getByLabel('Sociaal Domein').check();
    await formulier.getByRole('button', { name: 'Gebruiker toevoegen' }).click();
    await expect(gebruikerRij(page, nieuw.email)).toContainText('uitgenodigd');

    // The admin sends the invitation from the Keycloak console; here via the dev admin API.
    await verstuurUitnodiging(nieuw.email);
    const uitnodigingPagina = await schonePagina(browser);
    const secret = await koppelAuthenticator(uitnodigingPagina, nieuw.email);
    await uitnodigingPagina.context().close();
    // First login in a context without any Keycloak or app session: this binds the account.
    const loginPagina = await schonePagina(browser);
    await login(loginPagina, nieuw.email, secret);
    await expect(loginPagina.getByRole('navigation', MENU)).toContainText(nieuw.naam);
    await loginPagina.context().close();

    const gebonden = await vindBeheerGebruiker(page.request, FASE_B_JAAR, nieuw.email);
    expect(gebonden).toMatchObject({ status: 'actief', gekoppeld: true, platformIds: [PLATFORM_NIEUWE_GEBRUIKER] });
  });

  test('ingetrokken gebruiker wordt bij de volgende actie geweigerd', async ({ page, browser }) => {
    const invullerContext = await browser.newContext({ storageState: SESSIE_INVULLER });
    const invullerPagina = await invullerContext.newPage();
    const id = (await vindBeheerGebruiker(page.request, FASE_B_JAAR, GEBRUIKERS.invuller.email)).id;
    try {
      await invullerPagina.goto(`/metingen/${FASE_B_JAAR}/${PLATFORM_INVULLER}`);
      await expect(invullerPagina.locator('.question-row').first()).toBeVisible();

      await page.goto('/beheer');
      await kiesBeheerJaar(page, FASE_B_JAAR);
      await gebruikerRij(page, GEBRUIKERS.invuller.email).getByRole('button', { name: 'Toegang intrekken' }).click();
      await expect(gebruikerRij(page, GEBRUIKERS.invuller.email)).toContainText('ingetrokken');

      const marker = `na intrekking ${Date.now()}`;
      await invullerPagina.locator('#algemene-toelichting').fill(marker);
      await slaEersteVraagOpAlsConcept(invullerPagina);
      await expect(invullerPagina.getByRole('alert').filter({ hasText: INGETROKKEN })).toBeVisible();
      const opgeslagen = await (await page.request.get(`/api/metingen/${FASE_B_JAAR}/businessunits/${PLATFORM_INVULLER}`)).json();
      expect(opgeslagen.businessUnit?.algemeneToelichting ?? '').not.toBe(marker);

      // The revoked user's cookie is still valid: the home page must not crash but leave for /geen-toegang.
      const paginaFouten = [];
      invullerPagina.on('pageerror', (fout) => paginaFouten.push(fout.message));
      await invullerPagina.goto('/');
      await expect(invullerPagina).toHaveURL(/\/geen-toegang$/);
      await expect(invullerPagina.getByRole('heading', { name: 'Geen toegang' })).toBeVisible();
      expect(paginaFouten).toEqual([]);
    } finally {
      const hersteld = await page.request.patch(`/api/beheer/gebruikers/${id}`, { data: { actie: 'herstellen' } });
      expect(hersteld.ok()).toBeTruthy();
      await invullerContext.close();
    }
  });

  test('beheerder maakt iemand lezer en de koppelingen verdwijnen', async ({ page }) => {
    const doel = GEBRUIKERS.wordtLezer;
    await page.goto('/beheer');
    await kiesBeheerJaar(page, FASE_B_JAAR);
    const rij = gebruikerRij(page, doel.email);
    await expect(rij.locator('td[data-label="Rol"]')).toHaveText('invuller');
    expect((await vindBeheerGebruiker(page.request, FASE_B_JAAR, doel.email)).platformIds).toEqual([PLATFORM_INVULLER]);

    const knop = rij.getByRole('button', { name: /Rol wijzigen/ });
    await expect(knop).toBeDisabled();
    await rij.getByLabel(`Nieuwe rol voor ${doel.naam}`).selectOption('lezer');
    // The confirm blocks the click until handled, so accept it from a handler registered first.
    /** @type {string[]} */
    const meldingen = [];
    page.once('dialog', (dialoog) => {
      meldingen.push(dialoog.message());
      void dialoog.accept();
    });
    await knop.click();
    expect(meldingen).toEqual([`${doel.naam} wordt lezer. Alle platformkoppelingen in alle meetjaren worden verwijderd. Doorgaan?`]);

    await expect(rij.locator('td[data-label="Rol"]')).toHaveText('lezer');
    await expect(rij.locator(`td[data-label="Platformen ${FASE_B_JAAR}"]`)).toHaveText('-');
    await expect(rij.getByRole('button', { name: 'Koppelingen' })).toHaveCount(0);
    expect((await vindBeheerGebruiker(page.request, FASE_B_JAAR, doel.email)).platformIds).toEqual([]);
  });

  test('beheerder heropent een definitief platform', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto(`/metingen/${FASE_B_JAAR}/${PLATFORM_DEFINITIEF}/resultaat`);
    await expect(page.locator('.badge')).toHaveText('definitief');
    await page.getByRole('button', { name: 'Heropenen' }).click();
    await expect(page.locator('.badge')).toHaveText('concept');
    await expect(page.getByRole('button', { name: 'Heropenen' })).toHaveCount(0);

    await page.goto(`/metingen/${FASE_B_JAAR}`);
    await expect(page.locator(`[data-platform="${PLATFORM_DEFINITIEF}"] .platform-status`)).toHaveText('In bewerking');
  });
});
