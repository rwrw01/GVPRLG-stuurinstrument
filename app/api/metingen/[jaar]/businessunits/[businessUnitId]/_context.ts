import type { NextResponse } from 'next/server';

import type { GebruikerRecord } from '@/src/data/gebruikersRepository';
import type { MetingMetBusinessUnits } from '@/src/data/metingenRepository';
import type { LijstBusinessUnit, Vragenlijst } from '@/src/data/vragenlijstRepository';
import { vereisGebruiker } from '@/src/integration/auth/sessie';
import { problemResponse } from '@/src/integration/problemResponse';
import { RouteParamsSchema } from '@/src/integration/schemas';
import { haalMetingMetLijst } from '@/src/process/vragenlijst';

export interface BusinessUnitRouteParams {
  params: Promise<{ jaar: string; businessUnitId: string }>;
}

export type BusinessUnitContext =
  | { ok: true; gebruiker: GebruikerRecord; meting: MetingMetBusinessUnits; lijst: Vragenlijst; unit: LijstBusinessUnit }
  | { ok: false; response: NextResponse };

/** Optional extra access check that runs right after the session check (e.g. a role check). */
export type GebruikerControle = (gebruiker: GebruikerRecord) => Promise<NextResponse | null>;

/**
 * Shared checks for the business unit routes, in a fixed order: params (400) -> session (401/403) ->
 * optional extra check (e.g. role, 403) -> existing meting (404) -> business unit in that year's list (404).
 * @param params - Raw route params
 * @param controle - Optional check on the logged-in user; a non-null response is returned as-is
 * @returns The user, meting, list and business unit, or the problem+json response to return
 */
export async function laadContext(
  params: BusinessUnitRouteParams['params'],
  controle?: GebruikerControle,
): Promise<BusinessUnitContext> {
  const parsedParams = RouteParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return { ok: false, response: problemResponse(400, 'Ongeldige invoer', parsedParams.error.message) };
  }
  const sessie = await vereisGebruiker();
  if (!sessie.ok) return sessie;
  const geweigerd = controle ? await controle(sessie.gebruiker) : null;
  if (geweigerd) return { ok: false, response: geweigerd };
  const { jaar, businessUnitId } = parsedParams.data;
  const gevonden = await haalMetingMetLijst(jaar);
  if (!gevonden) {
    return { ok: false, response: problemResponse(404, 'Meting niet gevonden', `Geen meting voor jaar ${jaar}.`) };
  }
  const unit = gevonden.lijst.businessUnits.find((b) => b.id === businessUnitId);
  if (!unit) {
    return { ok: false, response: problemResponse(404, 'Onbekende businessunit', `Deze businessunit hoort niet bij de vragenlijst van ${jaar}.`) };
  }
  return { ok: true, gebruiker: sessie.gebruiker, ...gevonden, unit };
}
