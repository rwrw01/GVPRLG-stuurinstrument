import type { Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bindKeycloakSub, maakGebruiker } from '@/src/data/gebruikersRepository';
import { prisma } from '@/src/data/prismaClient';
import { koppelLogin } from '@/src/process/loginKoppeling';
import type { AuthEnv } from '@/src/service/env';
import { fail, ok } from '@/src/service/result';

import { maakAuthOptions } from './authOptions';

vi.mock('@/src/process/loginKoppeling', () => ({ koppelLogin: vi.fn() }));

const fakeEnv: AuthEnv = {
  keycloakIssuer: 'http://localhost:8081/realms/gvprlg',
  keycloakClientId: 'gvprlg-app',
  keycloakClientSecret: 'test-client-secret',
  nextauthUrl: 'http://localhost:3000',
  nextauthSecret: 'test-nextauth-secret',
  bootstrapBeheerderEmail: 'beheerder@test.local',
};

const BASE = 'http://localhost:3000';
const profiel = { sub: 'sub-1', email: 'jan@test.local', email_verified: true, name: 'Jan' };

async function redirect(url: string): Promise<string> {
  return maakAuthOptions(fakeEnv).callbacks!.redirect!({ url, baseUrl: BASE });
}

async function signIn(): Promise<string | boolean> {
  return maakAuthOptions(fakeEnv).callbacks!.signIn!({
    user: { id: 'sub-1' },
    account: null,
    profile: profiel,
  });
}

async function jwt(sub: string): Promise<JWT> {
  return maakAuthOptions(fakeEnv).callbacks!.jwt!({
    token: { gebruikerId: '', name: 'Jan', email: 'jan@test.local' },
    user: { id: sub },
    account: { provider: 'keycloak', type: 'oauth', providerAccountId: sub, id_token: 'het-id-token' },
    profile: { sub },
    trigger: 'signIn',
  });
}

beforeEach(() => {
  vi.mocked(koppelLogin).mockReset();
});

afterEach(async () => {
  await prisma.gebruiker.deleteMany();
});

describe('maakAuthOptions', () => {
  it('sessiecookie is httpOnly en sameSite strict', () => {
    const http = maakAuthOptions(fakeEnv).cookies?.sessionToken;
    const https = maakAuthOptions({ ...fakeEnv, nextauthUrl: 'https://gvprlg.example' }).cookies?.sessionToken;

    expect(http).toEqual({
      name: 'next-auth.session-token',
      options: { httpOnly: true, sameSite: 'strict', path: '/', secure: false },
    });
    expect(https).toEqual({
      name: '__Secure-next-auth.session-token',
      options: { httpOnly: true, sameSite: 'strict', path: '/', secure: true },
    });
  });

  it('state- en pkce-cookies zijn niet strict', () => {
    const cookies = maakAuthOptions(fakeEnv).cookies ?? {};

    // Unconfigured cookies fall back to next-auth's defaults, which use sameSite "lax".
    expect(Object.keys(cookies)).toEqual(['sessionToken']);
  });

  it('redirect stuurt eigen paden via doorsturen', async () => {
    expect(await redirect('/metingen/2026?tab=2')).toBe(
      `${BASE}/inloggen/doorsturen?naar=${encodeURIComponent('/metingen/2026?tab=2')}`,
    );
    expect(await redirect(`${BASE}/metingen`)).toBe(`${BASE}/inloggen/doorsturen?naar=%2Fmetingen`);
    // next-auth passes the stored callbackUrl through the callback again on the OAuth callback.
    expect(await redirect(`${BASE}/inloggen/doorsturen?naar=%2Fmetingen`)).toBe(
      `${BASE}/inloggen/doorsturen?naar=%2Fmetingen`,
    );
    expect(await redirect('/inloggen')).toBe(`${BASE}/inloggen/doorsturen?naar=%2F`);
    expect(await redirect('/geen-toegang')).toBe(`${BASE}/inloggen/doorsturen?naar=%2F`);
  });

  it("redirect weigert externe en protocol-relatieve URL's", async () => {
    const naarRoot = `${BASE}/inloggen/doorsturen?naar=%2F`;

    expect(await redirect('https://evil.example')).toBe(naarRoot);
    expect(await redirect('//evil.example')).toBe(naarRoot);
    expect(await redirect(`${BASE}/inloggen/doorsturen?naar=%2F%2Fevil.example`)).toBe(naarRoot);
  });

  it('signIn-callback stuurt een geweigerde login naar /geen-toegang', async () => {
    vi.mocked(koppelLogin).mockResolvedValueOnce(fail('onbekend'));
    expect(await signIn()).toBe('/geen-toegang');
    expect(koppelLogin).toHaveBeenCalledWith(profiel, 'beheerder@test.local');

    vi.spyOn(console, 'error').mockImplementationOnce(() => undefined);
    vi.mocked(koppelLogin).mockRejectedValueOnce(new Error('Unique constraint failed'));
    expect(await signIn()).toBe('/geen-toegang');

    vi.mocked(koppelLogin).mockResolvedValueOnce(
      ok({ id: 'g-1' }) as Awaited<ReturnType<typeof koppelLogin>>,
    );
    expect(await signIn()).toBe(true);
  });

  it('session-callback geeft geen idToken door', async () => {
    const token: JWT = { gebruikerId: 'g-1', idToken: 'geheim-id-token', name: 'Jan', email: 'jan@test.local' };
    const session: Session = { expires: '2026-11-13T20:00:00.000Z', user: { gebruikerId: '', name: null, email: null } };

    const resultaat = await maakAuthOptions(fakeEnv).callbacks!.session!({
      session,
      token,
      user: undefined as never,
      newSession: undefined,
      trigger: 'update',
    });

    expect(resultaat).toEqual({
      expires: '2026-11-13T20:00:00.000Z',
      user: { gebruikerId: 'g-1', name: 'Jan', email: 'jan@test.local' },
    });
    expect(JSON.stringify(resultaat)).not.toContain('geheim-id-token');
  });

  it('jwt-callback zet gebruikerId en idToken bij inloggen', async () => {
    const gebruiker = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller' });
    await bindKeycloakSub(gebruiker.id, 'sub-jwt-1');

    const token = await jwt('sub-jwt-1');

    expect(token.gebruikerId).toBe(gebruiker.id);
    expect(token.idToken).toBe('het-id-token');
  });

  it('jwt-callback weigert een onbekende sub', async () => {
    await expect(jwt('sub-onbekend')).rejects.toThrow('User not found after sign-in');
  });
});
