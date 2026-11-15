// @ts-check
import { test, expect } from '@playwright/test';

import { login } from './auth-helpers';
import { GEBRUIKERS, SESSIE_INVULLER, willekeurigJaar } from './e2e-data';
import { schonePagina } from './fase-b-helpers';

// The catalogue is shared by every open year, so these journeys run in their own Playwright
// project after all other projects, one at a time. They only act on items they create themselves
// (names start with "E2E "); global setup hard-deletes those on the next run, which frees their
// colours again. Every journey removes what it added before it ends.
test.describe.configure({ mode: 'serial', timeout: 120_000 });

test.beforeEach(async ({ page }) => {
  page.on('dialog', (dialog) => void dialog.accept());
});

/**
 * Reads the catalogue through the API.
 * @param {import('@playwright/test').APIRequestContext} request - Request context with a session
 * @returns {Promise<any>} the catalogue body
 */
async function catalogus(request) {
  const response = await request.get('/api/beheer/catalogus');
  expect(response.ok()).toBe(true);
  return response.json();
}

/**
 * Finds a question by short label in the catalogue.
 * @param {import('@playwright/test').APIRequestContext} request - Request context
 * @param {string} kort - Short label
 * @returns {Promise<any>} the question
 */
async function vraagMet(request, kort) {
  return (await catalogus(request)).assen.flatMap((/** @type {any} */ a) => a.vragen).find((/** @type {any} */ v) => v.kort === kort);
}

/**
 * Creates a meting and optionally freezes it with a concept for R&O.
 * @param {import('@playwright/test').APIRequestContext} request - Beheerder request context
 * @param {{ vastleggen?: boolean, aanwezigen?: string, scores?: Array<{ vraagId: string, score: number }> }} [opties]
 * @returns {Promise<number>} the year
 */
async function maakJaar(request, opties = {}) {
  const jaar = willekeurigJaar();
  expect((await request.post('/api/metingen', { data: { jaar } })).status()).toBe(201);
  if (opties.vastleggen) {
    const vraagScores = (opties.scores ?? []).map((s) => ({ ...s, toelichting: '' }));
    const response = await request.put(`/api/metingen/${jaar}/businessunits/ro`, { data: { status: 'concept', aanwezigen: opties.aanwezigen ?? '', vraagScores } });
    expect(response.ok()).toBe(true);
  }
  return jaar;
}

/**
 * The short labels of the active questions in table order.
 * @param {import('@playwright/test').Page} page - Page on /beheer/vragenlijst
 * @returns {Promise<string[]>} the labels
 */
async function vraagVolgorde(page) {
  return page.locator('tr[data-vraag] td:first-child').allTextContents();
}

test('beheerder voegt een vraag toe, wijzigt, verplaatst, verwijdert en herstelt haar', async ({ page }) => {
  await page.goto('/beheer/vragenlijst');
  await page.getByRole('button', { name: 'Vraag toevoegen aan Mens' }).click();
  const formulier = page.getByRole('form', { name: 'Vraag toevoegen' });
  await formulier.getByLabel('Kort label').fill('E2E Vraag');
  await formulier.getByLabel('Vraagtekst').fill('E2E Er is een vraag toegevoegd.');
  await formulier.getByRole('button', { name: 'Vraag toevoegen' }).click();
  const rij = page.locator('tr[data-vraag]', { hasText: 'E2E Vraag' });
  await expect(rij).toContainText('E2E Er is een vraag toegevoegd.');
  const volgorde = await vraagVolgorde(page);
  expect(volgorde.indexOf('E2E Vraag')).toBe(volgorde.indexOf('Opleiding & borging') + 1);

  await page.getByRole('button', { name: 'Omhoog: E2E Vraag' }).click();
  await expect.poll(async () => (await vraagVolgorde(page)).indexOf('E2E Vraag')).toBe(volgorde.indexOf('Opleiding & borging'));

  await page.getByRole('button', { name: 'Wijzigen: E2E Vraag' }).click();
  const wijzig = page.getByRole('form', { name: 'Vraag wijzigen: E2E Vraag' });
  await wijzig.getByLabel('Kort label').fill('E2E Vraag met een veel te lang label');
  await expect(wijzig.getByLabel('Kort label')).toHaveValue('E2E Vraag met een veel'); // maxLength 22
  await wijzig.getByLabel('Kort label').fill('E2E Vraag');
  await wijzig.getByLabel('Vraagtekst').fill('E2E De vraag is gewijzigd.');
  await wijzig.getByLabel('NDS-thema').selectOption('Open');
  await wijzig.getByRole('button', { name: 'Wijziging opslaan' }).click();
  await expect(rij).toContainText('E2E De vraag is gewijzigd.');
  await expect(rij).toContainText('Open');

  await page.getByRole('button', { name: 'Verwijderen: E2E Vraag' }).click();
  await expect(rij).toHaveCount(0);
  await page.getByText(/Verwijderde assen en vragen/).click();
  await page.getByRole('button', { name: 'Weer actief maken: E2E Vraag' }).click();
  await expect(rij).toHaveCount(1);
  await page.getByRole('button', { name: 'Verwijderen: E2E Vraag' }).click();
  await expect(rij).toHaveCount(0);
});

test('beheerder voegt een as toe, verplaatst, hernoemt, verwijdert en herstelt haar; een as met vragen kan niet weg', async ({ page }) => {
  await page.goto('/beheer/vragenlijst');
  await page.getByRole('button', { name: 'Verwijderen: as Mens' }).click();
  await expect(page.locator('.alert-warning')).toContainText('De as Mens heeft nog actieve vragen.');

  await page.getByRole('button', { name: 'As toevoegen' }).click();
  await page.getByRole('form', { name: 'As toevoegen' }).getByLabel('Naam van de as').fill('E2E As');
  await page.getByRole('form', { name: 'As toevoegen' }).getByRole('button', { name: 'As toevoegen' }).click();
  const kop = page.locator('tr.groep-kop', { hasText: 'As E2E As' });
  await expect(kop).toBeVisible();
  await page.getByRole('button', { name: 'Omhoog: as E2E As' }).click();
  await expect.poll(async () => (await page.locator('tr.groep-kop th').allTextContents()).map((t) => t.split(' (')[0]))
    .toEqual(['As Techniek', 'As Mens', 'As E2E As', 'As Proces']);

  await page.getByRole('button', { name: 'Wijzigen: as E2E As' }).click();
  await page.getByRole('form', { name: 'As wijzigen: E2E As' }).getByLabel('Naam van de as').fill('E2E As hernoemd');
  await page.getByRole('button', { name: 'Wijziging opslaan' }).click();
  const hernoemd = page.locator('tr.groep-kop', { hasText: 'As E2E As hernoemd' });
  await expect(hernoemd).toBeVisible();

  await page.getByRole('button', { name: 'Verwijderen: as E2E As hernoemd' }).click();
  await expect(hernoemd).toHaveCount(0);
  await page.getByText(/Verwijderde assen en vragen/).click();
  await page.getByRole('button', { name: 'Weer actief maken: as E2E As hernoemd' }).click();
  await expect(hernoemd).toBeVisible();
  await page.getByRole('button', { name: 'Verwijderen: as E2E As hernoemd' }).click();
  await expect(hernoemd).toHaveCount(0);
});

test('een tweede businessunit onder één platform: dezelfde invuller vult beide in, de nieuwe begint kaal en aanwezigen wordt bewaard', async ({ page, browser }) => {
  const jaar = await maakJaar(page.request);
  await page.goto('/beheer/businessunits');
  await page.getByRole('button', { name: 'Businessunit toevoegen aan Informatievoorziening' }).click();
  const formulier = page.getByRole('form', { name: 'Businessunit toevoegen' });
  await formulier.getByLabel('Naam van de businessunit').fill('E2E IV twee');
  await formulier.getByRole('button', { name: 'Businessunit toevoegen' }).click();
  const rij = page.locator('tr[data-businessunit]', { hasText: 'E2E IV twee' });
  await expect(rij).toBeVisible();
  await page.getByRole('button', { name: 'Omhoog: E2E IV twee' }).click();
  await expect.poll(async () => {
    const namen = await page.locator('tr[data-businessunit] td:first-child').allTextContents();
    return namen.indexOf('Informatievoorziening') - namen.indexOf('E2E IV twee');
  }).toBe(1);
  const unit = (await catalogus(page.request)).platformen.flatMap((/** @type {any} */ p) => p.businessUnits).find((/** @type {any} */ b) => b.naam === 'E2E IV twee');

  // Link the invuller to the platform Informatievoorziening for this year.
  const gebruikers = await (await page.request.get(`/api/beheer/gebruikers?jaar=${jaar}`)).json();
  const invuller = gebruikers.gebruikers.find((/** @type {any} */ g) => g.email === GEBRUIKERS.invuller.email);
  expect((await page.request.put(`/api/beheer/gebruikers/${invuller.id}/koppelingen`, { data: { jaar, platformIds: ['informatievoorziening'] } })).ok()).toBe(true);

  const context = await browser.newContext({ storageState: SESSIE_INVULLER });
  const ip = await context.newPage();
  ip.on('dialog', (dialog) => void dialog.accept());
  try {
    await ip.goto(`/metingen/${jaar}/${unit.id}/resultaat`);
    await expect(ip.getByText('Deze businessunit is nog niet ingevuld.')).toBeVisible();
    for (const id of [unit.id, 'informatievoorziening']) {
      await ip.goto(`/metingen/${jaar}/${id}`);
      const eerste = ip.locator('.question-row').first();
      await expect(eerste.locator('input[type="radio"]:checked')).toHaveCount(0);
      await eerste.locator('.score-option:nth-child(4) .score-btn').click();
      await ip.locator('#aanwezigen').fill(`E2E Jan en Piet bij ${id}`);
      const opslaan = ip.waitForResponse((r) => r.url().includes(`/businessunits/${id}`) && r.request().method() === 'PUT');
      await ip.getByRole('button', { name: 'Opslaan als concept' }).click();
      expect((await opslaan).status()).toBe(200);
    }
    await ip.goto(`/metingen/${jaar}/${unit.id}/resultaat`);
    await expect(ip.getByRole('heading', { name: `E2E IV twee — Resultaat ${jaar}` })).toBeVisible();
    await expect(ip.locator('.aanwezigen')).toHaveText(`E2E Jan en Piet bij ${unit.id}`);
    await ip.goto(`/metingen/${jaar}`);
    await expect(ip.getByRole('heading', { name: 'Platform Informatievoorziening' })).toBeVisible();
    await expect(ip.locator(`[data-businessunit="${unit.id}"] .platform-status`)).toHaveText('In bewerking');
  } finally {
    await context.close();
  }

  // Rename and let lapse: the frozen year keeps the unit, the catalogue drops it from open years.
  await page.getByRole('button', { name: 'Wijzigen: E2E IV twee' }).click();
  await page.getByRole('form', { name: 'Businessunit wijzigen: E2E IV twee' }).getByLabel('Naam van de businessunit').fill('E2E IV twee hernoemd');
  await page.getByRole('button', { name: 'Wijziging opslaan' }).click();
  const unitRij = page.locator('tr[data-businessunit]', { hasText: 'E2E IV twee hernoemd' });
  await page.getByRole('button', { name: 'Laten vervallen: E2E IV twee hernoemd' }).click();
  await expect(unitRij).toHaveCount(0);
  await page.getByText(/Vervallen platformen en businessunits/).click();
  await page.getByRole('button', { name: 'Weer actief maken: E2E IV twee hernoemd' }).click();
  await expect(unitRij).toBeVisible();
  await page.getByRole('button', { name: 'Laten vervallen: E2E IV twee hernoemd' }).click();
  await expect(unitRij).toHaveCount(0);
  await page.goto(`/metingen/${jaar}/${unit.id}/resultaat`);
  await expect(page.getByRole('heading', { name: `E2E IV twee — Resultaat ${jaar}` })).toBeVisible();
  const open = await maakJaar(page.request);
  const lijst = await (await page.request.get(`/api/metingen/${open}/vragenlijst`)).json();
  expect(lijst.vragenlijst.businessUnits.map((/** @type {any} */ b) => b.id)).not.toContain(unit.id);
});

test('beheerder voegt een platform toe, hernoemt, laat het vervallen en maakt het weer actief', async ({ page }) => {
  await page.goto('/beheer/businessunits');
  await page.getByRole('button', { name: 'Laten vervallen: platform R&O' }).click();
  await expect(page.locator('.alert-warning')).toContainText('Het platform R&O heeft nog actieve businessunits.');

  await page.getByRole('button', { name: 'Platform toevoegen' }).click();
  await page.getByRole('form', { name: 'Platform toevoegen' }).getByLabel('Naam van het platform').fill('E2E Platform');
  await page.getByRole('form', { name: 'Platform toevoegen' }).getByRole('button', { name: 'Platform toevoegen' }).click();
  await expect(page.locator('tr.groep-kop', { hasText: 'Platform E2E Platform' })).toBeVisible();
  await page.getByRole('button', { name: 'Omhoog: platform E2E Platform' }).click();
  await expect.poll(async () => (await page.locator('tr.groep-kop th').allTextContents()).at(-2)).toContain('E2E Platform');
  await page.getByRole('button', { name: 'Wijzigen: platform E2E Platform' }).click();
  await page.getByRole('form', { name: 'Platform wijzigen: E2E Platform' }).getByLabel('Naam van het platform').fill('E2E Platform hernoemd');
  await page.getByRole('button', { name: 'Wijziging opslaan' }).click();
  const kop = page.locator('tr.groep-kop', { hasText: 'Platform E2E Platform hernoemd' });
  await expect(kop).toBeVisible();
  const bevestiging = page.waitForEvent('dialog');
  await page.getByRole('button', { name: 'Laten vervallen: platform E2E Platform hernoemd' }).click();
  expect((await bevestiging).message()).toContain('De koppelingen van invullers aan dit platform in de open meetjaren');
  await expect(kop).toHaveCount(0);
  await page.getByText(/Vervallen platformen en businessunits/).click();
  await page.getByRole('button', { name: 'Weer actief maken: platform E2E Platform hernoemd' }).click();
  await expect(kop).toBeVisible();
  await page.getByRole('button', { name: 'Laten vervallen: platform E2E Platform hernoemd' }).click();
  await expect(kop).toHaveCount(0);
});

test('een wijziging geldt voor open jaren en nooit voor een vastgelegd jaar; een leeg vastgelegd jaar kan weer open', async ({ page }) => {
  // A question of our own, frozen into one year with a score, then changed.
  expect((await page.request.post('/api/beheer/vragen', { data: { asId: 'mens', kort: 'E2E Vast', tekst: 'E2E Tekst van toen.' } })).status()).toBe(201);
  const vraag = await vraagMet(page.request, 'E2E Vast');
  const vast = await maakJaar(page.request, { vastleggen: true, aanwezigen: 'E2E aanwezig', scores: [{ vraagId: vraag.id, score: 2 }, { vraagId: 'cloud-data', score: 4 }] });
  const leeg = await maakJaar(page.request, { vastleggen: true });
  await page.goto(`/metingen/${vast}/ro/resultaat`);
  const totaal = await page.locator('.totaalscore').textContent();

  await page.goto('/beheer/vragenlijst');
  await expect(page.getByRole('note', { name: 'Meetjaren' })).toContainText(String(vast));
  await page.getByRole('button', { name: 'Wijzigen: E2E Vast' }).click();
  await page.getByRole('form', { name: 'Vraag wijzigen: E2E Vast' }).getByLabel('Vraagtekst').fill('E2E Tekst van nu.');
  await page.getByRole('button', { name: 'Wijziging opslaan' }).click();
  await expect(page.locator('tr[data-vraag]', { hasText: 'E2E Tekst van nu.' })).toBeVisible();
  // Wait for the removal to land before navigating: a page.goto right after the click aborts the
  // PATCH in the browser (net::ERR_ABORTED), and then the question may stay active.
  const verwijderd = page.waitForResponse((r) => r.url().endsWith(`/api/beheer/vragen/${vraag.id}`) && r.request().method() === 'PATCH');
  await page.getByRole('button', { name: 'Verwijderen: E2E Vast' }).click();
  expect((await verwijderd).status()).toBe(200);
  await expect(page.locator('tr[data-vraag]', { hasText: 'E2E Vast' })).toHaveCount(0);
  expect((await vraagMet(page.request, 'E2E Vast')).vervallen).toBe(true);

  await page.goto(`/metingen/${vast}/ro`);
  await expect(page.getByText('E2E Tekst van toen.')).toBeVisible();
  await page.goto(`/metingen/${vast}/ro/resultaat`);
  await expect(page.locator('.totaalscore')).toHaveText(totaal ?? '');
  await expect(page.locator('.aanwezigen')).toHaveText('E2E aanwezig');
  const open = await maakJaar(page.request);
  await page.goto(`/metingen/${open}/ro`);
  await expect(page.locator('.question-row').first()).toBeVisible();
  await expect(page.getByText(/E2E Tekst van/)).toHaveCount(0);

  await page.goto('/beheer/vragenlijst');
  await page.getByRole('button', { name: `Vragenlijst ${leeg} weer openzetten` }).click();
  await expect(page.getByRole('note', { name: 'Meetjaren' })).toContainText(new RegExp(`open meetjaren: [^.]*${leeg}`));
  await expect(page.getByRole('button', { name: `Vragenlijst ${vast} weer openzetten` })).toHaveCount(0);
});

test('een lezer ziet de vragenlijst en aanwezigen, maar kan niets wijzigen', async ({ browser, page }) => {
  const jaar = await maakJaar(page.request, { vastleggen: true, aanwezigen: 'E2E Lezer ziet dit' });
  const lezer = await schonePagina(browser);
  try {
    await login(lezer, GEBRUIKERS.lezer.email);
    await lezer.goto('/beheer/vragenlijst');
    await expect(lezer.locator('tr[data-vraag]', { hasText: 'Cloud & data' })).toBeVisible();
    await expect(lezer.getByRole('button', { name: /^Wijzigen:/ })).toHaveCount(0);
    await expect(lezer.getByRole('button', { name: 'As toevoegen' })).toHaveCount(0);
    await lezer.goto(`/metingen/${jaar}/ro`);
    await expect(lezer.locator('#aanwezigen')).toHaveValue('E2E Lezer ziet dit');
    await expect(lezer.locator('#aanwezigen')).toBeDisabled();
    const poging = await lezer.request.post('/api/beheer/vragen', { data: { asId: 'mens', kort: 'E2E Lezer', tekst: 'E2E mag niet' } });
    expect(poging.status()).toBe(403);
  } finally {
    await lezer.context().close();
  }
});
