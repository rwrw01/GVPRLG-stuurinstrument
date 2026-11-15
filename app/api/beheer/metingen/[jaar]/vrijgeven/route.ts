import { NextRequest, NextResponse } from 'next/server';

import { vereisGebruiker, weigerRol } from '@/src/integration/auth/sessie';
import { problemResponse } from '@/src/integration/problemResponse';
import { JaarParamsSchema } from '@/src/integration/schemas';
import { geefMetingVrij } from '@/src/process/catalogusWorkflow';

interface RouteParams {
  params: Promise<{ jaar: string }>;
}

/**
 * Unfreezes the questionnaire of a year that holds no score, comment or aanwezigen; beheerder only.
 * The empty rows and the copy are removed and the year follows the catalogue again (audited).
 * @param _request - Incoming request (unused; no body)
 * @param context - Route params with the measurement year
 * @returns 200 `{ ok: true }`; 400/401/403/404/409 problem+json otherwise
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const sessie = await vereisGebruiker();
  if (!sessie.ok) return sessie.response;
  const geweigerd = await weigerRol(sessie.gebruiker, 'beheerder');
  if (geweigerd) return geweigerd;
  const parsed = JaarParamsSchema.safeParse(await params);
  if (!parsed.success) return problemResponse(400, 'Ongeldige invoer', 'Ongeldig meetjaar.');

  const resultaat = await geefMetingVrij(sessie.gebruiker, parsed.data.jaar);
  if (!resultaat.ok) {
    return problemResponse(resultaat.error.status, resultaat.error.status === 404 ? 'Meting niet gevonden' : 'Niet toegestaan', resultaat.error.detail);
  }
  return NextResponse.json({ ok: true });
}
