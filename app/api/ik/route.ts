import { NextResponse } from 'next/server';

import { vereisGebruiker } from '@/src/integration/auth/sessie';

/**
 * Returns the logged-in, active user.
 * @returns 200 `{ id, naam, email, rol }`; 401/403 problem+json without an active session
 */
export async function GET() {
  const sessie = await vereisGebruiker();
  if (!sessie.ok) return sessie.response;
  const { id, naam, email, rol } = sessie.gebruiker;
  return NextResponse.json({ id, naam, email, rol });
}
