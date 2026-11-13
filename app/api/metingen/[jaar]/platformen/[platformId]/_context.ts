import type { NextResponse } from 'next/server';

import type { GebruikerRecord } from '@/src/data/gebruikersRepository';
import { getMetingByJaar, type MetingWithPlatformen } from '@/src/data/metingenRepository';
import { vereisGebruiker } from '@/src/integration/auth/sessie';
import { problemResponse } from '@/src/integration/problemResponse';
import { RouteParamsSchema } from '@/src/integration/schemas';
import { CONFIG } from '@/src/service/config';

export interface PlatformRouteParams {
  params: Promise<{ jaar: string; platformId: string }>;
}

export type PlatformContext =
  | { ok: true; gebruiker: GebruikerRecord; meting: MetingWithPlatformen; platformId: string }
  | { ok: false; response: NextResponse };

/** Optional extra access check that runs right after the session check (e.g. a role check). */
export type GebruikerControle = (gebruiker: GebruikerRecord) => Promise<NextResponse | null>;

/**
 * Shared checks for the platform routes, in a fixed order: params (400) -> session (401/403) ->
 * optional extra check (e.g. role, 403) -> known platform (404) -> existing meting (404).
 * @param params - Raw route params
 * @param controle - Optional check on the logged-in user; a non-null response is returned as-is
 * @returns The user, meting and platform id, or the problem+json response to return
 */
export async function laadContext(
  params: PlatformRouteParams['params'],
  controle?: GebruikerControle,
): Promise<PlatformContext> {
  const parsedParams = RouteParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return { ok: false, response: problemResponse(400, 'Ongeldige invoer', parsedParams.error.message) };
  }
  const sessie = await vereisGebruiker();
  if (!sessie.ok) return sessie;
  const geweigerd = controle ? await controle(sessie.gebruiker) : null;
  if (geweigerd) return { ok: false, response: geweigerd };
  const { jaar, platformId } = parsedParams.data;
  if (!CONFIG.platformen.some((p) => p.id === platformId)) {
    return { ok: false, response: problemResponse(404, 'Onbekend platform', `Platform "${platformId}" bestaat niet.`) };
  }
  const meting = await getMetingByJaar(jaar);
  if (!meting) {
    return { ok: false, response: problemResponse(404, 'Meting niet gevonden', `Geen meting voor jaar ${jaar}.`) };
  }
  return { ok: true, gebruiker: sessie.gebruiker, meting, platformId };
}
