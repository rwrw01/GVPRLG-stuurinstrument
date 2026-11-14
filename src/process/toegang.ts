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
 * @returns The user, 403 `alleen-lezen` for a reader, or 403 `geen-koppeling` for an unassigned filler
 */
export async function vereisPlatformSchrijfrecht(
  g: GebruikerRecord,
  metingId: string,
  platformId: string,
): Promise<Result<GebruikerRecord, Weigering>> {
  if (g.rol === 'lezer') return fail({ status: 403, reden: 'alleen-lezen' });
  if (g.rol === 'beheerder') return ok(g);
  if (await heeftKoppeling(g.id, metingId, platformId)) return ok(g);
  return fail({ status: 403, reden: 'geen-koppeling' });
}
