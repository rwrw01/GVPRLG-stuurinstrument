import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/src/data/prismaClient';
import { maakGebruiker, vindGebruikerOpId, zetKoppelingen, type GebruikerRecord } from '@/src/data/gebruikersRepository';
import { createMeting } from '@/src/data/metingenRepository';
import { mockSessie } from '@/src/integration/auth/_testSessie';

import { PATCH } from './route';

vi.mock('@/src/integration/auth/sessie', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/integration/auth/sessie')>()),
  vereisGebruiker: vi.fn(),
}));

let beheerder: GebruikerRecord;
let jan: GebruikerRecord;

beforeEach(async () => {
  beheerder = await maakGebruiker({ email: 'bea@test.local', naam: 'Bea', rol: 'beheerder', status: 'actief' });
  jan = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller', status: 'actief' });
  mockSessie(beheerder);
});

afterEach(async () => {
  await prisma.auditLogEntry.deleteMany();
  await prisma.platformInvuller.deleteMany();
  await prisma.meting.deleteMany();
  await prisma.gebruiker.deleteMany();
});

function patch(id: string, body: unknown) {
  const request = new NextRequest(`http://localhost/api/beheer/gebruikers/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  return PATCH(request, { params: Promise.resolve({ id }) });
}

describe('PATCH /api/beheer/gebruikers/[id]', () => {
  it('trekt de toegang van een gebruiker in', async () => {
    const response = await patch(jan.id, { actie: 'intrekken' });

    expect(response.status).toBe(200);
    const { gebruiker } = await response.json();
    expect(gebruiker).toMatchObject({ id: jan.id, status: 'ingetrokken' });
    expect(gebruiker).not.toHaveProperty('keycloakSub');
    expect(await prisma.auditLogEntry.count({ where: { actie: 'toegang_ingetrokken' } })).toBe(1);
  });

  it('409 als een beheerder zichzelf degradeert', async () => {
    const response = await patch(beheerder.id, { actie: 'rol', rol: 'invuller' });

    expect(response.status).toBe(409);
    expect(await vindGebruikerOpId(beheerder.id)).toMatchObject({ rol: 'beheerder' });
  });

  it('should make a user lezer and remove his assignments', async () => {
    const meting = await createMeting(2027);
    await zetKoppelingen(jan.id, meting.id, ['ro', 'belastingen']);

    const response = await patch(jan.id, { actie: 'rol', rol: 'lezer' });

    expect(response.status).toBe(200);
    expect((await response.json()).gebruiker).toMatchObject({ id: jan.id, rol: 'lezer' });
    expect(await prisma.platformInvuller.count({ where: { gebruiker: jan.id } })).toBe(0);
    const audit = await prisma.auditLogEntry.findFirst({ where: { actie: 'rol_gewijzigd' } });
    expect(audit?.detail).toContain('koppelingenVerwijderd=2');
  });

  it('should answer 400 for an unknown rol', async () => {
    const response = await patch(jan.id, { actie: 'rol', rol: 'kijker' });

    expect(response.status).toBe(400);
  });

  it('404 voor een onbekende gebruiker', async () => {
    const response = await patch('bestaat-niet', { actie: 'intrekken' });

    expect(response.status).toBe(404);
  });

  it('400 bij een onbekende actie', async () => {
    const response = await patch(jan.id, { actie: 'verwijderen' });

    expect(response.status).toBe(400);
  });

  it('403 voor invuller', async () => {
    mockSessie(jan);

    const response = await patch(beheerder.id, { actie: 'intrekken' });

    expect(response.status).toBe(403);
    expect(await vindGebruikerOpId(beheerder.id)).toMatchObject({ status: 'actief' });
  });
});
