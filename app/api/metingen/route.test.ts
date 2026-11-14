import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/src/data/prismaClient';
import { maakGebruiker } from '@/src/data/gebruikersRepository';
import { mockSessie } from '@/src/integration/auth/_testSessie';
import { GET, POST } from './route';

vi.mock('@/src/integration/auth/sessie', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/integration/auth/sessie')>()),
  vereisGebruiker: vi.fn(),
}));

beforeEach(async () => {
  mockSessie(await maakGebruiker({ email: 'bea@test.local', naam: 'Bea', rol: 'beheerder', status: 'actief' }));
});

afterEach(async () => {
  await prisma.auditLogEntry.deleteMany();
  await prisma.meting.deleteMany();
  await prisma.gebruiker.deleteMany();
});

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/metingen', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as import('next/server').NextRequest;
}

describe('POST /api/metingen', () => {
  it('maakt een meting aan en geeft 201', async () => {
    const response = await POST(jsonRequest({ jaar: 2027 }));
    expect(response.status).toBe(201);
  });

  it('geeft 409 bij een dubbel jaar', async () => {
    await POST(jsonRequest({ jaar: 2027 }));
    const response = await POST(jsonRequest({ jaar: 2027 }));
    expect(response.status).toBe(409);
    expect(response.headers.get('Content-Type')).toContain('application/problem+json');
  });

  it('geeft 400 bij een ongeldig jaar', async () => {
    const response = await POST(jsonRequest({ jaar: 'niet-een-getal' }));
    expect(response.status).toBe(400);
  });

  it('geeft 401 zonder sessie', async () => {
    mockSessie(null);
    const response = await POST(jsonRequest({ jaar: 2027 }));
    expect(response.status).toBe(401);
    expect(response.headers.get('Content-Type')).toContain('application/problem+json');
    expect(await prisma.meting.count()).toBe(0);
  });

  it('geeft 403 voor een invuller', async () => {
    const invuller = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller', status: 'actief' });
    mockSessie(invuller);
    const response = await POST(jsonRequest({ jaar: 2027 }));
    expect(response.status).toBe(403);
    expect(response.headers.get('Content-Type')).toContain('application/problem+json');
    expect(await prisma.meting.count()).toBe(0);
    const audit = await prisma.auditLogEntry.findMany({ where: { actie: 'toegang_geweigerd' } });
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ actor: invuller.id, doelType: 'rol', doelId: invuller.id, detail: 'vereist=beheerder;reden=rol' });
  });
});

describe('POST /api/metingen as lezer', () => {
  it('should answer 403 to a lezer without creating a meting', async () => {
    mockSessie(await maakGebruiker({ email: 'lea@test.local', naam: 'Lea', rol: 'lezer', status: 'actief' }));
    const response = await POST(jsonRequest({ jaar: 2027 }));
    expect(response.status).toBe(403);
    expect(await prisma.meting.count()).toBe(0);
    expect(await prisma.auditLogEntry.count({ where: { actie: 'toegang_geweigerd' } })).toBe(1);
  });
});

describe('GET /api/metingen', () => {
  it('geeft een lijst metingen terug', async () => {
    await POST(jsonRequest({ jaar: 2027 }));
    const response = await GET();
    const data = await response.json();
    expect(data.metingen).toHaveLength(1);
  });

  it('geeft 401 zonder sessie', async () => {
    mockSessie(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });
});
