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
      params: Promise.resolve({ jaar: '2099', platformId: 'belastingen' }),
    });
    expect(response.status).toBe(404);
  });

  it('GET geeft 404 bij een onbekend platform-id (niet 200 met een lege body)', async () => {
    await createMeting(2027);
    const response = await GET(new Request('http://localhost') as unknown as import('next/server').NextRequest, {
      params: Promise.resolve({ jaar: '2027', platformId: 'niet-bestaand' }),
    });
    expect(response.status).toBe(404);
  });

  it('GET geeft 400 (problem+json) bij een niet-canoniek jaar, niet 500 of een andere meting', async () => {
    await createMeting(2027);
    const response = await GET(new Request('http://localhost') as unknown as import('next/server').NextRequest, {
      params: Promise.resolve({ jaar: '2027.5', platformId: 'belastingen' }),
    });
    expect(response.status).toBe(400);
    expect(response.headers.get('Content-Type')).toContain('application/problem+json');
  });

  it('PUT geeft 400 (problem+json) bij een niet-numeriek jaar', async () => {
    const response = await PUT(
      putRequest({ status: 'concept', algemeneToelichting: '', vraagScores: [] }),
      { params: Promise.resolve({ jaar: 'abc', platformId: 'belastingen' }) },
    );
    expect(response.status).toBe(400);
    expect(response.headers.get('Content-Type')).toContain('application/problem+json');
  });

  it('PUT geeft 409 als een al definitieve meting wordt teruggezet of overschreven', async () => {
    const meting = await createMeting(2027);
    const alleVraagIds = CONFIG.assen.flatMap((a) => a.vragen.map((v) => v.id));
    await PUT(
      putRequest({
        status: 'definitief',
        algemeneToelichting: '',
        vraagScores: alleVraagIds.map((id) => ({ vraagId: id, score: 3, toelichting: '' })),
      }),
      { params: Promise.resolve({ jaar: '2027', platformId: 'belastingen' }) },
    );
    const response = await PUT(
      putRequest({ status: 'concept', algemeneToelichting: '', vraagScores: [{ vraagId: 'cloud-data', score: null, toelichting: '' }] }),
      { params: Promise.resolve({ jaar: '2027', platformId: 'belastingen' }) },
    );
    expect(response.status).toBe(409);
    const unchanged = await prisma.vraagScore.findFirst({ where: { vraagId: 'cloud-data' } });
    expect(unchanged?.score).toBe(3);
    void meting;
  });

  it('PUT wijst een onbekende vraagId af', async () => {
    await createMeting(2027);
    const response = await PUT(
      putRequest({ status: 'concept', algemeneToelichting: '', vraagScores: [{ vraagId: 'bogus-vraag', score: 3, toelichting: '' }] }),
      { params: Promise.resolve({ jaar: '2027', platformId: 'belastingen' }) },
    );
    expect(response.status).toBe(400);
  });
});
