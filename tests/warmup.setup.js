// @ts-check
import { expect, test as setup } from '@playwright/test';

import { FASE_B_JAAR } from './e2e-data';

// `next dev` compiles a route on its first request. After a dev-server restart the first journeys
// would otherwise pay that compile time inside their own 30 s budget while four workers compete
// for the same server. This setup visits every page the journeys use once, as the beheerder, so
// each page and the API routes it calls are compiled before any journey starts.
setup.describe.configure({ timeout: 180_000 });

const PAGINAS = [
  '/',
  `/metingen/${FASE_B_JAAR}`,
  `/metingen/${FASE_B_JAAR}/belastingen`,
  `/metingen/${FASE_B_JAAR}/belastingen/resultaat`,
  '/beheer',
  '/beheer/audit',
  '/beheer/vragenlijst',
  '/beheer/businessunits',
];

setup('compileer de pagina\'s en API-routes van de journeys', async ({ page }) => {
  for (const pad of PAGINAS) {
    await page.goto(pad);
    await page.waitForLoadState('networkidle', { timeout: 60_000 });
    await expect(page.getByText('Laden...')).toHaveCount(0, { timeout: 60_000 });
  }
});
