import { NextRequest, NextResponse } from 'next/server';

import { lijstGebruikersMetKoppelingen } from '@/src/data/gebruikersRepository';
import { vereisGebruiker, weigerRol } from '@/src/integration/auth/sessie';
import { beheerFoutResponse, naarGebruikerDto } from '@/src/integration/beheerDto';
import { GebruikersQuerySchema, GebruikerToevoegenSchema } from '@/src/integration/beheerSchemas';
import { problemResponse } from '@/src/integration/problemResponse';
import { voegGebruikerToe } from '@/src/process/beheerWorkflow';

/**
 * Lists all users with their platform assignments for a year; beheerder only.
 * @param request - Request with query `jaar`
 * @returns 200 `{ gebruikers }`; 400/401/403 problem+json otherwise
 */
export async function GET(request: NextRequest) {
  const sessie = await vereisGebruiker();
  if (!sessie.ok) return sessie.response;
  const geweigerd = await weigerRol(sessie.gebruiker, 'beheerder');
  if (geweigerd) return geweigerd;

  const query = GebruikersQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!query.success) return problemResponse(400, 'Ongeldige invoer', query.error.message);
  const gebruikers = await lijstGebruikersMetKoppelingen(query.data.jaar);
  return NextResponse.json({
    gebruikers: gebruikers.map((g) => ({ ...naarGebruikerDto(g), platformIds: g.platformIds })),
  });
}

/**
 * Registers a new user with platform assignments for a year; beheerder only. The Keycloak
 * account is created separately in the Keycloak console.
 * @param request - JSON body matching `GebruikerToevoegenSchema`
 * @returns 201 `{ gebruiker }`; 400/401/403/404/409 problem+json otherwise
 */
export async function POST(request: NextRequest) {
  const sessie = await vereisGebruiker();
  if (!sessie.ok) return sessie.response;
  const geweigerd = await weigerRol(sessie.gebruiker, 'beheerder');
  if (geweigerd) return geweigerd;

  const parsed = GebruikerToevoegenSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return problemResponse(400, 'Ongeldige invoer', parsed.error.message);
  const resultaat = await voegGebruikerToe(sessie.gebruiker, parsed.data);
  if (!resultaat.ok) return beheerFoutResponse(resultaat.error);
  const gebruiker = { ...naarGebruikerDto(resultaat.data), platformIds: parsed.data.platformIds };
  return NextResponse.json({ gebruiker }, { status: 201 });
}
