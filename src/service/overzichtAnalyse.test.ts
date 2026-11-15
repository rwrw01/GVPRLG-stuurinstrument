import { describe, expect, it } from 'vitest';

import { cijfers, gelijk, meting, rij } from '@/tests/support/overzicht-testdata';

import type { BusinessUnitRij } from './overzichtCijfers';
import { gemeenschappelijk, grootsteDaling, grootsteGroeikans, grootsteStijger, langsteStijging } from './overzichtAnalyse';

/** A definitief row with score 3 everywhere and `vieren` questions raised to 4 (total (48 + vieren) / 16). */
function metVieren(vieren: number): BusinessUnitRij {
  const data = gelijk('definitief', 3);
  const vragen = Object.values(data.scoresPerAs).flatMap((as) => Object.keys(as).map((id) => [as, id] as const));
  vragen.slice(0, vieren).forEach(([as, id]) => {
    as[id] = 4;
  });
  return data;
}

const vorige = cijfers(meting(2025, { belastingen: gelijk('definitief', 3), ro: gelijk('definitief', 2.5) }));
const nu = cijfers(meting(2026, {
  belastingen: gelijk('definitief', 3.4),
  ro: rij('definitief', { techniek: 2.6, mens: 2, proces: 2.5 }),
}));

describe('grootsteStijger / grootsteDaling', () => {
  it('should find the largest rise of a total and the largest fall on an axis of definitief platforms', () => {
    expect(grootsteStijger(nu, vorige)).toMatchObject({ businessUnitId: 'belastingen', vorige: 3, verschil: 0.4 });
    expect(grootsteDaling(nu, vorige)).toMatchObject({ businessUnitId: 'ro', asId: 'mens', waarde: 2, vorige: 2.5, verschil: -0.5 });
  });

  it('should ignore a concept, even one with a single answered question', () => {
    const concept = rij('concept', {});
    concept.scoresPerAs.mens!['capaciteit-kennis'] = 1;
    const metConcept = cijfers(meting(2026, { belastingen: concept, ro: rij('concept', { techniek: 5, mens: 5, proces: 5 }) }));
    expect(grootsteStijger(metConcept, vorige)).toBeNull();
    expect(grootsteDaling(metConcept, vorige)).toBeNull();
    expect(grootsteGroeikans(metConcept, vorige)).toBeNull();
    expect(langsteStijging([vorige, metConcept])).toBeNull();
  });

  it('should decide on the values rounded to one decimal', () => {
    // 49/16 = 3,06 and 50/16 = 3,13 both display as 3,1: no rise.
    const was = cijfers(meting(2025, { ro: metVieren(1) }));
    const wordt = cijfers(meting(2026, { ro: metVieren(2) }));
    expect(grootsteStijger(wordt, was)).toBeNull();
    expect(langsteStijging([was, wordt])).toBeNull();
  });
});

describe('gemeenschappelijk', () => {
  it('should only pair platforms that are definitief in both years', () => {
    const later = cijfers(meting(2026, { belastingen: gelijk('definitief', 3), ro: gelijk('concept', 3), burgerzaken: gelijk('definitief', 3) }));
    expect(gemeenschappelijk(later, vorige).map((p) => p.nu.businessUnitId)).toEqual(['belastingen']);
  });
});

describe('grootsteGroeikans', () => {
  it('should fall back to the lowest definitief axis score when there is no comparison year', () => {
    expect(grootsteGroeikans(nu, null)).toEqual({ businessUnitId: 'ro', asId: 'mens', waarde: 2, vorige: null, verschil: null });
  });
});

describe('langsteStijging', () => {
  it('should count the consecutive definitief rises that end in the newest year', () => {
    const jaren = [
      meting(2023, { ro: gelijk('definitief', 2), belastingen: gelijk('definitief', 3) }),
      meting(2024, { ro: gelijk('definitief', 2.2), belastingen: gelijk('definitief', 2.5) }),
      meting(2025, { ro: gelijk('definitief', 2.4), belastingen: gelijk('definitief', 3) }),
      meting(2026, { ro: gelijk('definitief', 2.6), belastingen: gelijk('definitief', 3.5) }),
    ].map((m) => cijfers(m));
    const reeks = langsteStijging(jaren);
    expect(reeks).toMatchObject({ businessUnitId: 'ro', aantalMetingen: 3, vanJaar: 2023, vanWaarde: 2 });
    expect(reeks?.naarWaarde).toBeCloseTo(2.6);
  });

  it('should stop the run at a year in which the platform was a concept', () => {
    const jaren = [
      meting(2024, { ro: gelijk('definitief', 2) }),
      meting(2025, { ro: gelijk('concept', 2.2) }),
      meting(2026, { ro: gelijk('definitief', 2.6) }),
    ].map((m) => cijfers(m));
    expect(langsteStijging(jaren)).toBeNull();
  });

  it('should be null when nothing rose into the newest year', () => {
    expect(langsteStijging([vorige, cijfers(meting(2026, { belastingen: gelijk('definitief', 3) }))])).toBeNull();
  });
});
