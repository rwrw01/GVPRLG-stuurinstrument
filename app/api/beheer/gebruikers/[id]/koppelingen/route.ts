import { NextRequest, NextResponse } from 'next/server';

import { vereisGebruiker, weigerRol } from '@/src/integration/auth/sessie';
import { beheerFoutResponse } from '@/src/integration/beheerDto';
import { GebruikerIdParamsSchema, KoppelingenSchema } from '@/src/integration/beheerSchemas';
import { problemResponse } from '@/src/integration/problemResponse';
import { zetKoppelingenDoorBeheerder } from '@/src/process/beheerWorkflow';

import type { GebruikerRouteParams } from '../_params';

/**
 * Replaces a user's platform assignments for one year; beheerder only. Audited per platform.
 * @param request - JSON body matching `KoppelingenSchema`
 * @param context - Route params with the user id
 * @returns 200 `{ toegevoegd, verwijderd }`; 400/401/403/404 problem+json otherwise
 */
export async function PUT(request: NextRequest, { params }: GebruikerRouteParams) {
  const sessie = await vereisGebruiker();
  if (!sessie.ok) return sessie.response;
  const geweigerd = await weigerRol(sessie.gebruiker, 'beheerder');
  if (geweigerd) return geweigerd;

  const parsedParams = GebruikerIdParamsSchema.safeParse(await params);
  if (!parsedParams.success) return problemResponse(400, 'Ongeldige invoer', parsedParams.error.message);
  const parsed = KoppelingenSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return problemResponse(400, 'Ongeldige invoer', parsed.error.message);

  const { jaar, platformIds } = parsed.data;
  const resultaat = await zetKoppelingenDoorBeheerder(sessie.gebruiker, parsedParams.data.id, jaar, platformIds);
  if (!resultaat.ok) return beheerFoutResponse(resultaat.error);
  return NextResponse.json(resultaat.data);
}
