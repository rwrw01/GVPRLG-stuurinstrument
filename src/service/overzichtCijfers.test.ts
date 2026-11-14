import { describe, expect, it } from 'vitest';

import { gelijk, meting, rij } from './_overzichtTestdata';
import { berekenJaarCijfers, berekenPlatformCijfers, kiesVergelijking, voortgangLabel } from './overzichtCijfers';

describe('berekenPlatformCijfers', () => {
  it('should average the answered questions per axis and over all questions when scores are partial', () => {
    const data = rij('concept', { techniek: 4, proces: 1 });
    data.scoresPerAs.techniek!['cloud-data'] = 2;
    data.scoresPerAs.techniek!['ai-integratie'] = null;
    const cijfers = berekenPlatformCijfers('ro', data);
    expect(cijfers.perAs.techniek).toBeCloseTo(10 / 3);
    expect(cijfers.perAs.mens).toBeNull();
    expect(cijfers.perAs.proces).toBe(1);
    expect(cijfers.beantwoord).toBe(11);
    // 4 + 2 + 4 (techniek) + 8 x 1 (proces) over 11 answered questions, not the mean of the axis means.
    expect(cijfers.totaal).toBeCloseTo(18 / 11);
    expect(cijfers.status).toBe('concept');
  });

  it('should weigh the process axis by its eight questions when every question is answered', () => {
    const cijfers = berekenPlatformCijfers('ro', rij('definitief', { techniek: 4, mens: 4, proces: 1 }));
    expect(cijfers.totaal).toBeCloseTo((4 * 4 + 4 * 4 + 8 * 1) / 16);
    expect(cijfers.status).toBe('definitief');
  });

  it('should be niet-gestart without totals when the platform has no row', () => {
    expect(berekenPlatformCijfers('ro', undefined)).toEqual({
      platformId: 'ro', status: 'niet-gestart', perAs: { techniek: null, mens: null, proces: null }, totaal: null, beantwoord: 0,
    });
  });

  it('should give no total when a row exists without answers', () => {
    const cijfers = berekenPlatformCijfers('ro', rij('concept', {}));
    expect(cijfers).toMatchObject({ status: 'concept', totaal: null, beantwoord: 0 });
  });
});

describe('voortgangLabel', () => {
  it('should show definitief over the number of platforms when not every platform is definitief', () => {
    expect(voortgangLabel(3, 5)).toBe('3/5');
    expect(voortgangLabel(0, 5)).toBe('0/5');
  });

  it('should say afgerond when every platform is definitief', () => {
    expect(voortgangLabel(5, 5)).toBe('afgerond');
  });
});

describe('berekenJaarCijfers', () => {
  it('should list every platform in config order and average the platforms that have scores', () => {
    const jaar = berekenJaarCijfers(meting(2026, { ro: gelijk('definitief', 2), belastingen: gelijk('concept', 4) }));
    expect(jaar.platformen.map((p) => p.platformId)).toEqual(['belastingen', 'ro', 'burgerzaken', 'sociaal-domein', 'informatievoorziening']);
    expect(jaar.platformen.map((p) => p.status)).toEqual(['concept', 'definitief', 'niet-gestart', 'niet-gestart', 'niet-gestart']);
    expect(jaar.gemiddelde).toBe(3);
    expect(jaar.perAs.mens).toBe(3);
    expect(jaar.aantalDefinitief).toBe(1);
    expect(jaar.voortgang).toBe('1/5');
  });
});

describe('kiesVergelijking', () => {
  it('should pick the newest year with scores and the year with scores before it', () => {
    const jaren = [meting(2027), meting(2024, { ro: gelijk('concept', 2) }), meting(2025), meting(2026, { ro: gelijk('concept', 3) })]
      .map(berekenJaarCijfers);
    const { nu, vorige } = kiesVergelijking(jaren);
    expect(nu?.jaar).toBe(2026);
    expect(vorige?.jaar).toBe(2024);
  });

  it('should return nulls when no year has scores', () => {
    expect(kiesVergelijking([berekenJaarCijfers(meting(2026))])).toEqual({ nu: null, vorige: null });
  });
});
