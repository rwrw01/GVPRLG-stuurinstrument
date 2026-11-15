import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { maakGebruiker } from '@/src/data/gebruikersRepository';
import { createMeting } from '@/src/data/metingenRepository';
import { prisma } from '@/src/data/prismaClient';
import { mockSessie } from '@/src/integration/auth/_testSessie';
import { herstelCatalogus } from '@/tests/support/catalogus-herstel';
import { bewaarTestScore } from '@/tests/support/score-testdata';
import { standaardLijst } from '@/tests/support/vragenlijst-testdata';

import { GET } from './route';

vi.mock('@/src/integration/auth/sessie', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/integration/auth/sessie')>()),
  vereisGebruiker: vi.fn(),
}));

beforeEach(async () => {
  mockSessie(await maakGebruiker({ email: 'lea@test.local', naam: 'Lea', rol: 'lezer', status: 'actief' }));
});

afterEach(async () => {
  await prisma.vraagScore.deleteMany();
  await prisma.businessUnitScore.deleteMany();
  await prisma.auditLogEntry.deleteMany();
  await prisma.meting.deleteMany();
  await prisma.gebruiker.deleteMany();
  await herstelCatalogus(prisma);
});

function call(jaar: string) {
  return GET(new Request(`http://localhost/api/metingen/${jaar}/vragenlijst`) as unknown as import('next/server').NextRequest, { params: Promise.resolve({ jaar }) });
}

describe('GET /api/metingen/{jaar}/vragenlijst', () => {
  it('should give any active user the catalogue for an open year and the copy for a frozen year', async () => {
    const vast = await createMeting(2026);
    await createMeting(2027);
    await bewaarTestScore({ metingId: vast.id, jaar: 2026, businessUnitId: 'ro', status: 'concept', algemeneToelichting: '', laatstGewijzigdDoor: 't', vraagScores: [] });
    await prisma.as.update({ where: { id: 'mens' }, data: { naam: 'Mensen' } });

    const open = await (await call('2027')).json();
    const frozen = await (await call('2026')).json();
    expect(open.vragenlijst.vastgelegd).toBe(false);
    expect(open.vragenlijst.assen[1].naam).toBe('Mensen');
    expect(frozen.vragenlijst).toEqual(standaardLijst(2026, true));
  });

  it('should answer 404 problem+json for a year without meting and 400 for an invalid year', async () => {
    const response = await call('2099');
    expect(response.status).toBe(404);
    expect(response.headers.get('Content-Type')).toContain('application/problem+json');
    expect((await call('20x7')).status).toBe(400);
  });

  it('should answer 401 without a session', async () => {
    await createMeting(2027);
    mockSessie(null);
    expect((await call('2027')).status).toBe(401);
  });
});
