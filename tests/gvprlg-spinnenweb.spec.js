// @ts-check
import { test, expect } from '@playwright/test';

import { willekeurigJaar } from './e2e-data';

// Runs with the beheerder session from auth.setup.js; API calls go through page.request to carry its cookie.

// Fills one platform via the API so the UI has a finished BU to show.
async function vulPlatformIn(request, jaar, platformId) {
  const vraagIds = [
    'common-ground-standaarden', 'cloud-data', 'ai-integratie', 'digitale-weerbaarheid',
    'capaciteit-kennis', 'digitaal-vakmanschap', 'klantbetrokkenheid', 'opleiding-continuiteit',
    'dienstverlening-nps', 'release-incident', 'roadmap-transparantie', 'burgers-ondernemers-centraal',
    'prijsbeleid', 'lifecyclemanagement', 'partner-productontwikkeling', 'partner-dienstverlening',
  ];
  const response = await request.put(`/api/metingen/${jaar}/platformen/${platformId}`, {
    data: { status: 'definitief', algemeneToelichting: '', vraagScores: vraagIds.map((vraagId) => ({ vraagId, score: 4, toelichting: '' })) },
  });
  expect(response.ok()).toBeTruthy();
}

test.describe('Spinnenweb, kruimelpad en status per BU', () => {
  test('should show status per BU, the spinnenweb and a working breadcrumb', async ({ page }) => {
    const request = page.request;
    const jaar = willekeurigJaar();
    expect((await request.post('/api/metingen', { data: { jaar } })).status()).toBe(201);
    await vulPlatformIn(request, jaar, 'burgerzaken');

    await page.goto(`/metingen/${jaar}`);
    await expect(page.locator('[data-platform="burgerzaken"] .platform-status')).toHaveText('Afgerond');
    await expect(page.locator('[data-platform="belastingen"] .platform-status')).toHaveText('Nog niet ingevuld');
    await expect(page.getByRole('img', { name: new RegExp(`Spinnenweb organisatie ${jaar}`) })).toBeVisible();
    await expect(page.getByRole('img', { name: new RegExp(`Spinnenweb Burgerzaken ${jaar}`) })).toBeVisible();

    await page.goto(`/metingen/${jaar}/burgerzaken/resultaat`);
    const kruimelpad = page.getByRole('navigation', { name: 'Kruimelpad' });
    await expect(kruimelpad).toContainText('Overzicht');
    await expect(kruimelpad.locator('[aria-current="page"]')).toHaveText('Resultaat');
    await expect(page.getByRole('img', { name: new RegExp(`Spinnenweb Burgerzaken ${jaar}`) })).toBeVisible();

    await kruimelpad.getByRole('link', { name: `Meting ${jaar}` }).click();
    await expect(page).toHaveURL(new RegExp(`/metingen/${jaar}$`));
  });
});
