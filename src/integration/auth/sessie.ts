import { getServerSession } from 'next-auth/next';
import type { NextResponse } from 'next/server';

import { businessUnitDetail, schrijfAudit } from '@/src/data/auditRepository';
import { vindGebruikerOpId, type GebruikerRecord, type Rol } from '@/src/data/gebruikersRepository';
import { schrijfWeigeringTekst, vereisActief, vereisPlatformSchrijfrecht, vereisRol } from '@/src/process/toegang';
import { problemResponse } from '@/src/integration/problemResponse';

import { getAuthOptions } from './authOptions';

export type GebruikerUitSessie = { ok: true; gebruiker: GebruikerRecord } | { ok: false; response: NextResponse };

const GEEN_TOEGANG = 'Geen toegang';

function nietIngelogd(): NextResponse {
  return problemResponse(401, 'Niet ingelogd', 'Log in om deze gegevens te bekijken.');
}

/**
 * Resolves the logged-in user from the session cookie and re-checks the account in the database
 * on every request, so a revoked user is refused even with a still-valid session cookie.
 * @returns The active user, or a ready 401/403 problem+json response (403 is audited)
 */
export async function vereisGebruiker(): Promise<GebruikerUitSessie> {
  const sessie = await getServerSession(getAuthOptions());
  const gebruikerId = sessie?.user?.gebruikerId;
  if (!gebruikerId) return { ok: false, response: nietIngelogd() };

  const gebruiker = await vindGebruikerOpId(gebruikerId);
  const actief = vereisActief(gebruiker);
  if (actief.ok) return { ok: true, gebruiker: actief.data };
  if (actief.error.status === 401 || !gebruiker) return { ok: false, response: nietIngelogd() };

  await schrijfAudit({
    actor: gebruiker.id,
    actie: 'toegang_geweigerd',
    doelType: 'sessie',
    doelId: gebruiker.id,
    detail: `reden=${actief.error.reden};status=${gebruiker.status}`,
  });
  return {
    ok: false,
    response: problemResponse(403, GEEN_TOEGANG, 'Uw toegang is ingetrokken of nog niet geactiveerd.'),
  };
}

/**
 * Refuses the request (audited) when the user lacks the required role.
 * @param gebruiker - Active user from `vereisGebruiker`
 * @param rol - Required role
 * @returns A 403 problem+json response, or null when allowed
 */
export async function weigerRol(gebruiker: GebruikerRecord, rol: Rol): Promise<NextResponse | null> {
  const resultaat = vereisRol(gebruiker, rol);
  if (resultaat.ok) return null;
  await schrijfAudit({
    actor: gebruiker.id,
    actie: 'toegang_geweigerd',
    doelType: 'rol',
    doelId: gebruiker.id,
    detail: `vereist=${rol};reden=${resultaat.error.reden}`,
  });
  return problemResponse(403, GEEN_TOEGANG, 'Alleen een beheerder mag deze actie uitvoeren.');
}

/**
 * Refuses the request (audited) when the user may not write the business unit within this meting:
 * an invuller needs a link to the platform the unit belongs to in that year.
 * @param gebruiker - Active user from `vereisGebruiker`
 * @param meting - The meting being written (`id` and `jaar`)
 * @param unit - The business unit of that year (`id` and `platformId`)
 * @returns A 403 problem+json response, or null when allowed
 */
export async function weigerBusinessUnitSchrijfrecht(
  gebruiker: GebruikerRecord,
  meting: { id: string; jaar: number },
  unit: { id: string; platformId: string },
): Promise<NextResponse | null> {
  const resultaat = await vereisPlatformSchrijfrecht(gebruiker, meting.id, unit.platformId);
  if (resultaat.ok) return null;
  await schrijfAudit({
    actor: gebruiker.id,
    actie: 'toegang_geweigerd',
    doelType: 'platform_score',
    doelId: meting.id,
    detail: `${businessUnitDetail(unit.platformId, unit.id, meting.jaar)};reden=${resultaat.error.reden}`,
  });
  return problemResponse(403, GEEN_TOEGANG, schrijfWeigeringTekst(resultaat.error));
}
