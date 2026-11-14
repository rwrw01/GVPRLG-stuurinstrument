import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/src/data/prismaClient';
import { bindKeycloakSub, maakGebruiker, zetKoppelingen, type GebruikerRecord } from '@/src/data/gebruikersRepository';
import { createMeting } from '@/src/data/metingenRepository';
import { mockSessie } from '@/src/integration/auth/_testSessie';

import { GET, POST } from './route';

vi.mock('@/src/integration/auth/sessie', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/integration/auth/sessie')>()),
  vereisGebruiker: vi.fn(),
}));

const URL_BASIS = 'http://localhost/api/beheer/gebruikers';
const NIEUW = { email: 'Jan@Test.local', naam: 'Jan', rol: 'invuller', jaar: 2027, platformIds: ['ro'] };

let beheerder: GebruikerRecord;

beforeEach(async () => {
  beheerder = await maakGebruiker({ email: 'bea@test.local', naam: 'Bea', rol: 'beheerder', status: 'actief' });
  mockSessie(beheerder);
});

afterEach(async () => {
  await prisma.auditLogEntry.deleteMany();
  await prisma.platformInvuller.deleteMany();
  await prisma.meting.deleteMany();
  await prisma.gebruiker.deleteMany();
});

function postRequest(body: unknown): NextRequest {
  return new NextRequest(URL_BASIS, { method: 'POST', body: JSON.stringify(body) });
}

async function invullerSessie(): Promise<void> {
  mockSessie(await maakGebruiker({ email: 'ina@test.local', naam: 'Ina', rol: 'invuller', status: 'actief' }));
}

describe('GET /api/beheer/gebruikers', () => {
  it('geeft gebruikers met koppelingen zonder keycloakSub', async () => {
    const meting = await createMeting(2027);
    const jan = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller' });
    await bindKeycloakSub(jan.id, 'sub-jan');
    await zetKoppelingen(jan.id, meting.id, ['ro']);

    const response = await GET(new NextRequest(`${URL_BASIS}?jaar=2027`));

    expect(response.status).toBe(200);
    const { gebruikers } = await response.json();
    expect(gebruikers).toHaveLength(2);
    const janDto = gebruikers.find((g: { id: string }) => g.id === jan.id);
    expect(janDto).toMatchObject({ email: 'jan@test.local', rol: 'invuller', status: 'actief', gekoppeld: true, platformIds: ['ro'] });
    expect(janDto).not.toHaveProperty('keycloakSub');
  });

  it('400 zonder geldig jaar', async () => {
    const response = await GET(new NextRequest(`${URL_BASIS}?jaar=abc`));

    expect(response.status).toBe(400);
  });

  it('403 voor invuller', async () => {
    await invullerSessie();

    const response = await GET(new NextRequest(`${URL_BASIS}?jaar=2027`));

    expect(response.status).toBe(403);
    expect(await prisma.auditLogEntry.count({ where: { actie: 'toegang_geweigerd' } })).toBe(1);
  });
});

describe('POST /api/beheer/gebruikers', () => {
  it('voegt een voorzitter toe', async () => {
    await createMeting(2027);

    const response = await POST(postRequest(NIEUW));

    expect(response.status).toBe(201);
    const { gebruiker } = await response.json();
    expect(gebruiker).toMatchObject({ email: 'jan@test.local', status: 'uitgenodigd', gekoppeld: false, platformIds: ['ro'] });
    expect(gebruiker).not.toHaveProperty('keycloakSub');
    expect(await prisma.auditLogEntry.count({ where: { actie: 'gebruiker_toegevoegd' } })).toBe(1);
  });

  it('409 voor een bestaand e-mailadres', async () => {
    await createMeting(2027);
    await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller' });

    const response = await POST(postRequest(NIEUW));

    expect(response.status).toBe(409);
    expect(response.headers.get('Content-Type')).toContain('application/problem+json');
  });

  it('404 voor een onbekend meetjaar', async () => {
    const response = await POST(postRequest(NIEUW));

    expect(response.status).toBe(404);
  });

  it('400 bij ongeldige invoer', async () => {
    const response = await POST(postRequest({ ...NIEUW, platformIds: ['onbekend'] }));

    expect(response.status).toBe(400);
    expect((await response.json()).title).toBe('Ongeldige invoer');
  });

  it('should answer 400 for a lezer with platformIds', async () => {
    await createMeting(2027);

    const response = await POST(postRequest({ ...NIEUW, rol: 'lezer' }));

    expect(response.status).toBe(400);
    expect((await response.json()).detail).toBe('Een lezer kan niet aan platformen gekoppeld worden.');
    expect(await prisma.gebruiker.count({ where: { email: 'jan@test.local' } })).toBe(0);
  });

  it('should add a lezer without platformIds', async () => {
    await createMeting(2027);

    const response = await POST(postRequest({ ...NIEUW, rol: 'lezer', platformIds: [] }));

    expect(response.status).toBe(201);
    expect((await response.json()).gebruiker).toMatchObject({ rol: 'lezer', platformIds: [] });
  });

  it('403 voor invuller', async () => {
    await createMeting(2027);
    await invullerSessie();

    const response = await POST(postRequest(NIEUW));

    expect(response.status).toBe(403);
    expect(await prisma.gebruiker.count({ where: { email: 'jan@test.local' } })).toBe(0);
  });
});
