import { describe, expect, it } from 'vitest';

import { formatScore, noemOp } from './nlGetal';

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
