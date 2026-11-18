// @ts-check
import { expect } from '@playwright/test';

/** @typedef {{ id: string, businessUnitIds: string[] }} LijstPlatform */
/** @typedef {'omhoog' | 'omlaag'} Richting */

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
 * Moves Informatievoorziening one place in the catalogue.
 * @param {import('@playwright/test').APIRequestContext} request - Beheerder request context
 * @param {Richting} richting - Direction
 */
async function verplaatsIv(request, richting) {
  expect((await request.post(`/api/beheer/platformen/${IV}/verplaats`, { data: { richting } })).ok()).toBe(true);
}

/**
 * Makes sure Informatievoorziening is neither the first nor the last platform with business units,
 * so the year page check proves the group stays in place. Returns a function that undoes exactly
 * the moves made and checks the original order is back; call it from afterEach.
 * @param {import('@playwright/test').APIRequestContext} request - Beheerder request context
 * @param {number} jaar - An open year (it follows the catalogue)
 * @returns {Promise<() => Promise<void>>} the restore function
 */
export async function zetIvTussenIn(request, jaar) {
  const origineel = (await platformen(request, jaar)).map((p) => p.id);
  /** @type {Richting[]} */
  const zetten = [];
  for (let stap = 0; stap < origineel.length; stap += 1) {
    const gevuld = (await platformen(request, jaar)).filter((p) => p.businessUnitIds.length > 0).map((p) => p.id);
    const plek = gevuld.indexOf(IV);
    if (plek > 0 && plek < gevuld.length - 1) break;
    const richting = plek === 0 ? 'omlaag' : 'omhoog';
    await verplaatsIv(request, richting);
    zetten.push(richting);
  }
  return async () => {
    for (const richting of [...zetten].reverse()) await verplaatsIv(request, richting === 'omhoog' ? 'omlaag' : 'omhoog');
    expect((await platformen(request, jaar)).map((p) => p.id)).toEqual(origineel);
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
