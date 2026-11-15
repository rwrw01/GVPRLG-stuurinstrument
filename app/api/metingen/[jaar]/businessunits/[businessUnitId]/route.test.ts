import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/src/data/prismaClient';
import { maakGebruiker, zetKoppelingen, type GebruikerRecord } from '@/src/data/gebruikersRepository';
import { createMeting } from '@/src/data/metingenRepository';
import { mockSessie } from '@/src/integration/auth/_testSessie';
import { herstelCatalogus } from '@/tests/support/catalogus-herstel';
import { STANDAARD_VRAAG_IDS } from '@/tests/support/vragenlijst-testdata';
import { GET, PUT } from './route';

vi.mock('@/src/integration/auth/sessie', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/integration/auth/sessie')>()),
  vereisGebruiker: vi.fn(),
}));

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
  await herstelCatalogus(prisma);
});

const CONCEPT = { status: 'concept', algemeneToelichting: '', vraagScores: [{ vraagId: 'common-ground-standaarden', score: 3, toelichting: '' }] };

function maakInvuller() {
  return maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller', status: 'actief' });
}

function putRequest(body: unknown) {
  return new Request('http://localhost', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as import('next/server').NextRequest;
}

describe('PUT /api/metingen/[jaar]/businessunits/[businessUnitId]', () => {
  it('slaat een concept op, ook als niet alle vragen zijn ingevuld', async () => {
    await createMeting(2027);
    const response = await PUT(
      putRequest({ status: 'concept', algemeneToelichting: '', vraagScores: [{ vraagId: 'common-ground-standaarden', score: 3, toelichting: '' }] }),
      { params: Promise.resolve({ jaar: '2027', businessUnitId: 'belastingen' }) },
    );
    expect(response.status).toBe(200);
  });

  it('geeft 422 bij afronden met ontbrekende vragen', async () => {
    await createMeting(2027);
    const response = await PUT(
      putRequest({ status: 'definitief', algemeneToelichting: '', vraagScores: [{ vraagId: 'common-ground-standaarden', score: 3, toelichting: '' }] }),
      { params: Promise.resolve({ jaar: '2027', businessUnitId: 'belastingen' }) },
    );
    expect(response.status).toBe(422);
  });

  it('rondt af als alle vragen zijn ingevuld', async () => {
    await createMeting(2027);
    const alleVraagIds = STANDAARD_VRAAG_IDS;
    const response = await PUT(
      putRequest({
        status: 'definitief',
        algemeneToelichting: '',
        vraagScores: alleVraagIds.map((id) => ({ vraagId: id, score: 3, toelichting: '' })),
      }),
      { params: Promise.resolve({ jaar: '2027', businessUnitId: 'belastingen' }) },
    );
    expect(response.status).toBe(200);
  });

  it('geeft 404 bij een onbekend platform-id', async () => {
    await createMeting(2027);
    const response = await PUT(
      putRequest({ status: 'concept', algemeneToelichting: '', vraagScores: [] }),
      { params: Promise.resolve({ jaar: '2027', businessUnitId: 'niet-bestaand' }) },
    );
    expect(response.status).toBe(404);
  });

  it('GET geeft 404 voor een niet-bestaand meetjaar', async () => {
    const response = await GET(new Request('http://localhost') as unknown as import('next/server').NextRequest, {
      params: Promise.resolve({ jaar: '2099', businessUnitId: 'belastingen' }),
    });
    expect(response.status).toBe(404);
  });

  it('GET geeft 404 bij een onbekend platform-id (niet 200 met een lege body)', async () => {
    await createMeting(2027);
    const response = await GET(new Request('http://localhost') as unknown as import('next/server').NextRequest, {
      params: Promise.resolve({ jaar: '2027', businessUnitId: 'niet-bestaand' }),
    });
    expect(response.status).toBe(404);
  });

  it('GET geeft 400 (problem+json) bij een niet-canoniek jaar, niet 500 of een andere meting', async () => {
    await createMeting(2027);
    const response = await GET(new Request('http://localhost') as unknown as import('next/server').NextRequest, {
      params: Promise.resolve({ jaar: '2027.5', businessUnitId: 'belastingen' }),
    });
    expect(response.status).toBe(400);
    expect(response.headers.get('Content-Type')).toContain('application/problem+json');
  });

  it('PUT geeft 400 (problem+json) bij een niet-numeriek jaar', async () => {
    const response = await PUT(
      putRequest({ status: 'concept', algemeneToelichting: '', vraagScores: [] }),
      { params: Promise.resolve({ jaar: 'abc', businessUnitId: 'belastingen' }) },
    );
    expect(response.status).toBe(400);
    expect(response.headers.get('Content-Type')).toContain('application/problem+json');
  });

  it('PUT geeft 409 als een al definitieve meting wordt teruggezet of overschreven', async () => {
    const meting = await createMeting(2027);
    const alleVraagIds = STANDAARD_VRAAG_IDS;
    await PUT(
      putRequest({
        status: 'definitief',
        algemeneToelichting: '',
        vraagScores: alleVraagIds.map((id) => ({ vraagId: id, score: 3, toelichting: '' })),
      }),
      { params: Promise.resolve({ jaar: '2027', businessUnitId: 'belastingen' }) },
    );
    const response = await PUT(
      putRequest({ status: 'concept', algemeneToelichting: '', vraagScores: [{ vraagId: 'cloud-data', score: null, toelichting: '' }] }),
      { params: Promise.resolve({ jaar: '2027', businessUnitId: 'belastingen' }) },
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
      { params: Promise.resolve({ jaar: '2027', businessUnitId: 'belastingen' }) },
    );
    expect(response.status).toBe(400);
  });

  it('geeft 401 zonder sessie', async () => {
    await createMeting(2027);
    mockSessie(null);
    const response = await PUT(putRequest(CONCEPT), { params: Promise.resolve({ jaar: '2027', businessUnitId: 'belastingen' }) });
    expect(response.status).toBe(401);
    expect(await prisma.businessUnitScore.count()).toBe(0);
  });

  it('geeft 403 als invuller niet gekoppeld is', async () => {
    const meting = await createMeting(2027);
    const invuller = await maakInvuller();
    await zetKoppelingen(invuller.id, meting.id, ['ro']);
    mockSessie(invuller);

    const response = await PUT(putRequest(CONCEPT), { params: Promise.resolve({ jaar: '2027', businessUnitId: 'belastingen' }) });
    expect(response.status).toBe(403);
    expect(response.headers.get('Content-Type')).toContain('application/problem+json');
    expect(await prisma.businessUnitScore.count()).toBe(0);
    const audit = await prisma.auditLogEntry.findMany({ where: { actie: 'toegang_geweigerd' } });
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      actor: invuller.id,
      doelType: 'platform_score',
      doelId: meting.id,
      detail: 'platform=belastingen;businessunit=belastingen;jaar=2027;reden=geen-koppeling',
    });
  });

  it('should refuse a lezer with 403 alleen-lezen (audited) even with an assignment', async () => {
    const meting = await createMeting(2027);
    const lezer = await maakGebruiker({ email: 'lea@test.local', naam: 'Lea', rol: 'lezer', status: 'actief' });
    // Stray assignment inserted directly: the repository refuses links for a lezer.
    await prisma.platformInvuller.create({ data: { metingId: meting.id, platformId: 'belastingen', gebruiker: lezer.id } });
    mockSessie(lezer);

    const response = await PUT(putRequest(CONCEPT), { params: Promise.resolve({ jaar: '2027', businessUnitId: 'belastingen' }) });
    expect(response.status).toBe(403);
    expect(response.headers.get('Content-Type')).toContain('application/problem+json');
    expect((await response.json()).detail).toContain('alleen leesrechten');
    expect(await prisma.businessUnitScore.count()).toBe(0);
    const audit = await prisma.auditLogEntry.findMany({ where: { actie: 'toegang_geweigerd' } });
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ actor: lezer.id, detail: 'platform=belastingen;businessunit=belastingen;jaar=2027;reden=alleen-lezen' });
  });

  it('should let a lezer read a platform via GET', async () => {
    await createMeting(2027);
    const lezer = await maakGebruiker({ email: 'lea@test.local', naam: 'Lea', rol: 'lezer', status: 'actief' });
    mockSessie(lezer);

    const response = await GET(new Request('http://localhost') as unknown as import('next/server').NextRequest, {
      params: Promise.resolve({ jaar: '2027', businessUnitId: 'belastingen' }),
    });
    expect(response.status).toBe(200);
  });

  it('laat een gekoppelde invuller zijn eigen platform opslaan', async () => {
    const meting = await createMeting(2027);
    const invuller = await maakInvuller();
    await zetKoppelingen(invuller.id, meting.id, ['belastingen']);
    mockSessie(invuller);

    const response = await PUT(putRequest(CONCEPT), { params: Promise.resolve({ jaar: '2027', businessUnitId: 'belastingen' }) });
    expect(response.status).toBe(200);
  });

  it('legt de echte gebruiker vast als laatstGewijzigdDoor', async () => {
    await createMeting(2027);
    const response = await PUT(putRequest(CONCEPT), { params: Promise.resolve({ jaar: '2027', businessUnitId: 'belastingen' }) });
    expect(response.status).toBe(200);

    const score = await prisma.businessUnitScore.findFirst({ where: { businessUnitId: 'belastingen' } });
    expect(score?.laatstGewijzigdDoor).toBe(beheerder.id);
    const audit = await prisma.auditLogEntry.findMany({ where: { actie: 'platform_opgeslagen_concept' } });
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ actor: beheerder.id, detail: 'platform=belastingen;businessunit=belastingen;jaar=2027;email=bea@test.local' });
  });

  it('GET geeft 401 zonder sessie', async () => {
    await createMeting(2027);
    mockSessie(null);
    const response = await GET(new Request('http://localhost') as unknown as import('next/server').NextRequest, {
      params: Promise.resolve({ jaar: '2027', businessUnitId: 'belastingen' }),
    });
    expect(response.status).toBe(401);
  });

  it('should let one invuller fill in a second business unit of the same platform, starting without scores', async () => {
    const tweede = await prisma.businessUnit.create({ data: { platformId: 'informatievoorziening', naam: 'IV Twee', kleur: '#8b5cf6', volgorde: 1 } });
    const meting = await createMeting(2027);
    const invuller = await maakInvuller();
    await zetKoppelingen(invuller.id, meting.id, ['informatievoorziening']);
    mockSessie(invuller);
    const leeg = await GET(new Request('http://localhost') as unknown as import('next/server').NextRequest, { params: Promise.resolve({ jaar: '2027', businessUnitId: tweede.id }) });
    expect(await leeg.json()).toMatchObject({ businessUnit: null, unit: { id: tweede.id, platformId: 'informatievoorziening', naam: 'IV Twee' } });

    for (const id of ['informatievoorziening', tweede.id]) {
      const response = await PUT(putRequest(CONCEPT), { params: Promise.resolve({ jaar: '2027', businessUnitId: id }) });
      expect(response.status).toBe(200);
    }
    expect(await prisma.businessUnitScore.count()).toBe(2);
    const audit = await prisma.auditLogEntry.findFirst({ where: { actie: 'platform_opgeslagen_concept', detail: { contains: tweede.id } } });
    expect(audit?.detail).toBe(`platform=informatievoorziening;businessunit=${tweede.id};jaar=2027;email=jan@test.local`);
  });

  it('should save aanwezigen with a concept and return it on GET', async () => {
    await createMeting(2027);
    const params = { params: Promise.resolve({ jaar: '2027', businessUnitId: 'ro' }) };
    expect((await PUT(putRequest({ ...CONCEPT, aanwezigen: 'Jan, Piet en Klaas' }), params)).status).toBe(200);
    const response = await GET(new Request('http://localhost') as unknown as import('next/server').NextRequest, { params: Promise.resolve({ jaar: '2027', businessUnitId: 'ro' }) });
    expect((await response.json()).businessUnit.aanwezigen).toBe('Jan, Piet en Klaas');
  });

  it('should answer 404 for a business unit that is not in the list of the year', async () => {
    await createMeting(2027);
    await prisma.businessUnit.update({ where: { id: 'ro' }, data: { vervallen: true } });
    const response = await PUT(putRequest(CONCEPT), { params: Promise.resolve({ jaar: '2027', businessUnitId: 'ro' }) });
    expect(response.status).toBe(404);
    expect((await response.json()).title).toBe('Onbekende businessunit');
  });

  it('should refuse with a Dutch 400 a question that is not in the list of the year', async () => {
    await createMeting(2027);
    await prisma.vraag.update({ where: { id: 'cloud-data' }, data: { vervallen: true } });
    const response = await PUT(
      putRequest({ status: 'concept', vraagScores: [{ vraagId: 'cloud-data', score: 3, toelichting: '' }] }),
      { params: Promise.resolve({ jaar: '2027', businessUnitId: 'belastingen' }) },
    );
    expect(response.status).toBe(400);
    expect((await response.json()).detail).toBe('Deze vraag hoort niet bij de vragenlijst van 2027.');
    expect(await prisma.businessUnitScore.count()).toBe(0);
  });
});
