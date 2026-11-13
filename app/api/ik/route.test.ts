import { afterEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/src/data/prismaClient';
import { maakGebruiker } from '@/src/data/gebruikersRepository';
import { mockSessie } from '@/src/integration/auth/_testSessie';

import { GET } from './route';

vi.mock('@/src/integration/auth/sessie', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/integration/auth/sessie')>()),
  vereisGebruiker: vi.fn(),
}));

afterEach(async () => {
  await prisma.auditLogEntry.deleteMany();
  await prisma.gebruiker.deleteMany();
});

describe('GET /api/ik', () => {
  it('geeft id, naam, e-mail en rol van de ingelogde gebruiker', async () => {
    const jan = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller', status: 'actief' });
    mockSessie(jan);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: jan.id, naam: 'Jan', email: 'jan@test.local', rol: 'invuller' });
  });

  it('401 zonder sessie', async () => {
    mockSessie(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(response.headers.get('Content-Type')).toContain('application/problem+json');
  });
});
