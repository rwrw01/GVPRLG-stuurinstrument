import { describe, expect, it } from 'vitest';

import { nl, verschil } from './_formatteer';

describe('nl', () => {
  it('should show one decimal with a comma, or a dash without a score', () => {
    expect(nl(3.25)).toBe('3,3');
    expect(nl(null)).toBe('–');
  });
});

describe('verschil', () => {
  it('should give icon and signed text, never colour alone', () => {
    expect(verschil(3.4, 3.2)).toEqual({ richting: 'op', icoon: '▲', tekst: '+0,2' });
    expect(verschil(1.9, 2.3)).toEqual({ richting: 'neer', icoon: '▼', tekst: '−0,4' });
    expect(verschil(3.01, 3)).toEqual({ richting: 'gelijk', icoon: '=', tekst: '0,0' });
    expect(verschil(50 / 16, 49 / 16)).toEqual({ richting: 'gelijk', icoon: '=', tekst: '0,0' });
    expect(verschil(3.46, 3.44)).toEqual({ richting: 'op', icoon: '▲', tekst: '+0,1' });
    expect(verschil(null, 3)).toBeNull();
  });
});
