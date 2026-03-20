// @ts-check
import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

// Clear localStorage before each test
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

// ─── HAPPY FLOW ─────────────────────────────────────────

test.describe('Happy flow', () => {

  test('should show empty home screen with localStorage warning', async ({ page }) => {
    await expect(page.locator('header h1')).toContainText('Volwassenheidsmeting');
    await expect(page.locator('.alert-warning')).toBeVisible();
    await expect(page.locator('text=Nog geen metingen')).toBeVisible();
  });

  test('should create a new meting', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      await dialog.accept('2026');
    });

    await page.click('#btn-new');
    await expect(page.locator('h2')).toContainText('Meting 2026');
    await expect(page.locator('.card h3')).toHaveCount(4);
    await expect(page.locator('.badge-leeg')).toHaveCount(4);
  });

  test('should fill in scores for a platform and save as concept', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'prompt') await dialog.accept('2026');
      else await dialog.accept();
    });
    await page.click('#btn-new');
    await page.click('.btn-invullen[data-platform="belastingen"]');

    await expect(page.locator('h2').first()).toContainText('Belastingen — Meting 2026');
    await page.fill('#invuller', 'Test Bestuurslid');

    // 12 questions (4 per as x 3 assen)
    const questions = page.locator('.question-row');
    const questionCount = await questions.count();
    expect(questionCount).toBe(12);

    for (let i = 0; i < questionCount; i++) {
      await questions.nth(i).locator('.score-option:nth-child(4) .score-btn').click();
    }

    await page.click('#btn-save');
  });

  test('should complete full happy flow: create, fill, finalize, view dashboard', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'prompt') {
        await dialog.accept('2026');
      } else {
        await dialog.accept();
      }
    });

    await page.click('#btn-new');
    await expect(page.locator('h2')).toContainText('Meting 2026');

    await page.click('.btn-invullen[data-platform="belastingen"]');
    await page.fill('#invuller', 'Jan de Vries');

    const questions = page.locator('.question-row');
    const questionCount = await questions.count();
    for (let i = 0; i < questionCount; i++) {
      await questions.nth(i).locator('.score-option:nth-child(4) .score-btn').click();
    }

    await page.click('#btn-finish');

    await expect(page.locator('h2').first()).toContainText('Belastingen — Resultaat 2026');
    await expect(page.locator('.badge-definitief')).toBeVisible();
    await expect(page.locator('canvas[id^="radar-"]')).toBeVisible();
    await expect(page.locator('text=Totaal: 4.0 / 5')).toBeVisible();

    await page.click('#btn-back');
    await expect(page.locator('.badge-definitief')).toHaveCount(1);

    await page.click('#btn-dashboard');
    await expect(page.locator('h2').first()).toContainText('Dashboard 2026');
    await expect(page.locator('table')).toHaveCount(2);
    await expect(page.locator('text=NDS-gereedheid')).toBeVisible();

    const canvasCount = await page.locator('canvas').count();
    expect(canvasCount).toBeGreaterThanOrEqual(2);
  });

  test('should export and import a platform meting', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'prompt') {
        await dialog.accept('2026');
      } else {
        await dialog.accept();
      }
    });

    await page.click('#btn-new');
    await page.click('.btn-invullen[data-platform="belastingen"]');
    await page.fill('#invuller', 'Export Test');

    const questions = page.locator('.question-row');
    const questionCount = await questions.count();
    for (let i = 0; i < questionCount; i++) {
      await questions.nth(i).locator('.score-option:nth-child(3) .score-btn').click();
    }
    await page.click('#btn-finish');
    await page.click('#btn-back');

    const downloadPromise = page.waitForEvent('download');
    await page.click('.btn-export-p[data-platform="belastingen"]');
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('volwassenheid-2026-belastingen.json');

    const downloadPath = await download.path();
    const content = readFileSync(downloadPath, 'utf-8');
    const data = JSON.parse(content);

    expect(data.metingen).toHaveLength(1);
    expect(data.metingen[0].jaar).toBe(2026);
    expect(data.metingen[0].platformen.belastingen).toBeDefined();
    expect(data.metingen[0].platformen.belastingen.status).toBe('definitief');

    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.click('#btn-new');

    const tempPath = join(process.cwd(), 'test-import.json');
    writeFileSync(tempPath, content);

    await page.click('#btn-import-p');
    const fileInput = page.locator('#file-import-p');
    await fileInput.setInputFiles(tempPath);

    await expect(page.locator('.badge-definitief')).toBeVisible({ timeout: 5000 });

    try { unlinkSync(tempPath); } catch { /* ignore */ }
  });
});

// ─── UNHAPPY FLOW ───────────────────────────────────────

test.describe('Unhappy flow', () => {

  test('should reject finalization without name', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'prompt') {
        await dialog.accept('2026');
      } else {
        expect(dialog.message()).toContain('naam');
        await dialog.accept();
      }
    });

    await page.click('#btn-new');
    await page.click('.btn-invullen[data-platform="belastingen"]');

    const questions = page.locator('.question-row');
    const questionCount = await questions.count();
    for (let i = 0; i < questionCount; i++) {
      await questions.nth(i).locator('.score-option:nth-child(4) .score-btn').click();
    }

    await page.click('#btn-finish');
    await expect(page.locator('#invuller')).toBeVisible();
  });

  test('should reject finalization with incomplete scores', async ({ page }) => {
    let alertMessage = '';
    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'prompt') {
        await dialog.accept('2026');
      } else {
        alertMessage = dialog.message();
        await dialog.accept();
      }
    });

    await page.click('#btn-new');
    await page.click('.btn-invullen[data-platform="belastingen"]');

    await page.fill('#invuller', 'Test User');
    const firstQuestion = page.locator('.question-row').first();
    await firstQuestion.locator('.score-option:nth-child(3) .score-btn').click();

    await page.click('#btn-finish');

    expect(alertMessage).toContain('Vul alle vragen in');
    await expect(page.locator('#invuller')).toBeVisible();
  });

  test('should reject invalid JSON import', async ({ page }) => {
    let alertMessage = '';
    page.on('dialog', async (dialog) => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    const tempPath = join(process.cwd(), 'test-invalid.json');
    writeFileSync(tempPath, '{ invalid json }}}');

    const fileInput = page.locator('#file-import');
    await page.click('#btn-import');
    await fileInput.setInputFiles(tempPath);

    await page.waitForTimeout(500);
    expect(alertMessage).toContain('Ongeldig');

    try { unlinkSync(tempPath); } catch { /* ignore */ }
  });

  test('should reject import with invalid scores', async ({ page }) => {
    let alertMessage = '';
    page.on('dialog', async (dialog) => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    const invalidData = {
      metingen: [{
        id: 'm-2026-test',
        jaar: 2026,
        aangemaakt: '2026-01-01T00:00:00Z',
        platformen: {
          belastingen: {
            invuller: 'Test',
            status: 'definitief',
            laatstGewijzigd: '2026-01-01T00:00:00Z',
            techniek: {
              'common-ground-standaarden': { score: 10, toelichting: '' },
            },
            mens: {},
            proces: {},
          },
        },
      }],
    };

    const tempPath = join(process.cwd(), 'test-invalid-score.json');
    writeFileSync(tempPath, JSON.stringify(invalidData));

    const fileInput = page.locator('#file-import');
    await page.click('#btn-import');
    await fileInput.setInputFiles(tempPath);

    await page.waitForTimeout(500);
    expect(alertMessage).toContain('Ongeldige score');

    try { unlinkSync(tempPath); } catch { /* ignore */ }
  });

  test('should reject import with unknown platform', async ({ page }) => {
    let alertMessage = '';
    page.on('dialog', async (dialog) => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    const invalidData = {
      metingen: [{
        id: 'm-2026-test',
        jaar: 2026,
        aangemaakt: '2026-01-01T00:00:00Z',
        platformen: {
          'onbekend-platform': {
            invuller: 'Test',
            status: 'concept',
            techniek: {},
          },
        },
      }],
    };

    const tempPath = join(process.cwd(), 'test-unknown-platform.json');
    writeFileSync(tempPath, JSON.stringify(invalidData));

    const fileInput = page.locator('#file-import');
    await page.click('#btn-import');
    await fileInput.setInputFiles(tempPath);

    await page.waitForTimeout(500);
    expect(alertMessage).toContain('Onbekend platform');

    try { unlinkSync(tempPath); } catch { /* ignore */ }
  });

  test('should prevent duplicate meting for same year', async ({ page }) => {
    let alertMessage = '';
    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'prompt') {
        await dialog.accept('2026');
      } else {
        alertMessage = dialog.message();
        await dialog.accept();
      }
    });

    await page.click('#btn-new');
    await expect(page.locator('h2')).toContainText('Meting 2026');

    await page.click('#btn-back');
    await page.click('#btn-new');

    expect(alertMessage).toContain('bestaat al');
  });
});

// ─── ACCESSIBILITY ──────────────────────────────────────

test.describe('Accessibility', () => {

  test('should have proper heading hierarchy', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText('Volwassenheidsmeting');
  });

  test('should have labels on form inputs', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      await dialog.accept('2026');
    });

    await page.click('#btn-new');
    await page.click('.btn-invullen[data-platform="belastingen"]');

    const label = page.locator('label[for="invuller"]');
    await expect(label).toBeVisible();
    await expect(label).toContainText('Naam invuller');
  });

  test('should have score buttons with sufficient touch target size', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      await dialog.accept('2026');
    });

    await page.click('#btn-new');
    await page.click('.btn-invullen[data-platform="belastingen"]');

    const scoreBtn = page.locator('.score-btn').first();
    const box = await scoreBtn.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(38);
    expect(box.height).toBeGreaterThanOrEqual(38);
  });
});
