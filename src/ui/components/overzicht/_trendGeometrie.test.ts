import { describe, expect, it } from 'vitest';

import type { JaarCijfers } from './_overzichtTypen';
import { bouwTrend, MAAT, xVoor, yVoor } from './_trendGeometrie';

function jaar(j: number, totalen: Record<string, number | null>): JaarCijfers {
  return {
    jaar: j, voortgang: '0/2', aantalDefinitief: 0, gemiddelde: null, perAs: {},
    platformen: Object.entries(totalen).map(([platformId, totaal]) => ({
      platformId, status: totaal === null ? 'niet-gestart' : 'concept', perAs: {}, totaal, beantwoord: totaal === null ? 0 : 16,
    })),
  };
}

const PLATFORMEN = [{ id: 'a', naam: 'A', kleur: '#000' }, { id: 'b', naam: 'B', kleur: '#111' }];

describe('trend geometry', () => {
  it('should map 5 to the top and 1 to the bottom of the plot area', () => {
    expect(yVoor(5)).toBe(MAAT.boven);
    expect(yVoor(1)).toBe(MAAT.hoogte - MAAT.onder);
    expect(xVoor(0, 1)).toBeGreaterThan(MAAT.links);
  });

  it('should skip years without a total and keep end labels apart', () => {
    const lijnen = bouwTrend([jaar(2025, { a: 3, b: null }), jaar(2026, { a: 3, b: 3.05 })], PLATFORMEN);
    expect(lijnen[0]?.punten.map((p) => p.jaar)).toEqual([2025, 2026]);
    expect(lijnen[1]?.punten.map((p) => p.jaar)).toEqual([2026]);
    const [a, b] = lijnen.map((l) => l.eindLabelY!);
    expect(Math.abs(a! - b!)).toBeGreaterThanOrEqual(16);
  });
});
