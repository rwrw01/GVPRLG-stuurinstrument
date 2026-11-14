import { describe, expect, it } from 'vitest';

import { gelijk, meting, rij } from './_overzichtTestdata';
import { berekenKerncijfers, grootsteDaling, grootsteGroeikans, grootsteStijger, langsteStijging } from './overzichtAnalyse';
import { berekenJaarCijfers } from './overzichtCijfers';

const vorige = berekenJaarCijfers(meting(2025, { belastingen: gelijk('definitief', 3), ro: gelijk('definitief', 2.5) }));
const nu = berekenJaarCijfers(meting(2026, {
  belastingen: gelijk('definitief', 3.4),
  ro: rij('concept', { techniek: 2.6, mens: 2, proces: 2.5 }),
}));

describe('grootsteStijger / grootsteDaling', () => {
  it('should find the largest rise of a total and the largest fall on an axis', () => {
    expect(grootsteStijger(nu, vorige)).toMatchObject({ platformId: 'belastingen', vorige: 3 });
    expect(grootsteStijger(nu, vorige)?.verschil).toBeCloseTo(0.4);
    expect(grootsteDaling(nu, vorige)).toMatchObject({ platformId: 'ro', asId: 'mens', waarde: 2, vorige: 2.5 });
  });

  it('should ignore changes below the display threshold', () => {
    const bijna = berekenJaarCijfers(meting(2026, { belastingen: gelijk('definitief', 3.04), ro: gelijk('definitief', 2.48) }));
    expect(grootsteStijger(bijna, vorige)).toBeNull();
    expect(grootsteDaling(bijna, vorige)).toBeNull();
  });
});

describe('grootsteGroeikans', () => {
  it('should fall back to the lowest axis score when there is no comparison year', () => {
    expect(grootsteGroeikans(nu, null)).toEqual({ platformId: 'ro', asId: 'mens', waarde: 2, vorige: null, verschil: null });
  });
});

describe('langsteStijging', () => {
  it('should count the consecutive rises that end in the newest year', () => {
    const jaren = [
      meting(2023, { ro: gelijk('definitief', 2), belastingen: gelijk('definitief', 3) }),
      meting(2024, { ro: gelijk('definitief', 2.2), belastingen: gelijk('definitief', 2.5) }),
      meting(2025, { ro: gelijk('definitief', 2.4), belastingen: gelijk('definitief', 3) }),
      meting(2026, { ro: gelijk('definitief', 2.6), belastingen: gelijk('definitief', 3.5) }),
    ].map(berekenJaarCijfers);
    const reeks = langsteStijging(jaren);
    expect(reeks).toMatchObject({ platformId: 'ro', aantalJaren: 3, vanJaar: 2023, vanWaarde: 2 });
    expect(reeks?.naarWaarde).toBeCloseTo(2.6);
  });

  it('should be null when nothing rose into the newest year', () => {
    expect(langsteStijging([vorige, berekenJaarCijfers(meting(2026, { belastingen: gelijk('definitief', 3) }))])).toBeNull();
  });
});

describe('berekenKerncijfers', () => {
  it('should count statuses and compare the averages with the previous year', () => {
    const cijfers = berekenKerncijfers(nu, vorige);
    expect(cijfers).toMatchObject({
      jaar: 2026, vorigeJaar: 2025, vorigeGemiddelde: 2.75, aantalPlatformen: 5, aantalDefinitief: 1, aantalConcept: 1, aantalNietGestart: 3,
    });
    expect(cijfers.stijger?.platformId).toBe('belastingen');
    expect(cijfers.groeikans).toMatchObject({ platformId: 'ro', asId: 'mens' });
  });
});
