import type { Gebruiker, Prisma } from '@prisma/client';

import { prisma } from './prismaClient';

export type Rol = 'invuller' | 'beheerder' | 'lezer';
export type GebruikerStatus = 'uitgenodigd' | 'actief' | 'ingetrokken';

/** A `gebruikers` row with `rol` and `status` narrowed to their unions. */
export type GebruikerRecord = Omit<Gebruiker, 'rol' | 'status'> & { rol: Rol; status: GebruikerStatus };

export interface GebruikerWijziging {
  rol?: Rol;
  status?: GebruikerStatus;
  keycloakSub?: null;
}

function normaliseerEmail(email: string): string {
  return email.trim().toLowerCase();
}

// The DB columns are plain strings; writes only ever go through the typed functions below.
function naarRecord(rij: Gebruiker): GebruikerRecord {
  return rij as GebruikerRecord;
}

/** A platform assignment removed when a user becomes `lezer`; `jaar` is null for an orphaned row. */
export interface VerwijderdeKoppeling {
  platformId: string;
  jaar: number | null;
}

/** Outcome of `zetKoppelingen`: the diff, or a refusal because the (locked) user is a `lezer`. */
export type KoppelingenResultaat =
  | { ok: true; toegevoegd: string[]; verwijderd: string[] }
  | { ok: false; reden: 'lezer' };

// Locks the user's row until the transaction ends, so assignment changes and a role change to
// `lezer` serialize. Returns the locked role, or null when the user does not exist.
async function _vergrendelRol(tx: Prisma.TransactionClient, id: string): Promise<string | null> {
  const rijen = await tx.$queryRaw<Array<{ rol: string }>>`SELECT rol FROM gebruikers WHERE id = ${id} FOR UPDATE`;
  return rijen[0]?.rol ?? null;
}

function naarRecordOfNull(rij: Gebruiker | null): GebruikerRecord | null {
  return rij ? naarRecord(rij) : null;
}

/**
 * Finds a user by primary key.
 * @param id - User id
 * @returns The user, or null when absent
 */
export async function vindGebruikerOpId(id: string): Promise<GebruikerRecord | null> {
  return naarRecordOfNull(await prisma.gebruiker.findUnique({ where: { id } }));
}

/**
 * Finds the users with the given primary keys in one query; unknown ids are skipped.
 * @param ids - User ids (duplicates allowed)
 * @returns The users found, in no particular order; empty for an empty input
 */
export async function vindGebruikersOpIds(ids: string[]): Promise<GebruikerRecord[]> {
  if (ids.length === 0) return [];
  const rijen = await prisma.gebruiker.findMany({ where: { id: { in: [...new Set(ids)] } } });
  return rijen.map(naarRecord);
}

/**
 * Finds a user by the bound Keycloak subject.
 * @param sub - Keycloak `sub` claim
 * @returns The user, or null when no user is bound to this subject
 */
export async function vindGebruikerOpSub(sub: string): Promise<GebruikerRecord | null> {
  return naarRecordOfNull(await prisma.gebruiker.findUnique({ where: { keycloakSub: sub } }));
}

/**
 * Finds a user by e-mail address (trimmed and lowercased before lookup).
 * @param email - E-mail address in any casing
 * @returns The user, or null when absent
 */
export async function vindGebruikerOpEmail(email: string): Promise<GebruikerRecord | null> {
  return naarRecordOfNull(await prisma.gebruiker.findUnique({ where: { email: normaliseerEmail(email) } }));
}

/**
 * Creates a user; the e-mail address is stored trimmed and lowercased.
 * @param input - E-mail, name, role and optional status (default `uitgenodigd`)
 * @returns The created user
 */
export async function maakGebruiker(input: {
  email: string;
  naam: string;
  rol: Rol;
  status?: GebruikerStatus;
}): Promise<GebruikerRecord> {
  const rij = await prisma.gebruiker.create({
    data: { email: normaliseerEmail(input.email), naam: input.naam, rol: input.rol, status: input.status },
  });
  return naarRecord(rij);
}

/**
 * Binds a Keycloak subject to the user, activates the account and records the login.
 * @param id - User id
 * @param sub - Keycloak `sub` claim (unique across users)
 * @returns The updated user
 */
export async function bindKeycloakSub(id: string, sub: string): Promise<GebruikerRecord> {
  const rij = await prisma.gebruiker.update({
    where: { id },
    data: { keycloakSub: sub, status: 'actief', laatsteLogin: new Date() },
  });
  return naarRecord(rij);
}

/**
 * Records the moment of a successful login.
 * @param id - User id
 * @returns Promise that resolves once stored
 */
export async function registreerLogin(id: string): Promise<void> {
  await prisma.gebruiker.update({ where: { id }, data: { laatsteLogin: new Date() } });
}

/**
 * Changes role and/or status, or clears the Keycloak binding (`keycloakSub: null`).
 * @param id - User id
 * @param wijziging - Fields to change; omitted fields stay untouched
 * @returns The updated user
 */
export async function wijzigGebruiker(id: string, wijziging: GebruikerWijziging): Promise<GebruikerRecord> {
  const rij = await prisma.gebruiker.update({
    where: { id },
    data: { rol: wijziging.rol, status: wijziging.status, keycloakSub: wijziging.keycloakSub },
  });
  return naarRecord(rij);
}

/**
 * Changes the role and, in one transaction with a row lock on the user, removes all platform
 * assignments of the user (every meting). `auditInTx` runs inside the same transaction, so the
 * audit rows commit or roll back together with the change. Used when a user becomes a `lezer`.
 * @param id - User id
 * @param rol - New role
 * @param auditInTx - Writes the audit rows through the given transaction client
 * @returns The updated user and the removed assignments (with their year)
 */
export async function wijzigRolEnWisKoppelingen(
  id: string,
  rol: Rol,
  auditInTx: (tx: Prisma.TransactionClient, verwijderd: VerwijderdeKoppeling[]) => Promise<void>,
): Promise<{ gebruiker: GebruikerRecord; verwijderd: VerwijderdeKoppeling[] }> {
  return prisma.$transaction(async (tx) => {
    await _vergrendelRol(tx, id);
    const rijen = await tx.platformInvuller.findMany({ where: { gebruiker: id } });
    const metingIds = [...new Set(rijen.map((r) => r.metingId))];
    const metingen = await tx.meting.findMany({ where: { id: { in: metingIds } }, select: { id: true, jaar: true } });
    const jaarVan = new Map(metingen.map((m) => [m.id, m.jaar]));
    await tx.platformInvuller.deleteMany({ where: { id: { in: rijen.map((r) => r.id) } } });
    const rij = await tx.gebruiker.update({ where: { id }, data: { rol } });
    const verwijderd = rijen.map((r) => ({ platformId: r.platformId, jaar: jaarVan.get(r.metingId) ?? null }));
    await auditInTx(tx, verwijderd);
    return { gebruiker: naarRecord(rij), verwijderd };
  });
}

/**
 * Counts administrators whose account is active.
 * @returns Number of users with role `beheerder` and status `actief`
 */
export async function telActieveBeheerders(): Promise<number> {
  return prisma.gebruiker.count({ where: { rol: 'beheerder', status: 'actief' } });
}

/**
 * Lists all users with their platform assignments for the given measurement year.
 * @param jaar - Measurement year; when no meting exists every user gets an empty list
 * @returns Users ordered by name, each with `platformIds` for that year
 */
export async function lijstGebruikersMetKoppelingen(
  jaar: number,
): Promise<Array<GebruikerRecord & { platformIds: string[] }>> {
  const meting = await prisma.meting.findUnique({ where: { jaar }, select: { id: true } });
  const [gebruikers, koppelingen] = await Promise.all([
    prisma.gebruiker.findMany({ orderBy: { naam: 'asc' } }),
    meting ? prisma.platformInvuller.findMany({ where: { metingId: meting.id } }) : Promise.resolve([]),
  ]);
  return gebruikers.map((g) => ({
    ...naarRecord(g),
    platformIds: koppelingen.filter((k) => k.gebruiker === g.id).map((k) => k.platformId),
  }));
}

/**
 * Checks whether the user is assigned to the platform within the meting.
 * @param gebruikerId - User id
 * @param metingId - Meting id
 * @param platformId - Platform id
 * @returns True when an assignment exists
 */
export async function heeftKoppeling(gebruikerId: string, metingId: string, platformId: string): Promise<boolean> {
  const rij = await prisma.platformInvuller.findUnique({
    where: { metingId_platformId_gebruiker: { metingId, platformId, gebruiker: gebruikerId } },
  });
  return rij !== null;
}

/**
 * Replaces the user's platform assignments for one meting with the requested set (one transaction
 * holding a row lock on the user). Assignments for other metingen are untouched. Writes no audit rows.
 * A `lezer` (role read under the lock) can only get an empty set.
 * @param gebruikerId - User id
 * @param metingId - Meting id
 * @param platformIds - Desired platform ids for this meting
 * @returns Platform ids that were added and removed, or `{ ok: false, reden: 'lezer' }`
 */
export async function zetKoppelingen(
  gebruikerId: string,
  metingId: string,
  platformIds: string[],
): Promise<KoppelingenResultaat> {
  return prisma.$transaction(async (tx) => {
    const rol = await _vergrendelRol(tx, gebruikerId);
    if (rol === 'lezer' && platformIds.length > 0) return { ok: false, reden: 'lezer' } as const;
    const bestaand = await tx.platformInvuller.findMany({ where: { metingId, gebruiker: gebruikerId } });
    const huidig = new Set(bestaand.map((k) => k.platformId));
    const gewenst = new Set(platformIds);
    const toegevoegd = [...gewenst].filter((id) => !huidig.has(id));
    const verwijderd = [...huidig].filter((id) => !gewenst.has(id));
    if (toegevoegd.length > 0) {
      await tx.platformInvuller.createMany({
        data: toegevoegd.map((platformId) => ({ metingId, platformId, gebruiker: gebruikerId })),
      });
    }
    if (verwijderd.length > 0) {
      await tx.platformInvuller.deleteMany({ where: { metingId, gebruiker: gebruikerId, platformId: { in: verwijderd } } });
    }
    return { ok: true, toegevoegd, verwijderd } as const;
  });
}
