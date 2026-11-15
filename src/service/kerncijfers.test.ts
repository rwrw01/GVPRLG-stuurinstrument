import { describe, expect, it } from 'vitest';

import { cijfers, gelijk, meting, rij } from '@/tests/support/overzicht-testdata';

import { berekenKerncijfers, vergelijkAssen, vergelijkGemiddelde } from './kerncijfers';

describe('vergelijkGemiddelde', () => {
  it('should compare only the platforms definitief in both years', () => {
    const vorige = cijfers(meting(2025, { belastingen: gelijk('definitief', 4), ro: gelijk('definitief', 2) }));
    const nu = cijfers(meting(2026, { belastingen: gelijk('definitief', 4) }));
    expect(vergelijkGemiddelde(nu, vorige)).toEqual({ nu: 4, vorige: 4, aantal: 1 });
  });

  it('should give no comparison without common definitief platforms', () => {
    const vorige = cijfers(meting(2025, { ro: gelijk('definitief', 2) }));
    const nu = cijfers(meting(2026, { belastingen: gelijk('definitief', 4), ro: gelijk('concept', 3) }));
    expect(vergelijkGemiddelde(nu, vorige)).toBeNull();
    expect(vergelijkGemiddelde(nu, null)).toBeNull();
  });
});

describe('berekenKerncijfers', () => {
  it('should average the definitief platforms, count statuses and compare on the common base', () => {
    const vorige = cijfers(meting(2025, { belastingen: gelijk('definitief', 4), ro: gelijk('definitief', 2) }));
    const nu = cijfers(meting(2026, { belastingen: gelijk('definitief', 4), ro: rij('concept', { mens: 1 }) }));
    const kern = berekenKerncijfers(nu, vorige);
    expect(kern).toMatchObject({
      jaar: 2026, gemiddelde: 4, aantalGemiddelde: 1, vorigeJaar: 2025, vergelijking: { nu: 4, vorige: 4, aantal: 1 },
      aantalBusinessUnits: 5, aantalDefinitief: 1, aantalConcept: 1, aantalNietGestart: 3, stijger: null,
    });
    // The concept with a single low axis is never the growth opportunity.
    expect(kern.groeikans?.businessUnitId).toBe('belastingen');
  });
});

describe('vergelijkAssen', () => {
  it('should use the common definitief platforms when there are any', () => {
    const vorige = cijfers(meting(2025, { belastingen: gelijk('definitief', 4), ro: gelijk('definitief', 2) }));
    const nu = cijfers(meting(2026, { belastingen: gelijk('definitief', 4), ro: gelijk('concept', 5) }));
    expect(vergelijkAssen(nu, vorige)[0]).toEqual({ id: 'techniek', naam: 'Techniek', nu: 4, vorige: 4, aantal: 1, vergeleken: true });
  });

  it('should show the definitief platforms of the newest year without comparison otherwise', () => {
    const vorige = cijfers(meting(2025, { ro: gelijk('definitief', 2) }));
    const nu = cijfers(meting(2026, { belastingen: gelijk('definitief', 4), burgerzaken: gelijk('definitief', 3) }));
    expect(vergelijkAssen(nu, vorige)[1]).toEqual({ id: 'mens', naam: 'Mens', nu: 3.5, vorige: null, aantal: 2, vergeleken: false });
    expect(vergelijkAssen(null, null).every((a) => a.nu === null && a.aantal === 0)).toBe(true);
  });
});
