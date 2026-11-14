import { getServerSession } from 'next-auth/next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/src/data/prismaClient';
import { maakGebruiker } from '@/src/data/gebruikersRepository';
import { createMeting, savePlatformScore } from '@/src/data/metingenRepository';

import { GET } from './route';

// The real session guard runs; only the next-auth session lookup is replaced.
vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/src/integration/auth/authOptions', () => ({ getAuthOptions: () => ({ providers: [] }) }));

function sessieVoor(gebruikerId: string) {
  return { expires: '2099-01-01T00:00:00.000Z', user: { gebruikerId, name: null, email: null } };
}

afterEach(async () => {
  vi.mocked(getServerSession).mockReset();
  await prisma.vraagScore.deleteMany();
  await prisma.platformScore.deleteMany();
  await prisma.auditLogEntry.deleteMany();
  await prisma.meting.deleteMany();
  await prisma.gebruiker.deleteMany();
});

describe('GET /api/overzicht', () => {
  it('should return the years, statuses and the opening sentence for an active lezer', async () => {
    const lezer = await maakGebruiker({ email: 'lies@test.local', naam: 'Lies', rol: 'lezer', status: 'actief' });
    vi.mocked(getServerSession).mockResolvedValue(sessieVoor(lezer.id));
    const meting = await createMeting(2027);
    await createMeting(2026);
    await savePlatformScore({
      metingId: meting.id, jaar: 2027, platformId: 'ro', status: 'definitief', algemeneToelichting: '',
      laatstGewijzigdDoor: 'test', vraagScores: [{ vraagId: 'capaciteit-kennis', score: 3, toelichting: '' }],
    });

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.jaren.map((j: { jaar: number }) => j.jaar)).toEqual([2026, 2027]);
    const ro = body.jaren[1].platformen.find((p: { platformId: string }) => p.platformId === 'ro');
    expect(ro).toEqual({ platformId: 'ro', status: 'definitief', perAs: { techniek: null, mens: 3, proces: null }, totaal: 3, beantwoord: 1 });
    expect(body.jaren[1].voortgang).toBe('1/5');
    expect(body.openingszin).toBe('In 2027 staat het gemiddelde op 3,0 over 1 definitief platform.');
    expect(Array.isArray(body.gespreksonderwerpen)).toBe(true);
  });

  it('should return 401 problem+json without a session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(response.headers.get('Content-Type')).toContain('application/problem+json');
  });

  it('should return 403 problem+json when the user is not active', async () => {
    const g = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller', status: 'ingetrokken' });
    vi.mocked(getServerSession).mockResolvedValue(sessieVoor(g.id));
    const response = await GET();
    expect(response.status).toBe(403);
    expect(response.headers.get('Content-Type')).toContain('application/problem+json');
  });
});
