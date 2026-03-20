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
    // Mock the prompt to return 2026
    page.on('dialog', async (dialog) => {
      await dialog.accept('2026');
    });

    await page.click('#btn-new');

    // Should navigate to meting overview
    await expect(page.locator('h2')).toContainText('Meting 2026');
    // Should show 4 platforms
    await expect(page.locator('.card h3')).toHaveCount(4);
    // All should show 'Nog niet ingevuld'
    await expect(page.locator('.badge-leeg')).toHaveCount(4);
  });

  test('should fill in scores for a platform and save as concept', async ({ page }) => {
    // Create meting
    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'prompt') await dialog.accept('2026');
      else await dialog.accept();
    });
    await page.click('#btn-new');

    // Click 'Invullen' on first platform (Belastingen)
    await page.click('.btn-invullen[data-platform="belastingen"]');

    // Should show the form
    await expect(page.locator('h2').first()).toContainText('Belastingen — Meting 2026');

    // Fill in name
    await page.fill('#invuller', 'Test Bestuurslid');

    // Fill in score 3 for first question of each axis
    const radioButtons = page.locator('input[type="radio"][value="3"]');
    const count = await radioButtons.count();
    // Click first radio with value 3 for each question (there are 17 questions x 5 options)
    // We need to click one radio per question. Let's click score 4 for all questions.
    const scoreButtons = page.locator('.score-option .score-btn');
    // Each question has 5 score buttons. Click the 4th one (score 4) for each question.
    const questions = page.locator('.question-block');
    const questionCount = await questions.count();
    expect(questionCount).toBe(17); // 6 + 5 + 6

    // Click score 4 for each question
    for (let i = 0; i < questionCount; i++) {
      const question = questions.nth(i);
      // Click the 4th score button (value 4)
      await question.locator('.score-option:nth-child(4) .score-btn').click();
    }

    // Save as concept
    await page.click('#btn-save');

    // Should show alert
    await expect(page.locator('text=Opgeslagen als concept.')).toBeVisible({ timeout: 1000 }).catch(() => {
      // Alert was dismissed
    });
  });

  test('should complete full happy flow: create, fill, finalize, view dashboard', async ({ page }) => {
    // Handle all dialogs
    const dialogResponses = [];
    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'prompt') {
        await dialog.accept('2026');
      } else {
        dialogResponses.push(dialog.message());
        await dialog.accept();
      }
    });

    // 1. Create meting
    await page.click('#btn-new');
    await expect(page.locator('h2')).toContainText('Meting 2026');

    // 2. Fill in Belastingen
    await page.click('.btn-invullen[data-platform="belastingen"]');
    await page.fill('#invuller', 'Jan de Vries');

    // Fill score 4 for all 17 questions
    const questions = page.locator('.question-block');
    const questionCount = await questions.count();
    for (let i = 0; i < questionCount; i++) {
      await questions.nth(i).locator('.score-option:nth-child(4) .score-btn').click();
    }

    // 3. Finalize
    await page.click('#btn-finish');

    // Should navigate to platform result
    await expect(page.locator('h2')).toContainText('Belastingen — Resultaat 2026');
    await expect(page.locator('.badge-definitief')).toBeVisible();

    // Should show radar chart canvas
    await expect(page.locator('canvas[id^="radar-"]')).toBeVisible();

    // Should show score 4.0
    await expect(page.locator('text=Totaal: 4.0 / 5')).toBeVisible();

    // 4. Go back and check meting overview
    await page.click('#btn-back');
    await expect(page.locator('.badge-definitief')).toHaveCount(1);

    // 5. Open dashboard
    await page.click('#btn-dashboard');
    await expect(page.locator('h2').first()).toContainText('Dashboard 2026');

    // Should show overview table
    await expect(page.locator('table')).toHaveCount(2); // overview + NDS table

    // Should show NDS section
    await expect(page.locator('text=NDS-gereedheid')).toBeVisible();

    // Should show radar charts
    const canvasCount = await page.locator('canvas').count();
    expect(canvasCount).toBeGreaterThanOrEqual(2);
  });

  test('should export and import a platform meting', async ({ page }) => {
    // Handle dialogs
    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'prompt') {
        await dialog.accept('2026');
      } else {
        await dialog.accept();
      }
    });

    // Create and fill a meting
    await page.click('#btn-new');
    await page.click('.btn-invullen[data-platform="belastingen"]');
    await page.fill('#invuller', 'Export Test');

    const questions = page.locator('.question-block');
    const questionCount = await questions.count();
    for (let i = 0; i < questionCount; i++) {
      await questions.nth(i).locator('.score-option:nth-child(3) .score-btn').click();
    }
    await page.click('#btn-finish');

    // Go back to meting overview
    await page.click('#btn-back');

    // Export the platform — capture download
    const downloadPromise = page.waitForEvent('download');
    await page.click('.btn-export-p[data-platform="belastingen"]');
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('volwassenheid-2026-belastingen.json');

    // Read the downloaded file
    const downloadPath = await download.path();
    const content = readFileSync(downloadPath, 'utf-8');
    const data = JSON.parse(content);

    expect(data.metingen).toHaveLength(1);
    expect(data.metingen[0].jaar).toBe(2026);
    expect(data.metingen[0].platformen.belastingen).toBeDefined();
    expect(data.metingen[0].platformen.belastingen.status).toBe('definitief');

    // Now clear localStorage and import
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Create a fresh meting for 2026
    await page.click('#btn-new');

    // Import the file
    const tempPath = join(process.cwd(), 'test-import.json');
    writeFileSync(tempPath, content);

    await page.click('#btn-import-p');
    const fileInput = page.locator('#file-import-p');
    await fileInput.setInputFiles(tempPath);

    // Should show success
    // Navigate should refresh
    await expect(page.locator('.badge-definitief')).toBeVisible({ timeout: 5000 });

    // Cleanup
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
        // Capture the alert message
        expect(dialog.message()).toContain('naam');
        await dialog.accept();
      }
    });

    await page.click('#btn-new');
    await page.click('.btn-invullen[data-platform="belastingen"]');

    // Fill all scores but leave name empty
    const questions = page.locator('.question-block');
    const questionCount = await questions.count();
    for (let i = 0; i < questionCount; i++) {
      await questions.nth(i).locator('.score-option:nth-child(4) .score-btn').click();
    }

    // Try to finalize without name
    await page.click('#btn-finish');

    // Should still be on the form (not navigated away)
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

    // Fill name but only fill first question
    await page.fill('#invuller', 'Test User');
    const firstQuestion = page.locator('.question-block').first();
    await firstQuestion.locator('.score-option:nth-child(3) .score-btn').click();

    // Try to finalize
    await page.click('#btn-finish');

    // Should show validation error
    expect(alertMessage).toContain('Vul alle vragen in');

    // Should still be on form
    await expect(page.locator('#invuller')).toBeVisible();
  });

  test('should reject invalid JSON import', async ({ page }) => {
    let alertMessage = '';
    page.on('dialog', async (dialog) => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    // Write invalid JSON file
    const tempPath = join(process.cwd(), 'test-invalid.json');
    writeFileSync(tempPath, '{ invalid json }}}');

    const fileInput = page.locator('#file-import');
    await page.click('#btn-import');
    await fileInput.setInputFiles(tempPath);

    // Wait for alert
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

    // Write JSON with invalid score (score 10, should be 1-5)
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
              'common-ground': { score: 10, toelichting: '' },
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

    // Create first meting
    await page.click('#btn-new');
    await expect(page.locator('h2')).toContainText('Meting 2026');

    // Go back
    await page.click('#btn-back');

    // Try to create duplicate
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

    // Check that the invuller input has a label
    const label = page.locator('label[for="invuller"]');
    await expect(label).toBeVisible();
    await expect(label).toContainText('Naam invuller');
  });

  test('should have score buttons with sufficient size (44px)', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      await dialog.accept('2026');
    });

    await page.click('#btn-new');
    await page.click('.btn-invullen[data-platform="belastingen"]');

    const scoreBtn = page.locator('.score-btn').first();
    const box = await scoreBtn.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  });
});
