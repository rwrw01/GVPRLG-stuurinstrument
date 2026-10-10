import { describe, expect, it } from 'vitest';
import { SavePlatformScoreSchema } from './schemas';

describe('SavePlatformScoreSchema', () => {
  it('accepteert een geldige payload', () => {
    const result = SavePlatformScoreSchema.safeParse({
      status: 'concept',
      algemeneToelichting: 'ok',
      vraagScores: [{ vraagId: 'x', score: 3, toelichting: '' }],
    });
    expect(result.success).toBe(true);
  });

  it('wijst een score buiten 1-5 af', () => {
    const result = SavePlatformScoreSchema.safeParse({
      status: 'concept',
      algemeneToelichting: '',
      vraagScores: [{ vraagId: 'x', score: 10, toelichting: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('wijst een niet-geheel getal als score af', () => {
    const result = SavePlatformScoreSchema.safeParse({
      status: 'concept',
      algemeneToelichting: '',
      vraagScores: [{ vraagId: 'x', score: 3.5, toelichting: '' }],
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
});
