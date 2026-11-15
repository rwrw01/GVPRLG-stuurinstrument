import type { NextRequest, NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { maakGebruiker, type GebruikerRecord } from '@/src/data/gebruikersRepository';
import { createMeting } from '@/src/data/metingenRepository';
import { prisma } from '@/src/data/prismaClient';
import { mockSessie } from '@/src/integration/auth/_testSessie';
import { herstelCatalogus } from '@/tests/support/catalogus-herstel';
import { bewaarTestScore } from '@/tests/support/score-testdata';

import { POST as asPost } from '../assen/route';
import { PATCH as asPatch } from '../assen/[id]/route';
import { POST as asVerplaats } from '../assen/[id]/verplaats/route';
import { POST as unitPost } from '../businessunits/route';
import { PATCH as unitPatch } from '../businessunits/[id]/route';
import { POST as unitVerplaats } from '../businessunits/[id]/verplaats/route';
import { POST as vrijgeven } from '../metingen/[jaar]/vrijgeven/route';
import { POST as platformPost } from '../platformen/route';
import { PATCH as platformPatch } from '../platformen/[id]/route';
import { POST as platformVerplaats } from '../platformen/[id]/verplaats/route';
import { POST as vraagPost } from '../vragen/route';
import { PATCH as vraagPatch } from '../vragen/[id]/route';
import { POST as vraagVerplaats } from '../vragen/[id]/verplaats/route';
import { GET } from './route';

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
  await prisma.meting.deleteMany();
  await prisma.gebruiker.deleteMany();
  await herstelCatalogus(prisma);
});

function json(body: unknown, method = 'POST'): NextRequest {
  return new Request('http://localhost', { method, body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }) as unknown as NextRequest;
}
const id = (waarde: string) => ({ params: Promise.resolve({ id: waarde }) });
const jaar = (waarde: string) => ({ params: Promise.resolve({ jaar: waarde }) });

type Schrijf = () => Promise<NextResponse>;
const SCHRIJFACTIES: Array<[string, Schrijf]> = [
  ['POST assen', () => asPost(json({ naam: 'X' }))],
  ['PATCH assen', () => asPatch(json({ naam: 'X' }, 'PATCH'), id('mens'))],
  ['verplaats as', () => asVerplaats(json({ richting: 'omlaag' }), id('mens'))],
  ['POST vragen', () => vraagPost(json({ asId: 'mens', kort: 'X', tekst: 'X' }))],
  ['PATCH vragen', () => vraagPatch(json({ tekst: 'X' }, 'PATCH'), id('cloud-data'))],
  ['verplaats vraag', () => vraagVerplaats(json({ richting: 'omlaag' }), id('cloud-data'))],
  ['POST platformen', () => platformPost(json({ naam: 'X' }))],
  ['PATCH platformen', () => platformPatch(json({ naam: 'X' }, 'PATCH'), id('ro'))],
  ['verplaats platform', () => platformVerplaats(json({ richting: 'omlaag' }), id('ro'))],
  ['POST businessunits', () => unitPost(json({ platformId: 'ro', naam: 'X' }))],
  ['PATCH businessunits', () => unitPatch(json({ naam: 'X' }, 'PATCH'), id('ro'))],
  ['verplaats businessunit', () => unitVerplaats(json({ richting: 'omhoog' }), id('ro'))],
  ['vrijgeven', () => vrijgeven(json(undefined), jaar('2027'))],
];

describe('catalogue API access', () => {
  it.each(['invuller', 'lezer'] as const)('should answer 403 to a %s on every write and audit each as a denial', async (rol) => {
    const g = await maakGebruiker({ email: `${rol}@test.local`, naam: rol, rol, status: 'actief' });
    mockSessie(g);
    for (const [naam, actie] of SCHRIJFACTIES) {
      const response = await actie();
      expect(response.status, naam).toBe(403);
      expect(response.headers.get('Content-Type'), naam).toContain('application/problem+json');
    }
    const weigeringen = await prisma.auditLogEntry.findMany({ where: { actie: 'toegang_geweigerd', actor: g.id } });
    expect(weigeringen).toHaveLength(SCHRIJFACTIES.length);
    expect(weigeringen.every((w) => w.detail === 'vereist=beheerder;reden=rol')).toBe(true);
    expect(await prisma.auditLogEntry.count({ where: { actie: { startsWith: 'catalogus_' } } })).toBe(0);
    expect((await prisma.as.findUniqueOrThrow({ where: { id: 'mens' } })).naam).toBe('Mens');
  });

  it('should let any active user read the catalogue with removed items and the year states', async () => {
    mockSessie(await maakGebruiker({ email: 'lea@test.local', naam: 'Lea', rol: 'lezer', status: 'actief' }));
    await prisma.businessUnit.update({ where: { id: 'ro' }, data: { vervallen: true } });
    await createMeting(2027);
    const body = await (await GET()).json();
    expect(body.assen.map((a: { id: string }) => a.id)).toEqual(['techniek', 'mens', 'proces']);
    expect(body.assen[0].vragen[0]).toMatchObject({ id: 'common-ground-standaarden', asId: 'techniek', kort: 'Common Ground', nds: 'Open', vervallen: false });
    expect(body.platformen[1].businessUnits[0]).toMatchObject({ id: 'ro', platformId: 'ro', kleur: '#eb6834', vervallen: true });
    expect(body.metingen).toEqual([{ jaar: 2027, vastgelegd: false, heeftInhoud: false }]);
  });

  it('should answer 401 without a session', async () => {
    mockSessie(null);
    expect((await GET()).status).toBe(401);
    expect((await asPost(json({ naam: 'X' }))).status).toBe(401);
  });
});

describe('catalogue API writes', () => {
  it('should add a question with a generated key and 201, and refuse a short label over 22 characters in Dutch', async () => {
    const response = await vraagPost(json({ asId: 'mens', kort: 'Samenwerking', tekst: 'Er wordt samengewerkt.', nds: 'Open' }));
    expect(response.status).toBe(201);
    const vraag = await response.json();
    expect(vraag).toMatchObject({ asId: 'mens', kort: 'Samenwerking', tekst: 'Er wordt samengewerkt.', nds: 'Open', volgorde: 4, vervallen: false });
    expect(vraag.id).not.toBe('samenwerking');

    const te = await vraagPost(json({ asId: 'mens', kort: 'Een veel te lang kort label', tekst: 'x' }));
    expect(te.status).toBe(400);
    expect((await te.json()).detail).toBe('Het korte label mag maximaal 22 tekens zijn.');
    const leeg = await vraagPatch(json({ tekst: '   ' }, 'PATCH'), id('cloud-data'));
    expect((await leeg.json()).detail).toBe('De vraagtekst mag niet leeg zijn.');
  });

  it('should add an axis and a business unit with the next free colour and move them', async () => {
    const as = await (await asPost(json({ naam: 'Data' }))).json();
    expect(as).toMatchObject({ naam: 'Data', kleur: '#8B4FD8', volgorde: 3 });
    const unit = await (await unitPost(json({ platformId: 'informatievoorziening', naam: 'IV Twee' }))).json();
    expect(unit).toMatchObject({ platformId: 'informatievoorziening', kleur: '#8b5cf6', volgorde: 1 });
    expect((await (await unitVerplaats(json({ richting: 'omhoog' }), id(unit.id))).json()).volgorde).toBe(0);
    expect((await asVerplaats(json({ richting: 'omhoog' }), id(as.id))).status).toBe(200);
    expect((await platformVerplaats(json({ richting: 'sideways' }), id('ro'))).status).toBe(400);
  });

  it('should remove and restore a platform and refuse with 409 one that has active business units', async () => {
    const platform = await (await platformPost(json({ naam: 'Nieuw platform' }))).json();
    expect((await (await platformPatch(json({ vervallen: true }, 'PATCH'), id(platform.id))).json()).vervallen).toBe(true);
    expect((await (await platformPatch(json({ vervallen: false }, 'PATCH'), id(platform.id))).json()).vervallen).toBe(false);
    const geweigerd = await platformPatch(json({ vervallen: true }, 'PATCH'), id('ro'));
    expect(geweigerd.status).toBe(409);
    expect(geweigerd.headers.get('Content-Type')).toContain('application/problem+json');
  });

  it('should answer 404 for an unknown item and 400 for an empty change', async () => {
    expect((await asPatch(json({ naam: 'X' }, 'PATCH'), id('bestaat-niet'))).status).toBe(404);
    const leeg = await unitPatch(json({}, 'PATCH'), id('ro'));
    expect(leeg.status).toBe(400);
    expect((await leeg.json()).detail).toBe('Geef minstens één wijziging op.');
  });

  it('should unfreeze an empty frozen year and refuse one with content', async () => {
    const meting = await createMeting(2027);
    await bewaarTestScore({ metingId: meting.id, jaar: 2027, businessUnitId: 'ro', status: 'concept', algemeneToelichting: '', laatstGewijzigdDoor: 't', vraagScores: [] });
    expect((await vrijgeven(json(undefined), jaar('2027'))).status).toBe(200);
    await bewaarTestScore({ metingId: meting.id, jaar: 2027, businessUnitId: 'ro', status: 'concept', algemeneToelichting: 'Iets', laatstGewijzigdDoor: 't', vraagScores: [] });
    const geweigerd = await vrijgeven(json(undefined), jaar('2027'));
    expect(geweigerd.status).toBe(409);
    expect((await vrijgeven(json(undefined), jaar('abc'))).status).toBe(400);
  });
});
