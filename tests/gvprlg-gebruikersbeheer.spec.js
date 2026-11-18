// @ts-check
import { test, expect } from '@playwright/test';

import { gebruikerRij, kiesBeheerJaar, vindBeheerGebruiker } from './fase-b-helpers';
import { FASE_B_JAAR, GEBRUIKERS, PLATFORM_INVULLER, PLATFORM_NIEUWE_GEBRUIKER, SESSIE_BEHEERDER } from './e2e-data';

/**
 * Dutch name order as the user table sorts it: case and accents ignored.
 * @param {string} a - First name
 * @param {string} b - Second name
 * @returns {number} negative, zero or positive
 */
function opNaam(a, b) {
  return a.localeCompare(b, 'nl', { sensitivity: 'base' });
}

// User administration on /beheer: sorting, the edit panel per name (role and platform links).
// The last two journeys change "wordt lezer" (invuller -> lezer -> invuller with links); tests in a
// file run in order in one worker (no fullyParallel). Global setup recreates that user every run.
test.describe('GVPRLG fase B — gebruikersbeheer', () => {
  test.describe.configure({ timeout: 120_000 });
  test.use({ storageState: SESSIE_BEHEERDER });

  test('beheerder sorteert de gebruikers op naam', async ({ page }) => {
    await page.goto('/beheer');
    await kiesBeheerJaar(page, FASE_B_JAAR);
    const tabel = page.getByRole('table', { name: 'Gebruikers' });
    const kop = tabel.getByRole('columnheader', { name: /Naam/ });
    const naamCellen = tabel.locator('td[data-label="Naam"]');
    await expect(naamCellen.first()).toBeVisible();
    const oplopend = await naamCellen.allTextContents();
    expect(oplopend.length).toBeGreaterThan(1);

    await expect(kop).toHaveAttribute('aria-sort', 'ascending');
    expect(oplopend).toEqual(oplopend.slice().sort(opNaam));
    expect(opNaam(oplopend[0], oplopend.at(-1) ?? '')).toBeLessThan(0);

    await tabel.getByRole('button', { name: 'Naam', exact: true }).click();
    await expect(kop).toHaveAttribute('aria-sort', 'descending');
    await expect(naamCellen.first()).toHaveText(oplopend.at(-1) ?? '');
    await expect(naamCellen.last()).toHaveText(oplopend[0]);
    const aflopend = await naamCellen.allTextContents();
    expect(aflopend).toEqual(aflopend.slice().sort((a, b) => opNaam(b, a)));

    await tabel.getByRole('button', { name: 'Naam', exact: true }).click();
    await expect(kop).toHaveAttribute('aria-sort', 'ascending');
    await expect(naamCellen.first()).toHaveText(oplopend[0]);
  });

  test('beheerder opent per naam één bewerkpaneel tegelijk', async ({ page }) => {
    await page.goto('/beheer');
    await kiesBeheerJaar(page, FASE_B_JAAR);
    const tabel = page.getByRole('table', { name: 'Gebruikers' });
    await expect(tabel.getByRole('button', { name: 'Koppelingen' })).toHaveCount(0);
    await expect(tabel.getByRole('button', { name: /Rol wijzigen/ })).toHaveCount(0);

    const invullerKnop = tabel.getByRole('button', { name: `Bewerk ${GEBRUIKERS.invuller.naam}`, exact: true });
    await expect(invullerKnop).toHaveAttribute('aria-expanded', 'false');
    await invullerKnop.click();
    const paneel = tabel.getByRole('group', { name: `Rol en platformen van ${GEBRUIKERS.invuller.naam}`, exact: true });
    await expect(invullerKnop).toHaveAttribute('aria-expanded', 'true');
    await expect(invullerKnop).toHaveAttribute('aria-controls', (await paneel.getAttribute('id')) ?? 'geen-id');
    await expect(paneel.getByLabel('Rol')).toBeFocused();
    await expect(paneel.getByLabel('Rol')).toHaveValue('invuller');
    await expect(paneel.getByLabel('Belastingen')).toBeChecked();

    const lezerKnop = tabel.getByRole('button', { name: `Bewerk ${GEBRUIKERS.lezer.naam}`, exact: true });
    await lezerKnop.click();
    await expect(paneel).toHaveCount(0);
    await expect(invullerKnop).toHaveAttribute('aria-expanded', 'false');
    const lezerPaneel = tabel.getByRole('group', { name: `Rol en platformen van ${GEBRUIKERS.lezer.naam}`, exact: true });
    await expect(lezerPaneel.getByLabel('Rol')).toHaveValue('lezer');
    await expect(lezerPaneel.getByRole('checkbox')).toHaveCount(0);
    await lezerPaneel.getByRole('button', { name: 'Annuleren' }).click();
    await expect(tabel.getByRole('group')).toHaveCount(0);
    await expect(lezerKnop).toBeFocused();
  });

  test('beheerder maakt iemand lezer en de koppelingen verdwijnen', async ({ page }) => {
    const doel = GEBRUIKERS.wordtLezer;
    await page.goto('/beheer');
    await kiesBeheerJaar(page, FASE_B_JAAR);
    const rij = gebruikerRij(page, doel.email);
    await expect(rij.locator('td[data-label="Rol"]')).toHaveText('invuller');
    expect((await vindBeheerGebruiker(page.request, FASE_B_JAAR, doel.email)).platformIds).toEqual([PLATFORM_INVULLER]);

    await rij.getByRole('button', { name: `Bewerk ${doel.naam}`, exact: true }).click();
    const paneel = page.getByRole('group', { name: `Rol en platformen van ${doel.naam}`, exact: true });
    // Choosing lezer asks at once. The confirm blocks until handled, so answer it from a handler
    // registered first. Declining keeps the old role and its platform choice.
    /** @type {string[]} */
    const meldingen = [];
    const bevestiging = `${doel.naam} wordt lezer. Alle platformkoppelingen in alle meetjaren worden verwijderd. Doorgaan?`;
    page.once('dialog', (dialoog) => {
      meldingen.push(dialoog.message());
      void dialoog.dismiss();
    });
    await paneel.getByLabel('Rol').selectOption('lezer');
    await expect(paneel.getByLabel('Rol')).toHaveValue('invuller');
    await expect(paneel.getByLabel('Belastingen')).toBeChecked();

    page.once('dialog', (dialoog) => {
      meldingen.push(dialoog.message());
      void dialoog.accept();
    });
    await paneel.getByLabel('Rol').selectOption('lezer');
    await expect(paneel.getByRole('checkbox')).toHaveCount(0);
    expect(meldingen).toEqual([bevestiging, bevestiging]);
    expect((await vindBeheerGebruiker(page.request, FASE_B_JAAR, doel.email)).platformIds).toEqual([PLATFORM_INVULLER]);

    // Already confirmed: saving asks no second time.
    await paneel.getByRole('button', { name: 'Opslaan' }).click();

    await expect(paneel).toHaveCount(0);
    await expect(rij.locator('td[data-label="Rol"]')).toHaveText('lezer');
    await expect(rij.locator(`td[data-label="Platformen ${FASE_B_JAAR}"]`)).toHaveText('-');
    expect((await vindBeheerGebruiker(page.request, FASE_B_JAAR, doel.email)).platformIds).toEqual([]);
    expect(meldingen).toHaveLength(2);
  });

  test('beheerder wijzigt rol en koppelingen in één keer opslaan', async ({ page }) => {
    const doel = GEBRUIKERS.wordtLezer;
    const id = (await vindBeheerGebruiker(page.request, FASE_B_JAAR, doel.email)).id;
    // Start as lezer regardless of the previous journey; the role change is idempotent.
    expect((await page.request.patch(`/api/beheer/gebruikers/${id}`, { data: { actie: 'rol', rol: 'lezer' } })).ok()).toBeTruthy();
    await page.goto('/beheer');
    await kiesBeheerJaar(page, FASE_B_JAAR);

    await gebruikerRij(page, doel.email).getByRole('button', { name: `Bewerk ${doel.naam}`, exact: true }).click();
    const paneel = page.getByRole('group', { name: `Rol en platformen van ${doel.naam}`, exact: true });
    await paneel.getByLabel('Rol').selectOption('invuller');
    await paneel.getByLabel('Belastingen').check();
    await paneel.getByLabel('Sociaal Domein').check();
    await paneel.getByRole('button', { name: 'Opslaan' }).click();
    await expect(paneel).toHaveCount(0);

    await page.reload();
    await kiesBeheerJaar(page, FASE_B_JAAR);
    const rij = gebruikerRij(page, doel.email);
    await expect(rij.locator('td[data-label="Rol"]')).toHaveText('invuller');
    await expect(rij.locator(`td[data-label="Platformen ${FASE_B_JAAR}"]`)).toHaveText('Belastingen, Sociaal Domein');
    const opgeslagen = await vindBeheerGebruiker(page.request, FASE_B_JAAR, doel.email);
    expect(opgeslagen.platformIds.slice().sort()).toEqual([PLATFORM_INVULLER, PLATFORM_NIEUWE_GEBRUIKER].sort());
  });

  test('beheerder maakt iemand beheerder met koppelingen; mislukte koppelingen worden in het paneel gemeld', async ({ page }) => {
    const doel = GEBRUIKERS.wordtLezer;
    const id = (await vindBeheerGebruiker(page.request, FASE_B_JAAR, doel.email)).id;
    const koppelingen = '**/api/beheer/gebruikers/*/koppelingen';
    const probleem = { status: 422, contentType: 'application/problem+json', body: JSON.stringify({ detail: 'Testfout bij koppelingen.' }) };
    try {
      await page.goto('/beheer');
      await kiesBeheerJaar(page, FASE_B_JAAR);
      // The PUT of the links fails; the role PATCH before it is saved for real.
      await page.route(koppelingen, (route) => (route.request().method() === 'PUT' ? route.fulfill(probleem) : route.continue()));
      await gebruikerRij(page, doel.email).getByRole('button', { name: `Bewerk ${doel.naam}`, exact: true }).click();
      const paneel = page.getByRole('group', { name: `Rol en platformen van ${doel.naam}`, exact: true });
      await paneel.getByLabel('Rol').selectOption('beheerder');
      await paneel.getByLabel('Burgerzaken').check();
      await paneel.getByRole('button', { name: 'Opslaan' }).click();

      await expect(paneel.getByRole('alert')).toHaveText('De rol is gewijzigd, maar de platformkoppelingen zijn niet opgeslagen: Testfout bij koppelingen.');
      await expect(gebruikerRij(page, doel.email).locator('td[data-label="Rol"]')).toHaveText('beheerder');
      await expect(paneel.getByRole('button', { name: 'Annuleren' })).toBeEnabled();
      expect((await vindBeheerGebruiker(page.request, FASE_B_JAAR, doel.email)).platformIds).not.toContain('burgerzaken');

      // Retry without the failure: only the links still differ, so only the PUT goes out.
      await page.unroute(koppelingen);
      await paneel.getByRole('button', { name: 'Opslaan' }).click();
      await expect(paneel).toHaveCount(0);
      expect((await vindBeheerGebruiker(page.request, FASE_B_JAAR, doel.email)).platformIds).toContain('burgerzaken');
      await expect(gebruikerRij(page, doel.email).locator(`td[data-label="Platformen ${FASE_B_JAAR}"]`)).toContainText('Burgerzaken');
    } finally {
      const terug = await page.request.patch(`/api/beheer/gebruikers/${id}`, { data: { actie: 'rol', rol: 'invuller' } });
      expect(terug.ok()).toBeTruthy();
    }
  });
});
