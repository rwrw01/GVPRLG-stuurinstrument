import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/src/data/prismaClient';
import { maakGebruiker, zetKoppelingen, type GebruikerRecord } from '@/src/data/gebruikersRepository';
import { createMeting } from '@/src/data/metingenRepository';
import { bewaarTestScore } from '@/tests/support/score-testdata';
import { mockSessie } from '@/src/integration/auth/_testSessie';
import { STANDAARD_VRAAG_IDS } from '@/tests/support/vragenlijst-testdata';

import { POST } from './route';

vi.mock('@/src/integration/auth/sessie', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/integration/auth/sessie')>()),
  vereisGebruiker: vi.fn(),
}));

const PARAMS = { params: Promise.resolve({ jaar: '2027', businessUnitId: 'belastingen' }) };

let beheerder: GebruikerRecord;

beforeEach(async () => {
  beheerder = await maakGebruiker({ email: 'bea@test.local', naam: 'Bea', rol: 'beheerder', status: 'actief' });
  mockSessie(beheerder);
});

afterEach(async () => {
  await prisma.vraagScore.deleteMany();
  await prisma.businessUnitScore.deleteMany();
  await prisma.auditLogEntry.deleteMany();
  await prisma.platformInvuller.deleteMany();
  await prisma.meting.deleteMany();
  await prisma.gebruiker.deleteMany();
});

function postRequest() {
  return new Request('http://localhost', { method: 'POST' }) as unknown as import('next/server').NextRequest;
}

async function maakPlatform(status: 'concept' | 'definitief') {
  const meting = await createMeting(2027);
  await bewaarTestScore({
    metingId: meting.id,
    jaar: meting.jaar,
    businessUnitId: 'belastingen',
    status,
    algemeneToelichting: '',
    laatstGewijzigdDoor: beheerder.id,
    actorEmail: beheerder.email,
    vraagScores: STANDAARD_VRAAG_IDS.map((id) => ({ vraagId: id, score: 3, toelichting: '' })),
  });
  return meting;
}

async function platformStatus() {
  const score = await prisma.businessUnitScore.findFirst({ where: { businessUnitId: 'belastingen' } });
  return score?.status;
}

describe('POST /api/metingen/[jaar]/businessunits/[businessUnitId]/heropenen', () => {
  it('heropent een definitief platform als beheerder', async () => {
    await maakPlatform('definitief');

    const response = await POST(postRequest(), PARAMS);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(await platformStatus()).toBe('concept');
    const audit = await prisma.auditLogEntry.findMany({ where: { actie: 'platform_heropend' } });
    expect(audit).toHaveLength(1);
    expect(audit[0]?.actor).toBe(beheerder.id);
  });

  it('403 voor invuller', async () => {
    const meting = await maakPlatform('definitief');
    const invuller = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller', status: 'actief' });
    await zetKoppelingen(invuller.id, meting.id, ['belastingen']);
    mockSessie(invuller);

    const response = await POST(postRequest(), PARAMS);

    expect(response.status).toBe(403);
    expect(response.headers.get('Content-Type')).toContain('application/problem+json');
    expect(await platformStatus()).toBe('definitief');
    const audit = await prisma.auditLogEntry.findMany({ where: { actie: 'toegang_geweigerd' } });
    expect(audit).toHaveLength(1);
    expect(audit[0]?.actor).toBe(invuller.id);
    expect(await prisma.auditLogEntry.count({ where: { actie: 'platform_heropend' } })).toBe(0);
  });

  it('should answer 403 to a lezer and keep the platform definitief', async () => {
    await maakPlatform('definitief');
    mockSessie(await maakGebruiker({ email: 'lea@test.local', naam: 'Lea', rol: 'lezer', status: 'actief' }));

    const response = await POST(postRequest(), PARAMS);

    expect(response.status).toBe(403);
    expect(await platformStatus()).toBe('definitief');
    expect(await prisma.auditLogEntry.count({ where: { actie: 'toegang_geweigerd' } })).toBe(1);
  });

  it('409 voor een concept', async () => {
    await maakPlatform('concept');

    const response = await POST(postRequest(), PARAMS);

    expect(response.status).toBe(409);
    expect((await response.json()).title).toBe('Businessunit is niet definitief');
    expect(await platformStatus()).toBe('concept');
  });

  it('401 zonder sessie', async () => {
    await maakPlatform('definitief');
    mockSessie(null);

    const response = await POST(postRequest(), PARAMS);

    expect(response.status).toBe(401);
    expect(await platformStatus()).toBe('definitief');
  });
});
