import { describe, expect, it } from 'vitest';
import { RouteParamsSchema, SaveBusinessUnitScoreSchema } from './schemas';

describe('SaveBusinessUnitScoreSchema', () => {
  it('accepteert een geldige payload', () => {
    const result = SaveBusinessUnitScoreSchema.safeParse({
      status: 'concept',
      algemeneToelichting: 'ok',
      vraagScores: [{ vraagId: 'common-ground-standaarden', score: 3, toelichting: '' }],
    });
    expect(result.success).toBe(true);
  });

  it('wijst een score buiten 1-5 af', () => {
    const result = SaveBusinessUnitScoreSchema.safeParse({
      status: 'concept',
      algemeneToelichting: '',
      vraagScores: [{ vraagId: 'common-ground-standaarden', score: 10, toelichting: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('wijst een niet-geheel getal als score af', () => {
    const result = SaveBusinessUnitScoreSchema.safeParse({
      status: 'concept',
      algemeneToelichting: '',
      vraagScores: [{ vraagId: 'common-ground-standaarden', score: 3.5, toelichting: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('wijst een onbekende status af', () => {
    const result = SaveBusinessUnitScoreSchema.safeParse({
      status: 'onbekend',
      algemeneToelichting: '',
      vraagScores: [],
    });
    expect(result.success).toBe(false);
  });

  it('should accept any well-formed question id; the year list is checked at save time', () => {
    const result = SaveBusinessUnitScoreSchema.safeParse({
      status: 'concept',
      vraagScores: [{ vraagId: 'een-nieuwe-vraag', score: 3, toelichting: '' }],
    });
    expect(result.success).toBe(true);
  });

  it('should refuse the same question twice and an empty question id', () => {
    const dubbel = [1, 2].map((score) => ({ vraagId: 'cloud-data', score, toelichting: '' }));
    expect(SaveBusinessUnitScoreSchema.safeParse({ status: 'concept', vraagScores: dubbel }).success).toBe(false);
    expect(SaveBusinessUnitScoreSchema.safeParse({ status: 'concept', vraagScores: [{ vraagId: '', score: 1 }] }).success).toBe(false);
  });

  it('should default aanwezigen to empty and refuse more than 2000 characters', () => {
    const leeg = SaveBusinessUnitScoreSchema.safeParse({ status: 'concept', vraagScores: [] });
    expect(leeg.success && leeg.data.aanwezigen).toBe('');
    expect(SaveBusinessUnitScoreSchema.safeParse({ status: 'concept', aanwezigen: 'x'.repeat(2001), vraagScores: [] }).success).toBe(false);
  });
});

describe('RouteParamsSchema', () => {
  it('accepteert een geldig jaar en businessunit-id', () => {
    const result = RouteParamsSchema.safeParse({ jaar: '2027', businessUnitId: 'belastingen' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.jaar).toBe(2027);
  });

  it('wijst een niet-numeriek jaar af', () => {
    expect(RouteParamsSchema.safeParse({ jaar: 'abc', businessUnitId: 'belastingen' }).success).toBe(false);
  });

  it('wijst een niet-canoniek jaar (met decimalen) af', () => {
    expect(RouteParamsSchema.safeParse({ jaar: '2027.5', businessUnitId: 'belastingen' }).success).toBe(false);
  });

  it('wijst een leeg businessunit-id af (formaat, niet businessregel)', () => {
    expect(RouteParamsSchema.safeParse({ jaar: '2027', businessUnitId: '' }).success).toBe(false);
  });
});
