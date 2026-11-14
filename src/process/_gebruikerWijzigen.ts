import type { Prisma } from '@prisma/client';

import { platformDetail, schrijfAudit, type AuditActie } from '../data/auditRepository';
import {
  telActieveBeheerders,
  vindGebruikerOpId,
  wijzigGebruiker,
  wijzigRolEnWisKoppelingen,
  type GebruikerRecord,
  type Rol,
  type VerwijderdeKoppeling,
} from '../data/gebruikersRepository';
import { fail, ok, type Result } from '../service/result';

/** A change an administrator can make to an existing user. */
export type GebruikerWijzigingActie =
  | { actie: 'rol'; rol: Rol }
  | { actie: 'intrekken' }
  | { actie: 'herstellen' }
  | { actie: 'ontkoppelAccount' };

export type WijzigFout = 'niet-gevonden' | 'zelfbescherming' | 'laatste-beheerder';

type Bescherming = Extract<WijzigFout, 'zelfbescherming' | 'laatste-beheerder'>;

// Unlinking also removes access: the user drops to `uitgenodigd` until the next login.
function ontneemtBeheer(wijziging: GebruikerWijzigingActie): boolean {
  if (wijziging.actie === 'rol') return wijziging.rol !== 'beheerder';
  return wijziging.actie === 'intrekken' || wijziging.actie === 'ontkoppelAccount';
}

async function controleerBescherming(
  actor: GebruikerRecord,
  doel: GebruikerRecord,
  wijziging: GebruikerWijzigingActie,
): Promise<Bescherming | null> {
  if (!ontneemtBeheer(wijziging)) return null;
  if (actor.id === doel.id) return 'zelfbescherming';
  const isActieveBeheerder = doel.rol === 'beheerder' && doel.status === 'actief';
  if (isActieveBeheerder && (await telActieveBeheerders()) <= 1) return 'laatste-beheerder';
  return null;
}

async function audit(
  actor: GebruikerRecord,
  doel: GebruikerRecord,
  actie: AuditActie,
  detail: string,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  await schrijfAudit({ actor: actor.id, actie, doelType: 'gebruiker', doelId: doel.id, detail }, tx);
}

// Same detail format as the koppelingen endpoint; an orphaned row (meting gone) has no year.
function koppelingDetail(k: VerwijderdeKoppeling, doel: GebruikerRecord): string {
  const plaats = k.jaar === null ? `platform=${k.platformId}` : platformDetail(k.platformId, k.jaar);
  return `${plaats};gebruiker=${doel.email}`;
}

// A lezer never holds platform assignments: becoming one removes them all (every year). The
// removal, the role change and all audit rows commit in one transaction.
async function wordLezer(actor: GebruikerRecord, doel: GebruikerRecord, detail: string): Promise<GebruikerRecord> {
  const { gebruiker } = await wijzigRolEnWisKoppelingen(doel.id, 'lezer', async (tx, verwijderd) => {
    await audit(actor, doel, 'rol_gewijzigd', `${detail};koppelingenVerwijderd=${verwijderd.length}`, tx);
    for (const k of verwijderd) {
      const regel = { actor: actor.id, actie: 'koppeling_verwijderd' as const, doelType: 'platform_invuller' };
      await schrijfAudit({ ...regel, doelId: doel.id, detail: koppelingDetail(k, doel) }, tx);
    }
  });
  return gebruiker;
}

async function wijzigRol(actor: GebruikerRecord, doel: GebruikerRecord, rol: Rol): Promise<GebruikerRecord> {
  if (doel.rol === rol) return doel;
  const detail = `van=${doel.rol};naar=${rol};email=${doel.email}`;
  if (rol === 'lezer') return wordLezer(actor, doel, detail);
  const gewijzigd = await wijzigGebruiker(doel.id, { rol });
  await audit(actor, doel, 'rol_gewijzigd', detail);
  return gewijzigd;
}

async function trekIn(actor: GebruikerRecord, doel: GebruikerRecord): Promise<GebruikerRecord> {
  if (doel.status === 'ingetrokken') return doel;
  const gewijzigd = await wijzigGebruiker(doel.id, { status: 'ingetrokken' });
  await audit(actor, doel, 'toegang_ingetrokken', `email=${doel.email}`);
  return gewijzigd;
}

// Only a revoked user can be restored: back to `actief` when a Keycloak account is bound,
// otherwise to `uitgenodigd` (never logged in). Any other status is left as-is.
async function herstel(actor: GebruikerRecord, doel: GebruikerRecord): Promise<GebruikerRecord> {
  if (doel.status !== 'ingetrokken') return doel;
  const gewijzigd = await wijzigGebruiker(doel.id, { status: doel.keycloakSub ? 'actief' : 'uitgenodigd' });
  await audit(actor, doel, 'toegang_hersteld', `email=${doel.email}`);
  return gewijzigd;
}

// Clears the Keycloak binding so the next login re-binds by e-mail. A revoked user stays
// revoked: switching to `uitgenodigd` would silently undo the revocation.
async function ontkoppel(actor: GebruikerRecord, doel: GebruikerRecord): Promise<GebruikerRecord> {
  const status = doel.status === 'ingetrokken' ? 'ingetrokken' : 'uitgenodigd';
  const gewijzigd = await wijzigGebruiker(doel.id, { keycloakSub: null, status });
  // The Keycloak subject is never written to the audit detail: it is readable via GET /api/audit.
  await audit(actor, doel, 'account_ontkoppeld', `email=${doel.email}`);
  return gewijzigd;
}

function voerUit(actor: GebruikerRecord, doel: GebruikerRecord, wijziging: GebruikerWijzigingActie): Promise<GebruikerRecord> {
  switch (wijziging.actie) {
    case 'rol':
      return wijzigRol(actor, doel, wijziging.rol);
    case 'intrekken':
      return trekIn(actor, doel);
    case 'herstellen':
      return herstel(actor, doel);
    case 'ontkoppelAccount':
      return ontkoppel(actor, doel);
  }
}

/**
 * Applies an administrator's change to a user, with self-protection (an administrator cannot
 * demote, revoke or unlink themselves) and last-administrator protection. Each effective change is audited;
 * a no-op (e.g. revoking an already revoked user) writes nothing.
 * @param actor - The acting administrator
 * @param doelId - Id of the user to change
 * @param wijziging - Role change, revoke, restore or unlink the Keycloak account
 * @returns The updated user, or `niet-gevonden` / `zelfbescherming` / `laatste-beheerder`
 */
export async function wijzigGebruikerDoorBeheerder(
  actor: GebruikerRecord,
  doelId: string,
  wijziging: GebruikerWijzigingActie,
): Promise<Result<GebruikerRecord, WijzigFout>> {
  const doel = await vindGebruikerOpId(doelId);
  if (!doel) return fail('niet-gevonden');
  const weigering = await controleerBescherming(actor, doel, wijziging);
  if (weigering) return fail(weigering);
  return ok(await voerUit(actor, doel, wijziging));
}
