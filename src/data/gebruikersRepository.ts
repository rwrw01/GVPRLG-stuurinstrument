import type { Gebruiker } from '@prisma/client';

import { prisma } from './prismaClient';

export type Rol = 'invuller' | 'beheerder';
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
 * Lists the distinct platforms the user is assigned to in any meting.
 * @param gebruikerId - User id
 * @returns Platform ids (distinct, unordered); empty when the user has no assignment
 */
export async function platformIdsVanGebruiker(gebruikerId: string): Promise<string[]> {
  const rijen = await prisma.platformInvuller.findMany({
    where: { gebruiker: gebruikerId },
    select: { platformId: true },
    distinct: ['platformId'],
  });
  return rijen.map((r) => r.platformId);
}

/**
 * Replaces the user's platform assignments for one meting with the requested set (one transaction).
 * Assignments for other metingen are untouched. Writes no audit rows.
 * @param gebruikerId - User id
 * @param metingId - Meting id
 * @param platformIds - Desired platform ids for this meting
 * @returns Platform ids that were added and removed
 */
export async function zetKoppelingen(
  gebruikerId: string,
  metingId: string,
  platformIds: string[],
): Promise<{ toegevoegd: string[]; verwijderd: string[] }> {
  return prisma.$transaction(async (tx) => {
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
    return { toegevoegd, verwijderd };
  });
}
