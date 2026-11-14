import { describe, expect, it } from 'vitest';

import { gelijk, meting, rij } from '@/tests/support/overzicht-testdata';

import { bouwOverzicht } from './overzicht';

describe('bouwOverzicht', () => {
  it('should compose years oldest first with the derived sentence, key figures and axis comparison', () => {
    const overzicht = bouwOverzicht([
      meting(2026, { belastingen: gelijk('definitief', 3.4), ro: rij('definitief', { techniek: 2.6, mens: 2, proces: 2.5 }), burgerzaken: gelijk('concept', 1) }),
      meting(2025, { belastingen: gelijk('definitief', 3), ro: gelijk('definitief', 2.5) }),
      meting(2027),
    ]);
    expect(overzicht.jaren.map((j) => [j.jaar, j.voortgang])).toEqual([[2025, '2/5'], [2026, '2/5'], [2027, '0/5']]);
    expect(overzicht.nuJaar).toBe(2026);
    expect(overzicht.vorigeJaar).toBe(2025);
    expect(overzicht.openingszin).toBe('In 2026 groeit Belastingen door naar 3,4; bij R&O ligt de grootste groeikans op de as Mens.');
    expect(overzicht.kerncijfers?.stijger?.platformId).toBe('belastingen');
    expect(overzicht.kerncijfers?.vergelijking?.aantal).toBe(2);
    expect(overzicht.gespreksonderwerpen[0]?.soort).toBe('daling');
    // The concept (burgerzaken, score 1) does not pull the axes down.
    const mens = overzicht.assen.find((a) => a.id === 'mens');
    expect(mens).toMatchObject({ id: 'mens', naam: 'Mens', vorige: 2.75, aantal: 2, vergeleken: true });
    expect(mens?.nu).toBeCloseTo(2.7);
    expect(overzicht.platformen[0]).toEqual({ id: 'belastingen', naam: 'Belastingen', kleur: '#2a78d6' });
  });

  it('should have no key figures and the empty sentence when nothing is scored', () => {
    const overzicht = bouwOverzicht([meting(2026)]);
    expect(overzicht.kerncijfers).toBeNull();
    expect(overzicht.nuJaar).toBeNull();
    expect(overzicht.openingszin).toBe('Er zijn nog geen scores ingevuld.');
    expect(overzicht.assen.every((a) => a.nu === null && a.vorige === null)).toBe(true);
  });
});
