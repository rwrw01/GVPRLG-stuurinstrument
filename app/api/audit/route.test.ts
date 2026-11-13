import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/src/data/prismaClient';
import { platformDetail, schrijfAudit } from '@/src/data/auditRepository';
import { maakGebruiker, zetKoppelingen, type GebruikerRecord } from '@/src/data/gebruikersRepository';
import { createMeting } from '@/src/data/metingenRepository';
import { mockSessie } from '@/src/integration/auth/_testSessie';

import { GET } from './route';

vi.mock('@/src/integration/auth/sessie', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/integration/auth/sessie')>()),
  vereisGebruiker: vi.fn(),
}));

let beheerder: GebruikerRecord;
let jan: GebruikerRecord;

beforeEach(async () => {
  beheerder = await maakGebruiker({ email: 'bea@test.local', naam: 'Bea', rol: 'beheerder', status: 'actief' });
  jan = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller', status: 'actief' });
  for (const platformId of ['ro', 'belastingen']) {
    await schrijfAudit({
      actor: beheerder.id,
      actie: 'platform_heropend',
      doelType: 'platform_score',
      doelId: 'meting',
      detail: platformDetail(platformId, 2027),
    });
  }
  await schrijfAudit({
    actor: beheerder.id,
    actie: 'gebruiker_toegevoegd',
    doelType: 'gebruiker',
    doelId: jan.id,
    detail: 'email=jan@test.local;rol=invuller',
  });
  mockSessie(beheerder);
});

afterEach(async () => {
  await prisma.auditLogEntry.deleteMany();
  await prisma.platformInvuller.deleteMany();
  await prisma.meting.deleteMany();
  await prisma.gebruiker.deleteMany();
});

async function regels(query = ''): Promise<Array<{ actie: string; detail: string }>> {
  const response = await GET(new NextRequest(`http://localhost/api/audit${query}`));
  expect(response.status).toBe(200);
  return (await response.json()).regels;
}

describe('GET /api/audit', () => {
  it('geeft een beheerder alle regels en filtert op actie', async () => {
    expect(await regels()).toHaveLength(3);
    expect(await regels('?actie=gebruiker_toegevoegd')).toHaveLength(1);
    expect(await regels('?platformId=ro')).toHaveLength(1);
  });

  it('invuller ziet geen regels van andere platformen', async () => {
    // Assigned in another year: an invuller sees his platforms' history across all years.
    const meting = await createMeting(2026);
    await zetKoppelingen(jan.id, meting.id, ['ro']);
    mockSessie(jan);

    const zichtbaar = await regels();
    const andere = await regels('?platformId=belastingen');

    expect(zichtbaar.map((r) => r.detail)).toEqual([platformDetail('ro', 2027)]);
    expect(andere.map((r) => r.detail)).toEqual([platformDetail('ro', 2027)]);
  });

  it('invuller zonder koppeling ziet niets', async () => {
    mockSessie(jan);

    expect(await regels()).toEqual([]);
  });

  it('geeft naam en e-mail van een bekende actor en null voor een onbekende', async () => {
    await schrijfAudit({ actor: 'onbekend', actie: 'toegang_geweigerd', doelType: 'sessie', doelId: '-', detail: 'x' });

    const response = await GET(new NextRequest('http://localhost/api/audit'));
    const body: { regels: Array<Record<string, unknown>> } = await response.json();
    const bekend = body.regels.find((r) => r.actie === 'gebruiker_toegevoegd');
    const onbekend = body.regels.find((r) => r.actor === 'onbekend');

    expect(bekend).toMatchObject({ actor: beheerder.id, actorNaam: 'Bea', actorEmail: 'bea@test.local' });
    expect(onbekend).toMatchObject({ actorNaam: null, actorEmail: null });
    expect(body.regels.every((r) => !('keycloakSub' in r))).toBe(true);
  });

  it('400 bij limiet 0', async () => {
    const response = await GET(new NextRequest('http://localhost/api/audit?limiet=0'));

    expect(response.status).toBe(400);
  });

  it('401 zonder sessie', async () => {
    mockSessie(null);

    const response = await GET(new NextRequest('http://localhost/api/audit'));

    expect(response.status).toBe(401);
  });
});
