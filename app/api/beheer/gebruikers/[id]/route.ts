import { NextRequest, NextResponse } from 'next/server';

import { vereisGebruiker, weigerRol } from '@/src/integration/auth/sessie';
import { beheerFoutResponse, naarGebruikerDto } from '@/src/integration/beheerDto';
import { GebruikerIdParamsSchema, GebruikerWijzigenSchema } from '@/src/integration/beheerSchemas';
import { problemResponse } from '@/src/integration/problemResponse';
import { wijzigGebruikerDoorBeheerder } from '@/src/process/beheerWorkflow';

import type { GebruikerRouteParams } from './_params';

/**
 * Changes a user's role, revokes or restores access, or unlinks the Keycloak account; beheerder only.
 * @param request - JSON body matching `GebruikerWijzigenSchema`
 * @param context - Route params with the user id
 * @returns 200 `{ gebruiker }`; 400/401/403/404/409 problem+json otherwise
 */
export async function PATCH(request: NextRequest, { params }: GebruikerRouteParams) {
  const sessie = await vereisGebruiker();
  if (!sessie.ok) return sessie.response;
  const geweigerd = await weigerRol(sessie.gebruiker, 'beheerder');
  if (geweigerd) return geweigerd;

  const parsedParams = GebruikerIdParamsSchema.safeParse(await params);
  if (!parsedParams.success) return problemResponse(400, 'Ongeldige invoer', parsedParams.error.message);
  const parsed = GebruikerWijzigenSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return problemResponse(400, 'Ongeldige invoer', parsed.error.message);

  const resultaat = await wijzigGebruikerDoorBeheerder(sessie.gebruiker, parsedParams.data.id, parsed.data);
  if (!resultaat.ok) return beheerFoutResponse(resultaat.error);
  return NextResponse.json({ gebruiker: naarGebruikerDto(resultaat.data) });
}
