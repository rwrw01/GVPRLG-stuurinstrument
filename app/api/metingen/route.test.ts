import { afterEach, describe, expect, it } from 'vitest';
import { prisma } from '@/src/data/prismaClient';
import { GET, POST } from './route';

afterEach(async () => {
  await prisma.meting.deleteMany();
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
});

describe('GET /api/metingen', () => {
  it('geeft een lijst metingen terug', async () => {
    await POST(jsonRequest({ jaar: 2027 }));
    const response = await GET();
    const data = await response.json();
    expect(data.metingen).toHaveLength(1);
  });
});
