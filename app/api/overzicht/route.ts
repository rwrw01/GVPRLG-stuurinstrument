import { NextResponse } from 'next/server';

import { vereisGebruiker } from '@/src/integration/auth/sessie';
import { haalOverzicht } from '@/src/process/overzicht';

/**
 * Returns the start screen for any active user: per year and platform the status, axis averages,
 * total and number of answered questions, plus the derived opening sentence and talking points.
 * @returns 200 with the overview, or 401/403 problem+json without an active session
 */
export async function GET() {
  const sessie = await vereisGebruiker();
  if (!sessie.ok) return sessie.response;
  return NextResponse.json(await haalOverzicht());
}
