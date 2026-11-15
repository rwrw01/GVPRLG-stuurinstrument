import { describe, expect, it } from 'vitest';

import { AS_PALET, BUSINESS_UNIT_PALET, volgendeVrijeKleur } from './paletten';

/** WCAG relative luminance contrast of a colour against white. */
function contrastOpWit(hex: string): number {
  const kanaal = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * kanaal(1) + 0.7152 * kanaal(3) + 0.0722 * kanaal(5);
  return 1.05 / (l + 0.05);
}

describe('paletten', () => {
  it('should keep the five former platform colours first in a palette of eight', () => {
    expect(BUSINESS_UNIT_PALET.slice(0, 5)).toEqual(['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4']);
    expect(BUSINESS_UNIT_PALET).toHaveLength(8);
    expect(new Set(BUSINESS_UNIT_PALET).size).toBe(8);
  });

  it('should give six axis colours, the former three first, each WCAG AA as text on white', () => {
    expect(AS_PALET.slice(0, 3)).toEqual(['#1F6FB8', '#15803D', '#C2410C']);
    expect(AS_PALET).toHaveLength(6);
    expect(AS_PALET.every((k) => contrastOpWit(k) >= 4.5)).toBe(true);
  });
});

describe('volgendeVrijeKleur', () => {
  it('should skip every colour in use, also of removed items, ignoring case', () => {
    expect(volgendeVrijeKleur(AS_PALET, ['#1f6fb8', '#15803D', null])).toBe('#C2410C');
  });

  it('should return null when every colour is taken', () => {
    expect(volgendeVrijeKleur(AS_PALET, [...AS_PALET])).toBeNull();
  });
});
