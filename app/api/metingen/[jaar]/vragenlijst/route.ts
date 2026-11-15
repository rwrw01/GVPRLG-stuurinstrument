import { NextRequest, NextResponse } from 'next/server';

import { vereisGebruiker } from '@/src/integration/auth/sessie';
import { problemResponse } from '@/src/integration/problemResponse';
import { JaarParamsSchema } from '@/src/integration/schemas';
import { haalVragenlijst } from '@/src/process/vragenlijst';

interface RouteParams {
  params: Promise<{ jaar: string }>;
}

/**
 * Returns the questionnaire of one year for any active user: the frozen copy when the year is
 * frozen, otherwise the active catalogue. Every item carries its stable id.
 * @param _request - Incoming request (unused)
 * @param context - Route params with the measurement year
 * @returns 200 `{ vragenlijst }`; 400 on an invalid year, 401/403 without an active session, 404 without meting
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const parsed = JaarParamsSchema.safeParse(await params);
  if (!parsed.success) return problemResponse(400, 'Ongeldige invoer', parsed.error.message);
  const sessie = await vereisGebruiker();
  if (!sessie.ok) return sessie.response;
  const vragenlijst = await haalVragenlijst(parsed.data.jaar);
  if (!vragenlijst) return problemResponse(404, 'Meting niet gevonden', `Geen meting voor jaar ${parsed.data.jaar}.`);
  return NextResponse.json({ vragenlijst });
}
