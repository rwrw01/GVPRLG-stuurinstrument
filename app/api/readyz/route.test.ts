import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/data/prismaClient', () => ({
  prisma: { $queryRaw: vi.fn() },
}));

import { prisma } from '@/src/data/prismaClient';
import { GET } from './route';

describe('GET /api/readyz', () => {
  it('geeft 200 als de database bereikbaar is', async () => {
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ ok: 1 }]);
    const response = await GET();
    expect(response.status).toBe(200);
  });

  it('geeft 503 als de database niet bereikbaar is', async () => {
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('connection refused'));
    const response = await GET();
    expect(response.status).toBe(503);
  });
});
