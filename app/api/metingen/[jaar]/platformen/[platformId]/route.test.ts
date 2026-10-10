import { afterEach, describe, expect, it } from 'vitest';
import { prisma } from '@/src/data/prismaClient';
import { createMeting } from '@/src/data/metingenRepository';
import { CONFIG } from '@/src/service/config';
import { GET, PUT } from './route';

afterEach(async () => {
  await prisma.vraagScore.deleteMany();
  await prisma.platformScore.deleteMany();
  await prisma.auditLogEntry.deleteMany();
  await prisma.meting.deleteMany();
});

function putRequest(body: unknown) {
  return new Request('http://localhost', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as import('next/server').NextRequest;
}

describe('PUT /api/metingen/[jaar]/platformen/[platformId]', () => {
  it('slaat een concept op, ook als niet alle vragen zijn ingevuld', async () => {
    await createMeting(2027);
    const response = await PUT(
      putRequest({ status: 'concept', algemeneToelichting: '', vraagScores: [{ vraagId: 'common-ground-standaarden', score: 3, toelichting: '' }] }),
      { params: Promise.resolve({ jaar: '2027', platformId: 'belastingen' }) },
    );
    expect(response.status).toBe(200);
  });

  it('geeft 422 bij afronden met ontbrekende vragen', async () => {
    await createMeting(2027);
    const response = await PUT(
      putRequest({ status: 'definitief', algemeneToelichting: '', vraagScores: [{ vraagId: 'common-ground-standaarden', score: 3, toelichting: '' }] }),
      { params: Promise.resolve({ jaar: '2027', platformId: 'belastingen' }) },
    );
    expect(response.status).toBe(422);
  });

  it('rondt af als alle vragen zijn ingevuld', async () => {
    await createMeting(2027);
    const alleVraagIds = CONFIG.assen.flatMap((a) => a.vragen.map((v) => v.id));
    const response = await PUT(
      putRequest({
        status: 'definitief',
        algemeneToelichting: '',
        vraagScores: alleVraagIds.map((id) => ({ vraagId: id, score: 3, toelichting: '' })),
      }),
      { params: Promise.resolve({ jaar: '2027', platformId: 'belastingen' }) },
    );
    expect(response.status).toBe(200);
  });

  it('geeft 404 bij een onbekend platform-id', async () => {
    await createMeting(2027);
    const response = await PUT(
      putRequest({ status: 'concept', algemeneToelichting: '', vraagScores: [] }),
      { params: Promise.resolve({ jaar: '2027', platformId: 'niet-bestaand' }) },
    );
    expect(response.status).toBe(404);
  });

  it('GET geeft 404 voor een niet-bestaand meetjaar', async () => {
    const response = await GET(new Request('http://localhost') as unknown as import('next/server').NextRequest, {
      params: Promise.resolve({ jaar: '1999', platformId: 'belastingen' }),
    });
    expect(response.status).toBe(404);
  });
});
