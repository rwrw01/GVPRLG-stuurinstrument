import { describe, expect, it } from 'vitest';
import { GET } from './route';

describe('GET /api/healthz', () => {
  it('geeft altijd 200, zonder database-afhankelijkheid', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });
});
