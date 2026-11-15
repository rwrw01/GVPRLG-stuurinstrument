import { heeftKoppeling, type GebruikerRecord, type Rol } from '../data/gebruikersRepository';
import { fail, ok, type Result } from '../service/result';

/** Why access was refused; `status` is the HTTP status the caller should answer with. */
export type Weigering = { status: 401 | 403; reden: string };

/**
 * Requires a known user whose account is active. Writes no audit rows.
 * @param g - The user behind the session, or null when there is no (known) session user
 * @returns The user, 401 `geen-sessie` without a user, 403 `niet-actief` when not active
 */
export function vereisActief(g: GebruikerRecord | null): Result<GebruikerRecord, Weigering> {
  if (!g) return fail({ status: 401, reden: 'geen-sessie' });
  if (g.status !== 'actief') return fail({ status: 403, reden: 'niet-actief' });
  return ok(g);
}

/**
 * Requires the user to hold the given role. Writes no audit rows.
 * @param g - Active user
 * @param rol - Required role
 * @returns The user, or 403 `rol` when the role differs
 */
export function vereisRol(g: GebruikerRecord, rol: Rol): Result<GebruikerRecord, Weigering> {
  return g.rol === rol ? ok(g) : fail({ status: 403, reden: 'rol' });
}

/**
 * Requires write access to one platform within a meting: administrators always, fillers only
 * when assigned to that platform for that meting, readers never (even with a stray assignment).
 * Writes no audit rows.
 * @param g - Active user
 * @param metingId - Meting id
 * @param platformId - Platform id
 * @returns The user, 403 `alleen-lezen` for a reader, 403 `geen-koppeling` for an unassigned filler,
 *   or 403 `rol` for any other role value (deny by default)
 */
export async function vereisPlatformSchrijfrecht(
  g: GebruikerRecord,
  metingId: string,
  platformId: string,
): Promise<Result<GebruikerRecord, Weigering>> {
  // Allowlist per role; an unknown role value (the DB column is a plain string) is denied.
  switch (g.rol) {
    case 'beheerder':
      return ok(g);
    case 'invuller':
      return (await heeftKoppeling(g.id, metingId, platformId)) ? ok(g) : fail({ status: 403, reden: 'geen-koppeling' });
    case 'lezer':
      return fail({ status: 403, reden: 'alleen-lezen' });
    default:
      return fail({ status: 403, reden: 'rol' });
  }
}

/**
 * Whether the user may edit one platform's business units within a meting, by the same rule as
 * the write check (`vereisPlatformSchrijfrecht`). For the UI only; writes no audit rows.
 * @param g - Active user
 * @param metingId - Meting id
 * @param platformId - Platform id
 * @returns true when a save would pass the access check
 */
export async function magPlatformBewerken(g: GebruikerRecord, metingId: string, platformId: string): Promise<boolean> {
  return (await vereisPlatformSchrijfrecht(g, metingId, platformId)).ok;
}

/**
 * Per business unit whether the user may edit it within a meting (`magPlatformBewerken` per platform).
 * @param g - Active user
 * @param metingId - Meting id
 * @param units - Business units of the year with their platform
 * @returns business unit id -> may edit
 */
export async function magBusinessUnitsBewerken(
  g: GebruikerRecord,
  metingId: string,
  units: Array<{ id: string; platformId: string }>,
): Promise<Record<string, boolean>> {
  const platformIds = [...new Set(units.map((u) => u.platformId))];
  const perPlatform = new Map(await Promise.all(platformIds.map(async (p) => [p, await magPlatformBewerken(g, metingId, p)] as const)));
  return Object.fromEntries(units.map((u) => [u.id, perPlatform.get(u.platformId) ?? false]));
}
