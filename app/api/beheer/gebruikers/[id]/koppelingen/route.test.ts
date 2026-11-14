import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/src/data/prismaClient';
import { maakGebruiker, type GebruikerRecord } from '@/src/data/gebruikersRepository';
import { createMeting } from '@/src/data/metingenRepository';
import { mockSessie } from '@/src/integration/auth/_testSessie';

import { PUT } from './route';

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

function put(id: string, body: unknown) {
  const request = new NextRequest(`http://localhost/api/beheer/gebruikers/${id}/koppelingen`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return PUT(request, { params: Promise.resolve({ id }) });
}

describe('PUT /api/beheer/gebruikers/[id]/koppelingen', () => {
  it('zet de platformkoppelingen voor een jaar', async () => {
    await createMeting(2027);

    const response = await put(jan.id, { jaar: 2027, platformIds: ['ro', 'burgerzaken'] });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.toegevoegd.sort()).toEqual(['burgerzaken', 'ro']);
    expect(body.verwijderd).toEqual([]);
    expect(await prisma.auditLogEntry.count({ where: { actie: 'koppeling_toegevoegd' } })).toBe(2);
  });

  it('404 voor een onbekend meetjaar', async () => {
    const response = await put(jan.id, { jaar: 2030, platformIds: ['ro'] });

    expect(response.status).toBe(404);
  });

  it('400 bij een onbekend platform', async () => {
    await createMeting(2027);

    const response = await put(jan.id, { jaar: 2027, platformIds: ['onbekend'] });

    expect(response.status).toBe(400);
  });

  it('should answer 400 with a Dutch problem detail for a lezer with platforms', async () => {
    await createMeting(2027);
    const lea = await maakGebruiker({ email: 'lea@test.local', naam: 'Lea', rol: 'lezer', status: 'actief' });

    const response = await put(lea.id, { jaar: 2027, platformIds: ['ro'] });

    expect(response.status).toBe(400);
    expect(response.headers.get('Content-Type')).toContain('application/problem+json');
    expect((await response.json()).detail).toBe('Een lezer kan niet aan platformen gekoppeld worden.');
    expect(await prisma.platformInvuller.count()).toBe(0);
  });

  it('403 voor invuller', async () => {
    await createMeting(2027);
    mockSessie(jan);

    const response = await put(jan.id, { jaar: 2027, platformIds: ['ro'] });

    expect(response.status).toBe(403);
    expect(await prisma.platformInvuller.count()).toBe(0);
  });
});
