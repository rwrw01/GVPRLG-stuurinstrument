import { afterEach, describe, expect, it, vi } from 'vitest';

import { maakGebruiker, zetKoppelingen, type GebruikerRecord } from '@/src/data/gebruikersRepository';
import { createMeting } from '@/src/data/metingenRepository';
import { prisma } from '@/src/data/prismaClient';
import { mockSessie } from '@/src/integration/auth/_testSessie';

import { GET } from './route';

vi.mock('@/src/integration/auth/sessie', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/integration/auth/sessie')>()),
  vereisGebruiker: vi.fn(),
}));

afterEach(async () => {
  await prisma.auditLogEntry.deleteMany();
  await prisma.platformInvuller.deleteMany();
  await prisma.meting.deleteMany();
  await prisma.gebruiker.deleteMany();
});

async function antwoordVoor(gebruiker: GebruikerRecord): Promise<{ magBewerken: unknown; alleenLezenReden: unknown }> {
  mockSessie(gebruiker);
  const response = await GET(new Request('http://localhost') as unknown as import('next/server').NextRequest, {
    params: Promise.resolve({ jaar: '2027', businessUnitId: 'belastingen' }),
  });
  expect(response.status).toBe(200);
  return response.json();
}

async function magBewerkenVoor(gebruiker: GebruikerRecord): Promise<unknown> {
  return (await antwoordVoor(gebruiker)).magBewerken;
}

async function redenVoor(gebruiker: GebruikerRecord): Promise<unknown> {
  return (await antwoordVoor(gebruiker)).alleenLezenReden;
}

describe('GET /api/metingen/[jaar]/businessunits/[businessUnitId] magBewerken', () => {
  it('should be true for an invuller assigned to the platform of the business unit', async () => {
    const meting = await createMeting(2027);
    const invuller = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller', status: 'actief' });
    await zetKoppelingen(invuller.id, meting.id, ['belastingen']);
    expect(await magBewerkenVoor(invuller)).toBe(true);
  });

  it('should be false for an invuller assigned to another platform only', async () => {
    const meting = await createMeting(2027);
    const invuller = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller', status: 'actief' });
    await zetKoppelingen(invuller.id, meting.id, ['ro']);
    expect(await magBewerkenVoor(invuller)).toBe(false);
  });

  it('should be false for a lezer even with a stray assignment', async () => {
    const meting = await createMeting(2027);
    const lezer = await maakGebruiker({ email: 'lea@test.local', naam: 'Lea', rol: 'lezer', status: 'actief' });
    await prisma.platformInvuller.create({ data: { metingId: meting.id, platformId: 'belastingen', gebruiker: lezer.id } });
    expect(await magBewerkenVoor(lezer)).toBe(false);
  });

  it('should be true for a beheerder without any assignment, like the write check', async () => {
    await createMeting(2027);
    const beheerder = await maakGebruiker({ email: 'bea@test.local', naam: 'Bea', rol: 'beheerder', status: 'actief' });
    expect(await magBewerkenVoor(beheerder)).toBe(true);
    // Reading never writes an audit row, also not for a refused edit right.
    expect(await prisma.auditLogEntry.count()).toBe(0);
  });
});

describe('GET /api/metingen/[jaar]/businessunits/[businessUnitId] alleenLezenReden', () => {
  it('should be rol-lezer for a lezer, also with a stray assignment', async () => {
    const meting = await createMeting(2027);
    const lezer = await maakGebruiker({ email: 'lea@test.local', naam: 'Lea', rol: 'lezer', status: 'actief' });
    await prisma.platformInvuller.create({ data: { metingId: meting.id, platformId: 'belastingen', gebruiker: lezer.id } });
    expect(await redenVoor(lezer)).toBe('rol-lezer');
  });

  it('should be geen-koppeling for an invuller not assigned to the platform', async () => {
    const meting = await createMeting(2027);
    const invuller = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller', status: 'actief' });
    await zetKoppelingen(invuller.id, meting.id, ['ro']);
    expect(await redenVoor(invuller)).toBe('geen-koppeling');
  });

  it('should be null for an invuller assigned to the platform', async () => {
    const meting = await createMeting(2027);
    const invuller = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller', status: 'actief' });
    await zetKoppelingen(invuller.id, meting.id, ['belastingen']);
    expect(await redenVoor(invuller)).toBeNull();
  });

  it('should be null for a beheerder without any assignment', async () => {
    await createMeting(2027);
    const beheerder = await maakGebruiker({ email: 'bea@test.local', naam: 'Bea', rol: 'beheerder', status: 'actief' });
    expect(await redenVoor(beheerder)).toBeNull();
  });
});
