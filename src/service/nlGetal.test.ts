import { describe, expect, it } from 'vitest';

import { formatScore, noemOp, zichtbaarVerschil } from './nlGetal';

describe('formatScore', () => {
  it('should round to one decimal with a Dutch comma', () => {
    expect(formatScore(3.45)).toBe('3,5');
    expect(formatScore(4)).toBe('4,0');
    expect(formatScore(18 / 11)).toBe('1,6');
  });
});

describe('noemOp', () => {
  it('should join names with commas and "en"', () => {
    expect(noemOp([])).toBe('');
    expect(noemOp(['A'])).toBe('A');
    expect(noemOp(['A', 'B'])).toBe('A en B');
    expect(noemOp(['A', 'B', 'C'])).toBe('A, B en C');
  });
});

describe('zichtbaarVerschil', () => {
  it('should compare the values rounded to one decimal', () => {
    expect(zichtbaarVerschil(50 / 16, 49 / 16)).toBe(0); // 3,1 and 3,1
    expect(zichtbaarVerschil(3.46, 3.44)).toBe(0.1); // 3,5 and 3,4
    expect(zichtbaarVerschil(1.9, 2.3)).toBe(-0.4);
  });
});
