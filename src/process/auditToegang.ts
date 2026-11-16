import type { AuditFilter } from '../data/auditRepository';

/** The audit search as requested by the caller: at most one platform, optionally an actor. */
export type AuditVerzoek = Omit<AuditFilter, 'platformIds'> & { platformId?: string };

/**
 * Maps the requested audit search to the repository filter. The audit log is for beheerders only:
 * the caller must have refused every other role (`weigerRol(gebruiker, 'beheerder')`) before this
 * filter reaches `zoekAudit`, so no per-user scoping is applied here.
 * @param verzoek - Requested filter
 * @returns Filter for `zoekAudit`; without a platformId every platform matches
 */
export function naarAuditFilter(verzoek: AuditVerzoek): AuditFilter {
  const { platformId, ...rest } = verzoek;
  return { ...rest, platformIds: platformId ? [platformId] : undefined };
}
