import { getToken } from 'next-auth/jwt';
import { NextResponse, type NextRequest } from 'next/server';

import { schrijfAudit } from '@/src/data/auditRepository';
import { sessieCookieNaam } from '@/src/integration/auth/authOptions';
import { authEnv, type AuthEnv } from '@/src/service/env';

/**
 * Builds the Keycloak RP-initiated logout URL that returns the user to the app root.
 * @param env - Validated auth configuration
 * @param idToken - ID token of the session, used as `id_token_hint` when present
 * @returns The end-session URL
 */
function eindSessieUrl(env: AuthEnv, idToken: string | undefined): string {
  const params = new URLSearchParams({
    client_id: env.keycloakClientId,
    post_logout_redirect_uri: new URL('/', env.nextauthUrl).href,
  });
  if (idToken) params.set('id_token_hint', idToken);
  return `${env.keycloakIssuer}/protocol/openid-connect/logout?${params.toString()}`;
}

/**
 * Logs the user out: audits it, clears the session cookie and ends the Keycloak session.
 * @param request - Incoming request carrying the session cookie
 * @returns A 302 to the Keycloak end-session endpoint (also without an app session, so a refused
 *   user can switch accounts)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const env = authEnv();
  const cookieNaam = sessieCookieNaam(env.nextauthUrl);
  const token = await getToken({ req: request, secret: env.nextauthSecret, cookieName: cookieNaam });

  if (token?.gebruikerId) {
    try {
      await schrijfAudit({ actor: token.gebruikerId, actie: 'uitgelogd', doelType: 'gebruiker', doelId: token.gebruikerId });
    } catch (fout) {
      const melding = fout instanceof Error ? fout.message : String(fout);
      console.error(JSON.stringify({ level: 'error', msg: 'Failed to audit logout', error: melding }));
    }
  }

  const response = NextResponse.redirect(eindSessieUrl(env, token?.idToken), 302);
  // next-auth splits large tokens into "<name>.0", "<name>.1", ...; expire the base name and every chunk.
  const namen = new Set([cookieNaam]);
  for (const { name } of request.cookies.getAll()) {
    if (name.startsWith(`${cookieNaam}.`)) namen.add(name);
  }
  const opties = { maxAge: 0, path: '/', httpOnly: true, sameSite: 'strict', secure: env.nextauthUrl.startsWith('https://') } as const;
  for (const naam of namen) response.cookies.set(naam, '', opties);
  return response;
}
