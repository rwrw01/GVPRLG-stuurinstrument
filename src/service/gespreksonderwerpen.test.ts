import { describe, expect, it } from 'vitest';

import { gelijk, meting, rij } from './_overzichtTestdata';
import { kiesGespreksonderwerpen } from './gespreksonderwerpen';
import { berekenJaarCijfers } from './overzichtCijfers';

describe('kiesGespreksonderwerpen', () => {
  it('should list fall, concept, not started and longest rise in that order', () => {
    const concept = rij('concept', { techniek: 3, mens: 3 });
    const jaren = [
      meting(2024, { burgerzaken: gelijk('definitief', 3.7), ro: gelijk('definitief', 2.3) }),
      meting(2025, { burgerzaken: gelijk('definitief', 3.9), ro: gelijk('definitief', 2.3) }),
      meting(2026, {
        burgerzaken: gelijk('definitief', 4.1),
        ro: rij('definitief', { techniek: 2.3, mens: 1.9, proces: 2.3 }),
        'sociaal-domein': concept,
        belastingen: gelijk('definitief', 3),
      }),
    ].map(berekenJaarCijfers);
    expect(kiesGespreksonderwerpen(jaren)).toEqual([
      { soort: 'daling', titel: 'R&O: de as Mens staat onder druk', toelichting: 'Van 2,3 in 2025 naar 1,9 in 2026. Dit vraagt samen aandacht.' },
      { soort: 'concept', titel: 'Sociaal Domein staat nog in concept', toelichting: '8 van de 16 vragen zijn beantwoord.' },
      { soort: 'niet-gestart', titel: 'Informatievoorziening is nog niet gestart', toelichting: 'Voor 2026 zijn nog geen scores ingevuld.' },
      { soort: 'stijging', titel: 'Burgerzaken groeit 2 jaar op rij', toelichting: 'Van 3,7 in 2024 naar 4,1 in 2026.' },
    ]);
  });

  it('should group several platforms in one point and skip points without a cause', () => {
    const jaren = [meting(2026, { ro: gelijk('concept', 2), belastingen: rij('concept', { proces: 3 }) })].map(berekenJaarCijfers);
    const onderwerpen = kiesGespreksonderwerpen(jaren);
    expect(onderwerpen.map((o) => o.soort)).toEqual(['concept', 'niet-gestart']);
    expect(onderwerpen[0]?.titel).toBe('Belastingen en R&O staan nog in concept');
    expect(onderwerpen[0]?.toelichting).toBe('Beantwoorde vragen: Belastingen 8 van 16, R&O 16 van 16.');
    expect(onderwerpen[1]?.titel).toBe('Burgerzaken, Sociaal Domein en Informatievoorziening zijn nog niet gestart');
  });

  it('should name a single rise against the comparison year', () => {
    const jaren = [meting(2025, { ro: gelijk('definitief', 2) }), meting(2026, { ro: gelijk('definitief', 2.5) })].map(berekenJaarCijfers);
    const stijging = kiesGespreksonderwerpen(jaren).find((o) => o.soort === 'stijging');
    expect(stijging?.titel).toBe('R&O groeit ten opzichte van 2025');
  });

  it('should return at most four points and none without scores', () => {
    expect(kiesGespreksonderwerpen([berekenJaarCijfers(meting(2026))])).toEqual([]);
  });
});
