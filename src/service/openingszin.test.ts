import { describe, expect, it } from 'vitest';

import { cijfers, gelijk, meting, rij } from '@/tests/support/overzicht-testdata';

import { maakOpeningszin, ZONDER_SCORES } from './openingszin';

describe('maakOpeningszin', () => {
  it('should name the largest riser and the platform and axis with the largest fall', () => {
    const jaren = [
      meting(2025, { belastingen: gelijk('definitief', 3), ro: gelijk('definitief', 2.5), burgerzaken: gelijk('definitief', 4) }),
      meting(2026, {
        belastingen: gelijk('definitief', 3.5),
        ro: rij('definitief', { techniek: 2.5, mens: 2, proces: 2.5 }),
        burgerzaken: gelijk('definitief', 4.1),
      }),
    ].map((m) => cijfers(m));
    expect(maakOpeningszin(jaren)).toBe(
      'In 2026 groeit Belastingen door naar 3,5; bij R&O ligt de grootste groeikans op de as Mens.',
    );
  });

  it('should only mention the riser when no axis fell', () => {
    const jaren = [meting(2025, { ro: gelijk('definitief', 2) }), meting(2026, { ro: gelijk('definitief', 2.4) })].map((m) => cijfers(m));
    expect(maakOpeningszin(jaren)).toBe('In 2026 groeit R&O door naar 2,4.');
  });

  it('should only mention the growth opportunity when nothing rose', () => {
    const jaren = [meting(2025, { ro: gelijk('definitief', 3) }), meting(2026, { ro: rij('definitief', { techniek: 3, mens: 2, proces: 3 }) })]
      .map((m) => cijfers(m));
    expect(maakOpeningszin(jaren)).toBe('In 2026 ligt bij R&O de grootste groeikans op de as Mens.');
  });

  it('should make no statement from a concept, even with one answered question', () => {
    const concept = rij('concept', {});
    concept.scoresPerAs.mens!['capaciteit-kennis'] = 1;
    const jaren = [meting(2025, { ro: gelijk('definitief', 3) }), meting(2026, { ro: concept, belastingen: gelijk('definitief', 4) })]
      .map((m) => cijfers(m));
    expect(maakOpeningszin(jaren)).toBe('In 2026 staat het gemiddelde op 4,0 over 1 definitieve businessunit.');
  });

  it('should give the neutral state sentence when no platform is definitief in both years', () => {
    const jaren = [meting(2025, { ro: gelijk('definitief', 2) }), meting(2026, { belastingen: gelijk('definitief', 3), burgerzaken: gelijk('definitief', 4) })]
      .map((m) => cijfers(m));
    expect(maakOpeningszin(jaren)).toBe('In 2026 staat het gemiddelde op 3,5 over 2 definitieve businessunits.');
  });

  it('should say "vergelijkbaar" only when the displayed average of the common platforms is unchanged', () => {
    const gelijkBlijvend = [meting(2025, { ro: gelijk('definitief', 3) }), meting(2026, { ro: gelijk('definitief', 3) })].map((m) => cijfers(m));
    expect(maakOpeningszin(gelijkBlijvend)).toBe('In 2026 staat het gemiddelde op 3,0 over 1 definitieve businessunit, vergelijkbaar met 2025.');
  });

  it('should state the same average as the key figure when a platform is definitief for the first time', () => {
    const jaren = [
      meting(2025, { ro: gelijk('definitief', 3) }),
      meting(2026, { ro: gelijk('definitief', 3), belastingen: gelijk('definitief', 4) }),
    ].map((m) => cijfers(m));
    expect(maakOpeningszin(jaren)).toBe(
      'In 2026 staat het gemiddelde op 3,5 over 2 definitieve businessunits; de businessunit die ook in 2025 definitief was, scoort vergelijkbaar.',
    );
  });

  it('should name a plural comparison base separately from the year average', () => {
    const jaren = [
      meting(2025, { ro: gelijk('definitief', 3), burgerzaken: gelijk('definitief', 3) }),
      meting(2026, { ro: gelijk('definitief', 3), burgerzaken: gelijk('definitief', 3), belastingen: gelijk('definitief', 4.5) }),
    ].map((m) => cijfers(m));
    expect(maakOpeningszin(jaren)).toBe(
      'In 2026 staat het gemiddelde op 3,5 over 3 definitieve businessunits; de 2 businessunits die ook in 2025 definitief waren, scoren gemiddeld vergelijkbaar.',
    );
  });

  it('should use the simple form with a plural base when the sets are equal', () => {
    const jaren = [
      meting(2025, { ro: gelijk('definitief', 3), burgerzaken: gelijk('definitief', 4) }),
      meting(2026, { ro: gelijk('definitief', 3), burgerzaken: gelijk('definitief', 4) }),
    ].map((m) => cijfers(m));
    expect(maakOpeningszin(jaren)).toBe('In 2026 staat het gemiddelde op 3,5 over 2 definitieve businessunits, vergelijkbaar met 2025.');
  });

  it('should give the neutral state sentence when the common average shifted without a platform rising or an axis falling', () => {
    // R&O 2,96 -> 3,04 (3,0 -> 3,0) and Belastingen 3,06 -> 3,14 (3,1 -> 3,1): each platform displays as equal,
    // but the mean moves from 3,0 to 3,1, so "vergelijkbaar" would be wrong.
    const as = (v: number) => rij('definitief', { techniek: v, mens: v, proces: v });
    const jaren = [meting(2025, { ro: as(2.96), belastingen: as(3.06) }), meting(2026, { ro: as(3.04), belastingen: as(3.14) })]
      .map((m) => cijfers(m));
    expect(maakOpeningszin(jaren)).toBe('In 2026 staat het gemiddelde op 3,1 over 2 definitieve businessunits.');
  });

  it('should give a neutral sentence about the state when there is no comparison year', () => {
    const jaren = [meting(2025), meting(2026, { ro: gelijk('definitief', 3), belastingen: gelijk('concept', 4) })].map((m) => cijfers(m));
    expect(maakOpeningszin(jaren)).toBe('In 2026 staat het gemiddelde op 3,0 over 1 definitieve businessunit.');
  });

  it('should say that only concepts exist when nothing is definitief yet', () => {
    const jaren = [meting(2026, { ro: gelijk('concept', 3) })].map((m) => cijfers(m));
    expect(maakOpeningszin(jaren)).toBe('In 2026 is nog geen businessunit definitief; de ingevulde scores staan in concept.');
  });

  it('should say that there are no scores yet when no question has been answered', () => {
    expect(maakOpeningszin([])).toBe(ZONDER_SCORES);
    expect(maakOpeningszin([cijfers(meting(2026, { ro: rij('concept', {}) }))])).toBe('Er zijn nog geen scores ingevuld.');
  });
});
