import NextAuth from 'next-auth';
import type { NextRequest } from 'next/server';

import { getAuthOptions } from '@/src/integration/auth/authOptions';

interface NextAuthContext {
  params: Promise<{ nextauth: string[] }>;
}

/**
 * Delegates every next-auth endpoint; options are built on the first request so the build
 * does not need the auth environment.
 * @param request - Incoming request
 * @param context - Route context with the catch-all segments
 * @returns The next-auth response
 */
async function handler(request: NextRequest, context: NextAuthContext): Promise<Response> {
  const antwoord: Response = await NextAuth(request, context, getAuthOptions());
  return antwoord;
}

export { handler as GET, handler as POST };
