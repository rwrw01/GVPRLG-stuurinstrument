import { NextRequest, NextResponse } from 'next/server';
import { JaarParamsSchema } from '@/src/integration/schemas';
import { problemResponse } from '@/src/integration/problemResponse';
import { vereisGebruiker } from '@/src/integration/auth/sessie';
import { magBusinessUnitsBewerken } from '@/src/process/toegang';
import { haalMetingMetLijst } from '@/src/process/vragenlijst';

interface RouteParams {
  params: Promise<{ jaar: string }>;
}

/**
 * Returns one meting with the status and scores of every business unit filled in so far, and per
 * business unit of the year's list whether the user may edit it (the same rule as the write check).
 * @param _request incoming request (unused)
 * @param context route params with the measurement year
 * @returns 200 with the meting and `magBewerken`, 400 on an invalid year, 401/403 without an active session,
 *   404 when the year does not exist
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const parsed = JaarParamsSchema.safeParse(await params);
  if (!parsed.success) {
    return problemResponse(400, 'Ongeldige invoer', parsed.error.message);
  }
  const sessie = await vereisGebruiker();
  if (!sessie.ok) return sessie.response;
  const gevonden = await haalMetingMetLijst(parsed.data.jaar);
  if (!gevonden) {
    return problemResponse(404, 'Meting niet gevonden', `Geen meting voor jaar ${parsed.data.jaar}.`);
  }
  const { meting, lijst } = gevonden;
  const magBewerken = await magBusinessUnitsBewerken(sessie.gebruiker, meting.id, lijst.businessUnits);
  return NextResponse.json({ meting, magBewerken });
}
