import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from './prismaClient';
import { createMeting, getMetingByJaar, listMetingen, savePlatformScore } from './metingenRepository';

beforeAll(async () => {
  await prisma.$connect();
});

afterEach(async () => {
  await prisma.vraagScore.deleteMany();
  await prisma.platformScore.deleteMany();
  await prisma.auditLogEntry.deleteMany();
  await prisma.meting.deleteMany();
});

describe('metingenRepository', () => {
  it('maakt een meting aan en vindt die terug op jaar', async () => {
    await createMeting(2027);
    const meting = await getMetingByJaar(2027);
    expect(meting?.jaar).toBe(2027);
    expect(meting?.platformen).toEqual({});
  });

  it('lijst alle metingen, meest recent eerst', async () => {
    await createMeting(2026);
    await createMeting(2027);
    const metingen = await listMetingen();
    expect(metingen.map((m) => m.jaar)).toEqual([2027, 2026]);
  });

  it('slaat een platform-score op en leest die terug met scores per as', async () => {
    const meting = await createMeting(2027);
    await savePlatformScore({
      metingId: meting.id,
      platformId: 'belastingen',
      status: 'concept',
      algemeneToelichting: 'testopmerking',
      laatstGewijzigdDoor: 'test-user@lokaal',
      vraagScores: [
        { vraagId: 'common-ground-standaarden', score: 4, toelichting: 'onderbouwing' },
      ],
    });
    const result = await getMetingByJaar(2027);
    const platform = result?.platformen.belastingen;
    expect(platform?.status).toBe('concept');
    expect(platform?.algemeneToelichting).toBe('testopmerking');
    expect(platform?.scoresPerAs.techniek!['common-ground-standaarden']).toBe(4);
    expect(platform?.toelichtingen['common-ground-standaarden']).toBe('onderbouwing');
  });

  it('overschrijft een bestaande score bij een tweede keer opslaan (upsert, geen duplicaat)', async () => {
    const meting = await createMeting(2027);
    const payload = {
      metingId: meting.id,
      platformId: 'belastingen',
      status: 'concept' as const,
      algemeneToelichting: '',
      laatstGewijzigdDoor: 'test-user@lokaal',
      vraagScores: [{ vraagId: 'common-ground-standaarden', score: 2, toelichting: '' }],
    };
    await savePlatformScore(payload);
    await savePlatformScore({ ...payload, vraagScores: [{ vraagId: 'common-ground-standaarden', score: 5, toelichting: '' }] });
    const result = await getMetingByJaar(2027);
    expect(result?.platformen.belastingen!.scoresPerAs.techniek!['common-ground-standaarden']).toBe(5);
    const count = await prisma.vraagScore.count();
    expect(count).toBe(1);
  });

  it('schrijft een audit-log-regel bij elke platform-save', async () => {
    const meting = await createMeting(2027);
    await savePlatformScore({
      metingId: meting.id,
      platformId: 'belastingen',
      status: 'definitief',
      algemeneToelichting: '',
      laatstGewijzigdDoor: 'test-user@lokaal',
      vraagScores: [],
    });
    const logs = await prisma.auditLogEntry.findMany();
    expect(logs).toHaveLength(1);
    expect(logs[0]!.actie).toBe('platform_afgerond');
    expect(logs[0]!.actor).toBe('test-user@lokaal');
  });
});
