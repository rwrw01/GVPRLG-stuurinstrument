import { describe, expect, it } from 'vitest';
import { RouteParamsSchema, SavePlatformScoreSchema } from './schemas';

describe('SavePlatformScoreSchema', () => {
  it('accepteert een geldige payload', () => {
    const result = SavePlatformScoreSchema.safeParse({
      status: 'concept',
      algemeneToelichting: 'ok',
      vraagScores: [{ vraagId: 'common-ground-standaarden', score: 3, toelichting: '' }],
    });
    expect(result.success).toBe(true);
  });

  it('wijst een score buiten 1-5 af', () => {
    const result = SavePlatformScoreSchema.safeParse({
      status: 'concept',
      algemeneToelichting: '',
      vraagScores: [{ vraagId: 'common-ground-standaarden', score: 10, toelichting: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('wijst een niet-geheel getal als score af', () => {
    const result = SavePlatformScoreSchema.safeParse({
      status: 'concept',
      algemeneToelichting: '',
      vraagScores: [{ vraagId: 'common-ground-standaarden', score: 3.5, toelichting: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('wijst een onbekende status af', () => {
    const result = SavePlatformScoreSchema.safeParse({
      status: 'onbekend',
      algemeneToelichting: '',
      vraagScores: [],
    });
    expect(result.success).toBe(false);
  });

  it('wijst een onbekende vraagId af', () => {
    const result = SavePlatformScoreSchema.safeParse({
      status: 'concept',
      algemeneToelichting: '',
      vraagScores: [{ vraagId: 'bogus-vraag', score: 3, toelichting: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('wijst meer vraagScores af dan er vragen bestaan', () => {
    const teveel = Array.from({ length: 17 }, (_, i) => ({
      vraagId: 'common-ground-standaarden',
      score: 3,
      toelichting: String(i),
    }));
    const result = SavePlatformScoreSchema.safeParse({
      status: 'concept',
      algemeneToelichting: '',
      vraagScores: teveel,
    });
    expect(result.success).toBe(false);
  });
});

describe('RouteParamsSchema', () => {
  it('accepteert een geldig jaar en platform-id', () => {
    const result = RouteParamsSchema.safeParse({ jaar: '2027', platformId: 'belastingen' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.jaar).toBe(2027);
  });

  it('wijst een niet-numeriek jaar af', () => {
    expect(RouteParamsSchema.safeParse({ jaar: 'abc', platformId: 'belastingen' }).success).toBe(false);
  });

  it('wijst een niet-canoniek jaar (met decimalen) af', () => {
    expect(RouteParamsSchema.safeParse({ jaar: '2027.5', platformId: 'belastingen' }).success).toBe(false);
  });

  it('wijst een leeg platform-id af (formaat, niet businessregel)', () => {
    expect(RouteParamsSchema.safeParse({ jaar: '2027', platformId: '' }).success).toBe(false);
  });
});
