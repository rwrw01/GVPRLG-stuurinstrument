import { getServerSession } from 'next-auth/next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/src/data/prismaClient';
import { maakGebruiker } from '@/src/data/gebruikersRepository';

import { vereisGebruiker } from './sessie';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('./authOptions', () => ({ getAuthOptions: () => ({ providers: [] }) }));

function sessieVoor(gebruikerId: string) {
  return { expires: '2099-01-01T00:00:00.000Z', user: { gebruikerId, name: null, email: null } };
}

afterEach(async () => {
  vi.mocked(getServerSession).mockReset();
  await prisma.auditLogEntry.deleteMany();
  await prisma.gebruiker.deleteMany();
});

describe('vereisGebruiker', () => {
  it('should return 401 problem+json when there is no session', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const resultaat = await vereisGebruiker();
    expect(resultaat.ok).toBe(false);
    if (resultaat.ok) return;
    expect(resultaat.response.status).toBe(401);
    expect(resultaat.response.headers.get('Content-Type')).toContain('application/problem+json');
  });

  it('should return 401 when the session points to a user that no longer exists', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(sessieVoor('verdwenen'));
    const resultaat = await vereisGebruiker();
    expect(resultaat.ok ? 200 : resultaat.response.status).toBe(401);
  });

  it('should return 403 and audit toegang_geweigerd when the user is revoked', async () => {
    const g = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller', status: 'ingetrokken' });
    vi.mocked(getServerSession).mockResolvedValueOnce(sessieVoor(g.id));

    const resultaat = await vereisGebruiker();
    expect(resultaat.ok ? 200 : resultaat.response.status).toBe(403);
    const audit = await prisma.auditLogEntry.findMany({ where: { actie: 'toegang_geweigerd' } });
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ actor: g.id, doelType: 'sessie', doelId: g.id, detail: 'reden=niet-actief;status=ingetrokken' });
  });

  it('should return the user from the database when the session is valid and active', async () => {
    const g = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller', status: 'actief' });
    vi.mocked(getServerSession).mockResolvedValueOnce(sessieVoor(g.id));

    const resultaat = await vereisGebruiker();
    expect(resultaat).toEqual({ ok: true, gebruiker: g });
  });
});
