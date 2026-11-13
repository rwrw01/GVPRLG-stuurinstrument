import { NextResponse, type NextRequest } from 'next/server';

// Kept in sync with sessieCookieNaam() in src/integration/auth/authOptions.ts; hardcoded so the
// proxy stays free of next-auth, Prisma and env imports.
const SESSIE_COOKIES = ['__Secure-next-auth.session-token', 'next-auth.session-token'];

function _heeftSessieCookie(request: NextRequest): boolean {
  // next-auth splits large tokens into "<name>.0", "<name>.1", ... chunks.
  return request.cookies
    .getAll()
    .some(({ name }) => SESSIE_COOKIES.some((basis) => name === basis || name.startsWith(`${basis}.`)));
}

/**
 * First-line filter: requests without a session cookie never reach pages or API routes.
 * Token validation and authorisation happen in the route itself.
 * @param request - Incoming request
 * @returns Pass-through, a redirect to the login page, or a 401 problem response
 */
export function proxy(request: NextRequest): NextResponse {
  if (_heeftSessieCookie(request)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    return NextResponse.json(
      { type: 'about:blank', title: 'Niet ingelogd', status: 401, detail: 'Log in om deze gegevens te bekijken.' },
      { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
    );
  }
  // Behind a TLS-terminating proxy request.url carries the internal scheme; prefer the public URL.
  const inloggen = new URL('/inloggen', process.env.NEXTAUTH_URL ?? request.url);
  inloggen.searchParams.set('callbackUrl', `${pathname}${search}`);
  return NextResponse.redirect(inloggen);
}

export const config = {
  matcher: ['/((?!_next|favicon\\.ico|api/healthz|api/readyz|api/auth|inloggen|geen-toegang).*)'],
};
