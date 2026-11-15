import { describe, expect, it } from 'vitest';

import { assenBasis, kerncijferBasis } from './_basisTeksten';
import type { AsVergelijking, Kerncijfers } from './_overzichtTypen';

function cijfers(deel: Partial<Kerncijfers>): Kerncijfers {
  return {
    jaar: 2026, gemiddelde: 3.5, aantalGemiddelde: 2, vorigeJaar: 2025, vergelijking: null, aantalBusinessUnits: 5,
    aantalDefinitief: 2, aantalConcept: 0, aantalNietGestart: 3, stijger: null, groeikans: null, ...deel,
  };
}

function as(aantal: number, vergeleken: boolean): AsVergelijking[] {
  return [{ id: 'techniek', naam: 'Techniek', nu: 3, vorige: vergeleken ? 3 : null, aantal, vergeleken }];
}

describe('kerncijferBasis', () => {
  it('should use the singular for one common platform and the plural otherwise', () => {
    expect(kerncijferBasis(cijfers({ vergelijking: { nu: 3, vorige: 3, aantal: 1 } })))
      .toBe('Over 2 definitieve businessunits; verschil met 2025 over de ene businessunit die in beide jaren definitief is');
    expect(kerncijferBasis(cijfers({ aantalGemiddelde: 1, vergelijking: { nu: 3, vorige: 3, aantal: 1 } })))
      .toBe('Over 1 definitieve businessunit; verschil met 2025 over de ene businessunit die in beide jaren definitief is');
    expect(kerncijferBasis(cijfers({ aantalGemiddelde: 3, vergelijking: { nu: 3, vorige: 3, aantal: 2 } })))
      .toBe('Over 3 definitieve businessunits; verschil met 2025 over de 2 businessunits die in beide jaren definitief zijn');
  });

  it('should explain a missing comparison', () => {
    expect(kerncijferBasis(cijfers({}))).toBe('Over 2 definitieve businessunits; geen vergelijking met 2025, geen businessunit is in beide jaren definitief');
    expect(kerncijferBasis(cijfers({ vorigeJaar: null }))).toBe('Over 2 definitieve businessunits; nog geen vergelijkingsjaar');
    expect(kerncijferBasis(cijfers({ gemiddelde: null, aantalGemiddelde: 0 }))).toBe('Nog geen definitieve businessunits');
  });
});

describe('assenBasis', () => {
  it('should use the singular for one common platform and the plural otherwise', () => {
    expect(assenBasis(as(1, true), 2026, 2025))
      .toBe('Gemiddeld over de ene businessunit die in 2025 en 2026 definitief is. Het streepje is de score van 2025.');
    expect(assenBasis(as(2, true), 2026, 2025))
      .toBe('Gemiddeld over de 2 businessunits die in 2025 en 2026 definitief zijn. Het streepje is de score van 2025.');
  });

  it('should explain the base without comparison', () => {
    expect(assenBasis(as(1, false), 2026, 2025)).toBe('Gemiddeld over 1 definitieve businessunit. Geen vergelijking met 2025: geen businessunit is in beide jaren definitief.');
    expect(assenBasis(as(2, false), 2026, null)).toBe('Gemiddeld over 2 definitieve businessunits.');
    expect(assenBasis(as(0, false), 2026, null)).toBe('In 2026 is nog geen businessunit definitief.');
  });
});
