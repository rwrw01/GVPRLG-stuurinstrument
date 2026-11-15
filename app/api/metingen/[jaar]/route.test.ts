import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/src/data/prismaClient';
import { maakGebruiker, zetKoppelingen } from '@/src/data/gebruikersRepository';
import { createMeting } from '@/src/data/metingenRepository';
import { bewaarTestScore } from '@/tests/support/score-testdata';
import { mockSessie } from '@/src/integration/auth/_testSessie';
import { GET } from './route';

vi.mock('@/src/integration/auth/sessie', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/integration/auth/sessie')>()),
  vereisGebruiker: vi.fn(),
}));

beforeEach(async () => {
  mockSessie(await maakGebruiker({ email: 'bea@test.local', naam: 'Bea', rol: 'beheerder', status: 'actief' }));
});

afterEach(async () => {
  await prisma.vraagScore.deleteMany();
  await prisma.businessUnitScore.deleteMany();
  await prisma.auditLogEntry.deleteMany();
  await prisma.platformInvuller.deleteMany();
  await prisma.meting.deleteMany();
  await prisma.gebruiker.deleteMany();
});

function call(jaar: string) {
  const request = new Request(`http://localhost/api/metingen/${jaar}`) as unknown as import('next/server').NextRequest;
  return GET(request, { params: Promise.resolve({ jaar }) });
}

describe('GET /api/metingen/{jaar}', () => {
  it('should return the status of every filled-in business unit when the meting exists', async () => {
    const meting = await createMeting(2027);
    await bewaarTestScore({
      metingId: meting.id, jaar: 2027, businessUnitId: 'ro', status: 'concept', algemeneToelichting: '',
      laatstGewijzigdDoor: 'test', vraagScores: [{ vraagId: 'cloud-data', score: 3, toelichting: '' }],
    });
    const response = await call('2027');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.meting.jaar).toBe(2027);
    expect(body.meting.vastgelegd).toBe(true);
    expect(body.meting.businessUnits.ro.status).toBe('concept');
    expect(body.meting.businessUnits.ro.scoresPerAs.techniek['cloud-data']).toBe(3);
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

  it('geeft 401 zonder sessie', async () => {
    await createMeting(2027);
    mockSessie(null);
    const response = await call('2027');
    expect(response.status).toBe(401);
    expect(response.headers.get('Content-Type')).toContain('application/problem+json');
  });

  it('should say per business unit whether the user may edit it, by the write rule', async () => {
    const meting = await createMeting(2027);
    const invuller = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller', status: 'actief' });
    await zetKoppelingen(invuller.id, meting.id, ['ro']);
    mockSessie(invuller);
    const body = await (await call('2027')).json();
    expect(body.magBewerken).toMatchObject({ ro: true, belastingen: false, burgerzaken: false });
  });

  it('should let a beheerder edit every business unit of the year', async () => {
    await createMeting(2027);
    const body = await (await call('2027')).json();
    expect(Object.values(body.magBewerken).length).toBeGreaterThan(0);
    expect(Object.values(body.magBewerken).every((v) => v === true)).toBe(true);
  });
});
