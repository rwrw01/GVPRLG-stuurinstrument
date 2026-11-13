import type { NextAuthOptions } from 'next-auth';
import KeycloakProvider from 'next-auth/providers/keycloak';

import { vindGebruikerOpSub } from '@/src/data/gebruikersRepository';
import { koppelLogin } from '@/src/process/loginKoppeling';
import { authEnv, type AuthEnv } from '@/src/service/env';

import { veiligDoorstuurPad } from './_doorstuurPad';

const ACHT_UUR = 8 * 60 * 60;
const DOORSTUREN = '/inloggen/doorsturen';
// Paths that must never be a post-login target: they would restart or dead-end the login flow.
const GEEN_DOEL = ['/inloggen', '/geen-toegang'];

/**
 * Name of the session cookie for the given public app URL (secure prefix on https only).
 * @param nextauthUrl - Public base URL of the app (NEXTAUTH_URL)
 * @returns The session cookie name next-auth uses
 */
export function sessieCookieNaam(nextauthUrl: string): string {
  return nextauthUrl.startsWith('https://') ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
}

/**
 * Reduces any redirect URL to a safe same-origin path, unwrapping an earlier doorsturen wrapper.
 * @param url - Absolute or relative URL supplied to next-auth
 * @param baseUrl - Origin of the app
 * @returns A relative path that is safe to send the user to after login
 */
function _doelPad(url: string, baseUrl: string): string {
  const pad = veiligDoorstuurPad(url, baseUrl);
  const doel = new URL(pad, baseUrl);
  if (doel.pathname === DOORSTUREN) return _doelPad(doel.searchParams.get('naar') ?? '/', baseUrl);
  if (GEEN_DOEL.some((p) => doel.pathname === p || doel.pathname.startsWith(`${p}/`))) return '/';
  return pad;
}

/**
 * Builds the next-auth configuration for the Keycloak realm.
 * @param env - Validated auth configuration
 * @returns next-auth options with a strict session cookie and login-to-user mapping
 */
export function maakAuthOptions(env: AuthEnv): NextAuthOptions {
  const veilig = env.nextauthUrl.startsWith('https://');
  return {
    secret: env.nextauthSecret,
    providers: [
      KeycloakProvider({
        clientId: env.keycloakClientId,
        clientSecret: env.keycloakClientSecret,
        issuer: env.keycloakIssuer,
        checks: ['pkce', 'state'],
      }),
    ],
    session: { strategy: 'jwt', maxAge: ACHT_UUR },
    jwt: { maxAge: ACHT_UUR },
    // Only the session cookie is strict; state/PKCE/callbackUrl stay "lax" so they survive the
    // cross-site redirect back from Keycloak.
    cookies: {
      sessionToken: {
        name: sessieCookieNaam(env.nextauthUrl),
        options: { httpOnly: true, sameSite: 'strict', path: '/', secure: veilig },
      },
    },
    pages: { signIn: '/inloggen', error: '/geen-toegang' },
    callbacks: {
      async signIn({ profile }) {
        try {
          const resultaat = await koppelLogin(profile, env.bootstrapBeheerderEmail);
          return resultaat.ok ? true : '/geen-toegang';
        } catch (fout) {
          const melding = fout instanceof Error ? fout.message : String(fout);
          console.error(JSON.stringify({ level: 'error', msg: 'Login mapping failed', error: melding }));
          return '/geen-toegang';
        }
      },
      async jwt({ token, account, profile }) {
        if (!account) return token;
        const gebruiker = profile?.sub ? await vindGebruikerOpSub(profile.sub) : null;
        // Fail closed: next-auth turns this into a redirect to the error page (/geen-toegang).
        if (!gebruiker) throw new Error('User not found after sign-in');
        return { ...token, gebruikerId: gebruiker.id, idToken: account.id_token };
      },
      async session({ session, token }) {
        return {
          expires: session.expires,
          user: { gebruikerId: token.gebruikerId, name: token.name ?? null, email: token.email ?? null },
        };
      },
      async redirect({ url, baseUrl }) {
        return `${baseUrl}${DOORSTUREN}?naar=${encodeURIComponent(_doelPad(url, baseUrl))}`;
      },
    },
  };
}

let gecacht: NextAuthOptions | undefined;

/**
 * Returns the next-auth options built from the process environment, created once per process.
 * @returns The memoised next-auth options
 */
export function getAuthOptions(): NextAuthOptions {
  gecacht ??= maakAuthOptions(authEnv());
  return gecacht;
}
