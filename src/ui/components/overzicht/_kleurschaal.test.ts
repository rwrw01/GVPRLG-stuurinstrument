import { describe, expect, it } from 'vitest';

import { celKleur, contrast } from './_kleurschaal';

describe('celKleur', () => {
  it('should get darker for a higher score', () => {
    expect(contrast(celKleur(5).achtergrond, '#ffffff')).toBeGreaterThan(contrast(celKleur(1).achtergrond, '#ffffff'));
  });

  it('should keep the cell text at AA contrast for every score from 1 to 5', () => {
    for (let score = 1; score <= 5; score += 0.05) {
      const { achtergrond, tekst } = celKleur(score);
      expect(contrast(achtergrond, tekst)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('contrast', () => {
  it('should match the WCAG ratio for the brand button colour', () => {
    expect(contrast('#2c7fa0', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#4d5f68', '#f3f6f7')).toBeGreaterThanOrEqual(4.5);
  });
});
