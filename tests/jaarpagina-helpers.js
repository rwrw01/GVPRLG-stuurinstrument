// @ts-check
import { expect } from '@playwright/test';

/** @typedef {{ id: string, businessUnitIds: string[] }} LijstPlatform */
/** @typedef {'omhoog' | 'omlaag'} Richting */
/** @typedef {{ id: string, volgorde: number, vervallen: boolean, businessUnits: Array<{ vervallen: boolean }> }} CatalogusPlatform */

const IV = 'informatievoorziening';

/**
 * Reads the platforms of a year in their configured order.
 * @param {import('@playwright/test').APIRequestContext} request - Request context with a session
 * @param {number} jaar - The year
 * @returns {Promise<LijstPlatform[]>} the platforms
 */
async function platformen(request, jaar) {
  const response = await request.get(`/api/metingen/${jaar}/vragenlijst`);
  expect(response.ok()).toBe(true);
  const body = /** @type {{ vragenlijst: { platformen: LijstPlatform[] } }} */ (await response.json());
  return body.vragenlijst.platformen;
}

/**
 * The active platforms of the catalogue in their order. Read from the catalogue, never from a year:
 * a year freezes its own copy as soon as a business unit row is saved.
 * @param {import('@playwright/test').APIRequestContext} request - Beheerder request context
 * @returns {Promise<Array<{ id: string, gevuld: boolean }>>} id and whether it has active units
 */
async function catalogusPlatformen(request) {
  const response = await request.get('/api/beheer/catalogus');
  expect(response.ok()).toBe(true);
  const body = /** @type {{ platformen: CatalogusPlatform[] }} */ (await response.json());
  return body.platformen.filter((p) => !p.vervallen).sort((a, b) => a.volgorde - b.volgorde)
    .map((p) => ({ id: p.id, gevuld: p.businessUnits.some((b) => !b.vervallen) }));
}

/**
 * Moves a platform one place among the active platforms of the catalogue.
 * @param {import('@playwright/test').APIRequestContext} request - Beheerder request context
 * @param {string} id - Platform id
 * @param {Richting} richting - Direction
 */
async function verplaats(request, id, richting) {
  expect((await request.post(`/api/beheer/platformen/${id}/verplaats`, { data: { richting } })).ok()).toBe(true);
}

/**
 * Puts the active platforms back in a recorded order: each step moves the first misplaced platform
 * one place up, then rereads the catalogue. Platforms added since are left where they end up.
 * @param {import('@playwright/test').APIRequestContext} request - Beheerder request context
 * @param {string[]} doel - Recorded order of platform ids
 */
async function herstelVolgorde(request, doel) {
  for (let stap = 0; stap < 100; stap += 1) {
    const huidig = (await catalogusPlatformen(request)).map((p) => p.id).filter((id) => doel.includes(id));
    const fout = doel.filter((id) => huidig.includes(id)).findIndex((id, k) => huidig[k] !== id);
    if (fout === -1) return;
    await verplaats(request, doel.filter((id) => huidig.includes(id))[fout] ?? '', 'omhoog');
  }
  throw new Error('Platform order could not be restored in 100 moves.');
}

/**
 * Makes sure Informatievoorziening is neither the first nor the last platform with business units,
 * so the year page check proves the group stays in place. Records the catalogue order first and
 * returns a function that puts exactly that order back and checks it; call it from afterEach.
 * @param {import('@playwright/test').APIRequestContext} request - Beheerder request context
 * @returns {Promise<() => Promise<void>>} the restore function
 */
export async function zetIvTussenIn(request) {
  const origineel = (await catalogusPlatformen(request)).map((p) => p.id);
  for (let stap = 0; stap < origineel.length; stap += 1) {
    const gevuld = (await catalogusPlatformen(request)).filter((p) => p.gevuld).map((p) => p.id);
    const plek = gevuld.indexOf(IV);
    if (plek > 0 && plek < gevuld.length - 1) break;
    await verplaats(request, IV, plek === 0 ? 'omlaag' : 'omhoog');
  }
  return async () => {
    await herstelVolgorde(request, origineel);
    const nu = (await catalogusPlatformen(request)).map((p) => p.id).filter((id) => origineel.includes(id));
    expect(nu).toEqual(origineel.filter((id) => nu.includes(id)));
  };
}

/**
 * Checks on the year page that Informatievoorziening, now with two business units, stays at its
 * place in the platform order as a framed group with its name as heading and both cards inside.
 * @param {import('@playwright/test').Page} page - Page on /metingen/{jaar}
 * @param {number} jaar - The year
 * @param {string[]} unitIds - The business units of the group in their order
 */
export async function verwachtGroepOpPlaats(page, jaar, unitIds) {
  const groep = page.getByRole('region', { name: 'Informatievoorziening', exact: true });
  await expect(groep.getByRole('heading', { name: 'Informatievoorziening', level: 3, exact: true })).toBeVisible();
  await expect(groep.locator('[data-businessunit]')).toHaveCount(2);
  expect(await groep.locator('[data-businessunit]').evaluateAll((els) => els.map((e) => e.getAttribute('data-businessunit')))).toEqual(unitIds);
  const verwacht = (await platformen(page.request, jaar)).filter((p) => p.businessUnitIds.length > 0)
    .map((p) => (p.businessUnitIds.length > 1 ? `groep:${p.id}` : p.businessUnitIds[0]));
  const blokken = await page.locator('.unit-kaarten > *').evaluateAll((els) => els.map((e) => {
    const groepId = e.getAttribute('data-platform-groep');
    return groepId ? `groep:${groepId}` : e.getAttribute('data-businessunit');
  }));
  expect(blokken).toEqual(verwacht);
  const plek = blokken.indexOf(`groep:${IV}`);
  expect(plek).toBeGreaterThan(0);
  expect(plek).toBeLessThan(blokken.length - 1);
}
