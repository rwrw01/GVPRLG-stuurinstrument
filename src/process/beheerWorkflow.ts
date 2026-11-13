import { platformDetail, schrijfAudit } from '../data/auditRepository';
import {
  maakGebruiker,
  vindGebruikerOpEmail,
  vindGebruikerOpId,
  zetKoppelingen,
  type GebruikerRecord,
  type Rol,
} from '../data/gebruikersRepository';
import { getMetingByJaar } from '../data/metingenRepository';
import { fail, ok, type Result } from '../service/result';

export { wijzigGebruikerDoorBeheerder, type GebruikerWijzigingActie, type WijzigFout } from './_gebruikerWijzigen';

/** Input for registering a new user (chair) with their platforms for one year. */
export interface VoorzitterInvoer {
  email: string;
  naam: string;
  rol: Rol;
  jaar: number;
  platformIds: string[];
}

export interface KoppelingWijziging {
  toegevoegd: string[];
  verwijderd: string[];
}

async function auditKoppelingen(
  actor: GebruikerRecord,
  doel: GebruikerRecord,
  jaar: number,
  wijziging: KoppelingWijziging,
): Promise<void> {
  const regels = [
    ...wijziging.toegevoegd.map((p) => ({ platformId: p, actie: 'koppeling_toegevoegd' as const })),
    ...wijziging.verwijderd.map((p) => ({ platformId: p, actie: 'koppeling_verwijderd' as const })),
  ];
  for (const regel of regels) {
    await schrijfAudit({
      actor: actor.id,
      actie: regel.actie,
      doelType: 'platform_invuller',
      doelId: doel.id,
      detail: `${platformDetail(regel.platformId, jaar)};gebruiker=${doel.email}`,
    });
  }
}

/**
 * Registers a new user (status `uitgenodigd`) and assigns the platforms for the given year.
 * The Keycloak account itself is created by the administrator in the Keycloak console; the
 * first login binds it by e-mail. Audited as `gebruiker_toegevoegd` plus one row per platform.
 * @param actor - The acting administrator
 * @param invoer - E-mail (normalised), name, role, year and platform ids (may be empty)
 * @returns The created user, or `bestaat-al` / `meting-onbekend`
 */
export async function voegVoorzitterToe(
  actor: GebruikerRecord,
  invoer: VoorzitterInvoer,
): Promise<Result<GebruikerRecord, 'bestaat-al' | 'meting-onbekend'>> {
  if (await vindGebruikerOpEmail(invoer.email)) return fail('bestaat-al');
  const meting = await getMetingByJaar(invoer.jaar);
  if (!meting) return fail('meting-onbekend');

  const gebruiker = await maakGebruiker({ email: invoer.email, naam: invoer.naam, rol: invoer.rol });
  await schrijfAudit({
    actor: actor.id,
    actie: 'gebruiker_toegevoegd',
    doelType: 'gebruiker',
    doelId: gebruiker.id,
    detail: `email=${gebruiker.email};rol=${gebruiker.rol}`,
  });
  const wijziging = await zetKoppelingen(gebruiker.id, meting.id, invoer.platformIds);
  await auditKoppelingen(actor, gebruiker, invoer.jaar, wijziging);
  return ok(gebruiker);
}

/**
 * Replaces a user's platform assignments for one year and audits every added and removed platform.
 * @param actor - The acting administrator
 * @param doelId - Id of the user whose assignments change
 * @param jaar - Measurement year
 * @param platformIds - Desired platform ids for that year
 * @returns The added and removed platform ids, or `niet-gevonden` / `meting-onbekend`
 */
export async function zetKoppelingenDoorBeheerder(
  actor: GebruikerRecord,
  doelId: string,
  jaar: number,
  platformIds: string[],
): Promise<Result<KoppelingWijziging, 'niet-gevonden' | 'meting-onbekend'>> {
  const doel = await vindGebruikerOpId(doelId);
  if (!doel) return fail('niet-gevonden');
  const meting = await getMetingByJaar(jaar);
  if (!meting) return fail('meting-onbekend');

  const wijziging = await zetKoppelingen(doel.id, meting.id, platformIds);
  await auditKoppelingen(actor, doel, jaar, wijziging);
  return ok(wijziging);
}
