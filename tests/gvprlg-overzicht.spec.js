// @ts-check
import { test, expect } from '@playwright/test';

import { OVERZICHT_JAREN } from './e2e-data';

// Runs with the beheerder session from auth.setup.js. Global setup seeds OVERZICHT_JAREN; other
// specs may add random years (2050-2099) in parallel, so the assertions only rely on the seeded years.
const [EERSTE, TWEEDE] = OVERZICHT_JAREN;
const TABEL = { name: 'Gemiddelde score per platform en jaar' };

test.describe('Startscherm Overzicht en zijmenu', () => {
  test('toont de openingszin, de trend en de tabel met de geseede jaren', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Overzicht', level: 2 })).toBeVisible();
    await expect(page.locator('.openingszin')).toHaveText(/^(In \d{4} .+\.|Er zijn nog geen scores ingevuld\.)$/);

    const trend = page.getByRole('group', { name: /^Gemiddelde score per platform/ });
    await expect(trend).toBeVisible();
    await expect(trend.getByRole('img', { name: `Belastingen, ${EERSTE}: 3,0` })).toHaveCount(1);
    await expect(trend.getByRole('img', { name: `R&O, ${TWEEDE}: 2,0 (concept)` })).toHaveCount(1);

    const tabel = page.getByRole('table', TABEL);
    await expect(tabel.getByRole('columnheader', { name: String(EERSTE) })).toBeVisible();
    await expect(tabel.getByRole('columnheader', { name: String(TWEEDE) })).toBeVisible();
    await expect(tabel.getByRole('row', { name: /^Belastingen/ })).toContainText('4,0');

    // Keyboard focus on a point shows its tooltip.
    await trend.getByRole('img', { name: `Belastingen, ${TWEEDE}: 4,0` }).focus();
    await expect(trend.getByTestId('trend-tooltip')).toContainText(`Belastingen, ${TWEEDE}: 4,0`);
    await page.keyboard.press('Escape');
    await expect(trend.getByTestId('trend-tooltip')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Naar de tabel met alle jaren' })).toHaveAttribute('href', '#jaren-tabel');

    await expect(page.locator('#nieuw-jaar')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Meting aanmaken' })).toHaveCount(0);
  });

  test('het zijmenu opent een jaar en markeert het als huidig', async ({ page }) => {
    await page.goto('/');
    const hoofdmenu = page.getByRole('navigation', { name: 'Hoofdmenu' });
    await expect(hoofdmenu.getByRole('link', { name: 'Overzicht' })).toHaveAttribute('aria-current', 'page');
    const jaarLink = hoofdmenu.getByRole('link', { name: new RegExp(`^${TWEEDE}`) });
    await expect(jaarLink).toContainText('1/5');
    await expect(hoofdmenu.getByRole('link', { name: new RegExp(`^${EERSTE}`) })).toContainText('2/5');

    await jaarLink.click();
    await expect(page).toHaveURL(new RegExp(`/metingen/${TWEEDE}$`));
    await expect(jaarLink).toHaveAttribute('aria-current', 'page');
    await expect(hoofdmenu.getByRole('link', { name: 'Overzicht' })).not.toHaveAttribute('aria-current', /.+/);
    await expect(page.getByText(`de grijze stippellijn in de webben is het vorige meetjaar ${EERSTE}`)).toBeVisible();
  });

  test('Nieuwe meting staat op de beheerpagina', async ({ page }) => {
    await page.goto('/beheer');
    await expect(page.getByRole('form', { name: 'Nieuwe meting' })).toBeVisible();
    const hoofdmenu = page.getByRole('navigation', { name: 'Hoofdmenu' });
    await expect(hoofdmenu.getByRole('link', { name: 'Gebruikers' })).toHaveAttribute('aria-current', 'page');
    await expect(hoofdmenu.getByRole('link', { name: 'Nieuwe meting' })).toHaveAttribute('href', '/beheer#nieuwe-meting');
  });

  for (const breedte of [390, 768, 1024]) {
    test(`geen horizontale paginascroll op ${breedte} px`, async ({ page }) => {
      await page.setViewportSize({ width: breedte, height: 900 });
      for (const pad of ['/', `/metingen/${TWEEDE}`, '/beheer']) {
        await page.goto(pad);
        await expect(page.getByText('Laden...')).toHaveCount(0);
        const kop = pad === '/beheer' ? page.getByRole('heading', { name: 'Gebruikers' }) : page.getByRole('heading', { level: 2 }).first();
        await expect(kop).toBeVisible();
        if (pad === '/') await expect(page.getByRole('table', TABEL)).toBeVisible();
        if (pad === '/beheer') await expect(page.getByRole('table', { name: 'Gebruikers' })).toBeVisible();
        const [scroll, venster] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
        expect(scroll, `${pad} op ${breedte} px`).toBeLessThanOrEqual(venster);
      }
    });
  }

  test('de menuknop opent en sluit het menu op 390 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto('/');
    const knop = page.getByRole('button', { name: 'Menu' });
    const hoofdmenu = page.getByRole('navigation', { name: 'Hoofdmenu' });
    await expect(knop).toHaveAttribute('aria-expanded', 'false');
    await expect(hoofdmenu).toBeHidden();

    await knop.click();
    await expect(knop).toHaveAttribute('aria-expanded', 'true');
    await expect(hoofdmenu).toBeVisible();

    await knop.click();
    await expect(knop).toHaveAttribute('aria-expanded', 'false');
    await expect(hoofdmenu).toBeHidden();

    // A click on the link of the current page folds it too, as does Escape on the button itself.
    await knop.click();
    await hoofdmenu.getByRole('link', { name: 'Overzicht' }).click();
    await expect(hoofdmenu).toBeHidden();
    await knop.click();
    await knop.focus();
    await page.keyboard.press('Escape');
    await expect(knop).toHaveAttribute('aria-expanded', 'false');

    // Escape inside the menu folds it and returns focus to the button; following a link folds it too.
    await knop.click();
    await hoofdmenu.getByRole('link', { name: 'Overzicht' }).focus();
    await page.keyboard.press('Escape');
    await expect(hoofdmenu).toBeHidden();
    await expect(knop).toBeFocused();
    await knop.click();
    await hoofdmenu.getByRole('link', { name: new RegExp(`^${TWEEDE}`) }).click();
    await expect(page).toHaveURL(new RegExp(`/metingen/${TWEEDE}$`));
    await expect(hoofdmenu).toBeHidden();
  });
});
