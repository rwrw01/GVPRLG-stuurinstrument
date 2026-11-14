import { describe, expect, it } from 'vitest';

import { gelijk, meting, rij } from './_overzichtTestdata';
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
    const jaren = [meting(2025, { ro: gelijk('definitief', 2) }), meting(2026, { ro: gelijk('concept', 2.4) })].map(berekenJaarCijfers);
    expect(maakOpeningszin(jaren)).toBe('In 2026 groeit R&O door naar 2,4.');
  });

  it('should only mention the growth opportunity when nothing rose', () => {
    const jaren = [meting(2025, { ro: gelijk('definitief', 3) }), meting(2026, { ro: rij('definitief', { techniek: 3, mens: 2, proces: 3 }) })]
      .map(berekenJaarCijfers);
    expect(maakOpeningszin(jaren)).toBe('In 2026 ligt bij R&O de grootste groeikans op de as Mens.');
  });

  it('should give a neutral sentence about the state when there is no comparison year', () => {
    const jaren = [meting(2025), meting(2026, { ro: gelijk('definitief', 3), belastingen: gelijk('concept', 4) })].map(berekenJaarCijfers);
    expect(maakOpeningszin(jaren)).toBe('In 2026 staat het gemiddelde op 3,5 over 2 platformen met scores.');
  });

  it('should say that there are no scores yet when no question has been answered', () => {
    expect(maakOpeningszin([])).toBe(ZONDER_SCORES);
    expect(maakOpeningszin([berekenJaarCijfers(meting(2026, { ro: rij('concept', {}) }))])).toBe('Er zijn nog geen scores ingevuld.');
  });

  it('should never use the words of a ranking or judgement', () => {
    const jaren = [meting(2025, { ro: gelijk('definitief', 3) }), meting(2026, { ro: gelijk('definitief', 3) })].map(berekenJaarCijfers);
    const zin = maakOpeningszin(jaren);
    expect(zin).toBe('In 2026 is het gemiddelde 3,0, vergelijkbaar met 2025.');
    expect(zin).not.toMatch(/volwassen|laagste|daalt|achter/i);
  });
});
