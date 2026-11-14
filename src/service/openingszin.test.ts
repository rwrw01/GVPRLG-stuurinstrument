import { describe, expect, it } from 'vitest';

import { gelijk, meting, rij } from '@/tests/support/overzicht-testdata';

import { maakOpeningszin, ZONDER_SCORES } from './openingszin';
import { berekenJaarCijfers } from './overzichtCijfers';

describe('maakOpeningszin', () => {
  it('should name the largest riser and the platform and axis with the largest fall', () => {
    const jaren = [
      meting(2025, { belastingen: gelijk('definitief', 3), ro: gelijk('definitief', 2.5), burgerzaken: gelijk('definitief', 4) }),
      meting(2026, {
        belastingen: gelijk('definitief', 3.5),
        ro: rij('definitief', { techniek: 2.5, mens: 2, proces: 2.5 }),
        burgerzaken: gelijk('definitief', 4.1),
      }),
    ].map(berekenJaarCijfers);
    expect(maakOpeningszin(jaren)).toBe(
      'In 2026 groeit Belastingen door naar 3,5; bij R&O ligt de grootste groeikans op de as Mens.',
    );
  });

  it('should only mention the riser when no axis fell', () => {
    const jaren = [meting(2025, { ro: gelijk('definitief', 2) }), meting(2026, { ro: gelijk('definitief', 2.4) })].map(berekenJaarCijfers);
    expect(maakOpeningszin(jaren)).toBe('In 2026 groeit R&O door naar 2,4.');
  });

  it('should only mention the growth opportunity when nothing rose', () => {
    const jaren = [meting(2025, { ro: gelijk('definitief', 3) }), meting(2026, { ro: rij('definitief', { techniek: 3, mens: 2, proces: 3 }) })]
      .map(berekenJaarCijfers);
    expect(maakOpeningszin(jaren)).toBe('In 2026 ligt bij R&O de grootste groeikans op de as Mens.');
  });

  it('should make no statement from a concept, even with one answered question', () => {
    const concept = rij('concept', {});
    concept.scoresPerAs.mens!['capaciteit-kennis'] = 1;
    const jaren = [meting(2025, { ro: gelijk('definitief', 3) }), meting(2026, { ro: concept, belastingen: gelijk('definitief', 4) })]
      .map(berekenJaarCijfers);
    expect(maakOpeningszin(jaren)).toBe('In 2026 staat het gemiddelde op 4,0 over 1 definitief platform.');
  });

  it('should give the neutral state sentence when no platform is definitief in both years', () => {
    const jaren = [meting(2025, { ro: gelijk('definitief', 2) }), meting(2026, { belastingen: gelijk('definitief', 3), burgerzaken: gelijk('definitief', 4) })]
      .map(berekenJaarCijfers);
    expect(maakOpeningszin(jaren)).toBe('In 2026 staat het gemiddelde op 3,5 over 2 definitieve platformen.');
  });

  it('should say "vergelijkbaar" only when the displayed average of the common platforms is unchanged', () => {
    const gelijkBlijvend = [meting(2025, { ro: gelijk('definitief', 3) }), meting(2026, { ro: gelijk('definitief', 3) })].map(berekenJaarCijfers);
    expect(maakOpeningszin(gelijkBlijvend)).toBe('In 2026 is het gemiddelde 3,0, vergelijkbaar met 2025 (over 1 platform).');
  });

  it('should give the neutral state sentence when the common average shifted without a platform rising or an axis falling', () => {
    // R&O 2,96 -> 3,04 (3,0 -> 3,0) and Belastingen 3,06 -> 3,14 (3,1 -> 3,1): each platform displays as equal,
    // but the mean moves from 3,0 to 3,1, so "vergelijkbaar" would be wrong.
    const as = (v: number) => rij('definitief', { techniek: v, mens: v, proces: v });
    const jaren = [meting(2025, { ro: as(2.96), belastingen: as(3.06) }), meting(2026, { ro: as(3.04), belastingen: as(3.14) })]
      .map(berekenJaarCijfers);
    expect(maakOpeningszin(jaren)).toBe('In 2026 staat het gemiddelde op 3,1 over 2 definitieve platformen.');
  });

  it('should give a neutral sentence about the state when there is no comparison year', () => {
    const jaren = [meting(2025), meting(2026, { ro: gelijk('definitief', 3), belastingen: gelijk('concept', 4) })].map(berekenJaarCijfers);
    expect(maakOpeningszin(jaren)).toBe('In 2026 staat het gemiddelde op 3,0 over 1 definitief platform.');
  });

  it('should say that only concepts exist when nothing is definitief yet', () => {
    const jaren = [meting(2026, { ro: gelijk('concept', 3) })].map(berekenJaarCijfers);
    expect(maakOpeningszin(jaren)).toBe('In 2026 is nog geen platform definitief; de ingevulde scores staan in concept.');
  });

  it('should say that there are no scores yet when no question has been answered', () => {
    expect(maakOpeningszin([])).toBe(ZONDER_SCORES);
    expect(maakOpeningszin([berekenJaarCijfers(meting(2026, { ro: rij('concept', {}) }))])).toBe('Er zijn nog geen scores ingevuld.');
  });
});
