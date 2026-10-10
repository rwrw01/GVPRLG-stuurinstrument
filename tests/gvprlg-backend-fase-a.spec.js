// @ts-check
import { test, expect } from '@playwright/test';

test.describe('GVPRLG backend fase A — happy flow', () => {
  test('maakt een meting aan, vult een platform in met opmerkingen, rondt af, toont resultaat', async ({ page, request }) => {
    const jaar = 2020 + Math.floor(Math.random() * 80); // uniek per testrun, binnen het door CreateMetingSchema toegestane bereik (2020-2100)

    await page.goto('/');
    await page.fill('#nieuw-jaar', String(jaar));
    await page.click('text=Meting aanmaken');
    await expect(page.locator(`text=Meting ${jaar}`)).toBeVisible();

    await page.click(`a[href="/metingen/${jaar}"]`);
    await page.click(`a[href="/metingen/${jaar}/belastingen"]`);
    await expect(page.locator('h2').first()).toContainText(`Belastingen — Meting ${jaar}`);

    const questions = page.locator('.question-row');
    const count = await questions.count();
    expect(count).toBe(16); // 4 techniek + 4 mens + 8 proces

    for (let i = 0; i < count; i++) {
      await questions.nth(i).locator('.score-option:nth-child(3) .score-btn').click();
    }
    await questions.first().locator('textarea').fill('onderbouwing van de score');
    // De algemene toelichting is het enige vrije-tekstveld dat op de resultaatpagina als
    // HTML-tekst wordt teruggerenderd (per-vraag-opmerkingen komen alleen terug in een
    // <textarea>-waarde, dat is inherent veilig). Dit veld is dus de juiste plek om de
    // XSS-aanname uit Review Focus-punt 5 te verifiëren.
    await page.fill('#algemene-toelichting', '<script>window.__xss = true;</script>algemene opmerking');

    await page.click('text=Afronden (definitief)');
    await expect(page).toHaveURL(new RegExp(`/metingen/${jaar}/belastingen/resultaat$`));
    await expect(page.locator('text=3.0').first()).toBeVisible();
    await expect(page.locator('text=algemene opmerking')).toBeVisible();

    const xssTriggered = await page.evaluate(() => window.__xss);
    expect(xssTriggered).toBeUndefined();

    const apiResponse = await request.get(`/api/metingen/${jaar}/platformen/belastingen`);
    const body = await apiResponse.json();
    expect(body.platform.status).toBe('definitief');
  });

  test('weigert afronden met ontbrekende scores', async ({ page }) => {
    const jaar = 2020 + Math.floor(Math.random() * 80);
    await page.goto('/');
    await page.fill('#nieuw-jaar', String(jaar));
    await page.click('text=Meting aanmaken');
    await page.click(`a[href="/metingen/${jaar}"]`);
    await page.click(`a[href="/metingen/${jaar}/belastingen"]`);

    const firstQuestion = page.locator('.question-row').first();
    await firstQuestion.locator('.score-option:nth-child(3) .score-btn').click();
    await page.click('text=Afronden (definitief)');

    await expect(page.locator('.alert-warning')).toContainText('Vul alle vragen in');
  });
});
