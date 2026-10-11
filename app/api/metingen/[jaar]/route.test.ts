import { afterEach, describe, expect, it } from 'vitest';
import { prisma } from '@/src/data/prismaClient';
import { createMeting, savePlatformScore } from '@/src/data/metingenRepository';
import { GET } from './route';

afterEach(async () => {
  await prisma.vraagScore.deleteMany();
  await prisma.platformScore.deleteMany();
  await prisma.auditLogEntry.deleteMany();
  await prisma.meting.deleteMany();
});

function call(jaar: string) {
  const request = new Request(`http://localhost/api/metingen/${jaar}`) as unknown as import('next/server').NextRequest;
  return GET(request, { params: Promise.resolve({ jaar }) });
}

describe('GET /api/metingen/{jaar}', () => {
  it('should return the status of every filled-in platform when the meting exists', async () => {
    const meting = await createMeting(2027);
    await savePlatformScore({
      metingId: meting.id, platformId: 'ro', status: 'concept', algemeneToelichting: '',
      laatstGewijzigdDoor: 'test', vraagScores: [{ vraagId: 'cloud-data', score: 3, toelichting: '' }],
    });
    const response = await call('2027');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.meting.jaar).toBe(2027);
    expect(body.meting.platformen.ro.status).toBe('concept');
    expect(body.meting.platformen.ro.scoresPerAs.techniek['cloud-data']).toBe(3);
  });

  it('should return 404 problem+json when the meting does not exist', async () => {
    const response = await call('2099');
    expect(response.status).toBe(404);
    expect(response.headers.get('Content-Type')).toContain('application/problem+json');
  });

  it('should return 400 when the year is not a four-digit number', async () => {
    const response = await call('abc');
    expect(response.status).toBe(400);
  });
});
