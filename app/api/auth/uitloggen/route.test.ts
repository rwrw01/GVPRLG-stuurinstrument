import { encode } from 'next-auth/jwt';
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/src/data/prismaClient';
import type { AuthEnv } from '@/src/service/env';

import { GET } from './route';

const fakeEnv: AuthEnv = {
  keycloakIssuer: 'http://localhost:8081/realms/gvprlg',
  keycloakClientId: 'gvprlg-app',
  keycloakClientSecret: 'test-client-secret',
  // Trailing slash on purpose: the post-logout URI must still be exactly "<origin>/".
  nextauthUrl: 'http://localhost:3000/',
  nextauthSecret: 'test-nextauth-secret',
  bootstrapBeheerderEmail: 'beheerder@test.local',
};

vi.mock('@/src/service/env', () => ({ authEnv: () => fakeEnv }));

const COOKIE = 'next-auth.session-token';
const EIND_SESSIE = 'http://localhost:8081/realms/gvprlg/protocol/openid-connect/logout';

function verzoek(cookies: Record<string, string>): NextRequest {
  const cookie = Object.entries(cookies)
    .map(([naam, waarde]) => `${naam}=${waarde}`)
    .join('; ');
  return new NextRequest('http://localhost:3000/api/auth/uitloggen', { headers: { cookie } });
}

function verlopenCookies(response: Response): string[] {
  return response.headers.getSetCookie().filter((c) => /Max-Age=0/i.test(c));
}

afterEach(async () => {
  await prisma.auditLogEntry.deleteMany();
});

describe('GET /api/auth/uitloggen', () => {
  it('should end the Keycloak session with id_token_hint and audit the logout when a session exists', async () => {
    const token = await encode({ token: { gebruikerId: 'g-1', idToken: 'het-id-token' }, secret: fakeEnv.nextauthSecret });

    const response = await GET(verzoek({ [COOKIE]: token }));

    const doel = new URL(response.headers.get('location') ?? '');
    expect(response.status).toBe(302);
    expect(`${doel.origin}${doel.pathname}`).toBe(EIND_SESSIE);
    expect(doel.searchParams.get('id_token_hint')).toBe('het-id-token');
    expect(doel.searchParams.get('client_id')).toBe('gvprlg-app');
    expect(doel.searchParams.get('post_logout_redirect_uri')).toBe('http://localhost:3000/');
    expect(await prisma.auditLogEntry.count({ where: { actie: 'uitgelogd', actor: 'g-1' } })).toBe(1);
  });

  it('should still end the Keycloak session without an app token', async () => {
    const response = await GET(verzoek({}));

    const doel = new URL(response.headers.get('location') ?? '');
    expect(response.status).toBe(302);
    expect(`${doel.origin}${doel.pathname}`).toBe(EIND_SESSIE);
    expect(doel.searchParams.has('id_token_hint')).toBe(false);
    expect(doel.searchParams.get('client_id')).toBe('gvprlg-app');
    expect(doel.searchParams.get('post_logout_redirect_uri')).toBe('http://localhost:3000/');
  });

  it('should expire every chunk of a chunked session cookie', async () => {
    const response = await GET(verzoek({ [`${COOKIE}.0`]: 'deel-a', [`${COOKIE}.1`]: 'deel-b', andere: 'x' }));

    const verlopen = verlopenCookies(response);
    expect(verlopen.map((c) => c.split('=')[0]).sort()).toEqual([COOKIE, `${COOKIE}.0`, `${COOKIE}.1`]);
    for (const cookie of verlopen) {
      expect(cookie).toMatch(/Path=\//);
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Strict/i);
    }
  });
});
