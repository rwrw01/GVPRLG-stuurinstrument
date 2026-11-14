import type { AuditFilter } from '../data/auditRepository';
import { platformIdsVanGebruiker, type GebruikerRecord } from '../data/gebruikersRepository';

/** The audit search as requested by the caller: at most one platform, optionally an actor. */
export type AuditVerzoek = Omit<AuditFilter, 'platformIds'> & { platformId?: string };

/**
 * Scopes an audit search to what the user may see. A beheerder sees everything. An invuller only
 * sees rows of platforms he is assigned to in any year (an empty set yields no rows), cannot pick
 * a foreign platform and cannot filter on actor. A lezer gets the invuller view without any
 * platform (`platformIds: []`, so no rows), regardless of any assignment rows.
 * @param gebruiker - Active user behind the session
 * @param verzoek - Requested filter
 * @returns Filter for `zoekAudit`
 */
export async function beperkAuditFilterTotGebruiker(
  gebruiker: GebruikerRecord,
  verzoek: AuditVerzoek,
): Promise<AuditFilter> {
  const { platformId, actor, ...rest } = verzoek;
  if (gebruiker.rol === 'beheerder') {
    return { ...rest, actor, platformIds: platformId ? [platformId] : undefined };
  }
  // Defence in depth: a lezer sees no platform rows, even if a stray assignment exists.
  if (gebruiker.rol === 'lezer') return { ...rest, platformIds: [] };
  const eigen = await platformIdsVanGebruiker(gebruiker.id);
  const platformIds = platformId && eigen.includes(platformId) ? [platformId] : eigen;
  return { ...rest, platformIds };
}
