import type { AuditLogEntry, Prisma } from '@prisma/client';

import { prisma } from './prismaClient';

/** All audit actions the application records (also used to validate the audit query filter). */
export const AUDIT_ACTIES = [
  'gebruiker_toegevoegd',
  'eerste_login',
  'ingelogd',
  'uitgelogd',
  'koppeling_toegevoegd',
  'koppeling_verwijderd',
  'rol_gewijzigd',
  'toegang_ingetrokken',
  'toegang_hersteld',
  'toegang_geweigerd',
  'platform_heropend',
  'account_ontkoppeld',
  'platform_opgeslagen_concept',
  'platform_afgerond',
  'catalogus_toegevoegd',
  'catalogus_gewijzigd',
  'catalogus_verplaatst',
  'meting_vrijgegeven',
] as const;

/** One of the audit actions in `AUDIT_ACTIES`. */
export type AuditActie = (typeof AUDIT_ACTIES)[number];

export interface AuditEntryInput {
  actor: string;
  actie: AuditActie;
  doelType: string;
  doelId: string;
  detail?: string;
}

export interface AuditFilter {
  jaar?: number;
  platformIds?: string[];
  actor?: string;
  actie?: AuditActie;
  limiet: number;
}

/**
 * Builds the `detail` string for a platform-scoped audit entry, which `zoekAudit` filters on.
 * @param platformId - Platform id
 * @param jaar - Measurement year
 * @returns Detail string in the form `platform=<id>;jaar=<jaar>`
 */
export function platformDetail(platformId: string, jaar: number): string {
  return `platform=${platformId};jaar=${jaar}`;
}

/**
 * Builds the `detail` string for an audit entry about one business unit row; the platform part keeps
 * the platform and year filters of `zoekAudit` working.
 * @param platformId - Platform the business unit belongs to in that year
 * @param businessUnitId - Business unit id
 * @param jaar - Measurement year
 * @returns Detail string in the form `platform=<id>;businessunit=<id>;jaar=<jaar>`
 */
export function businessUnitDetail(platformId: string, businessUnitId: string, jaar: number): string {
  return `platform=${platformId};businessunit=${businessUnitId};jaar=${jaar}`;
}

/**
 * JSON for a free-text part of an audit detail. `;` and `=` are written as JSON escapes (still
 * valid JSON, they only ever occur inside strings), so text such as a question that contains
 * ";jaar=2027" can never make the year or platform filter of `zoekAudit` match.
 * @param waarde - Value to serialise
 * @returns JSON without a raw `;` or `=`
 */
export function auditJson(waarde: unknown): string {
  return JSON.stringify(waarde).replace(/;/g, '\\u003b').replace(/=/g, '\\u003d');
}

/**
 * Writes one audit row, through the given transaction client when provided.
 * @param entry - Actor, action, target and optional detail
 * @param tx - Optional transaction client so the row commits with the caller's changes
 * @returns Promise that resolves once the row is written
 */
export async function schrijfAudit(entry: AuditEntryInput, tx?: Prisma.TransactionClient): Promise<void> {
  const client = tx ?? prisma;
  await client.auditLogEntry.create({
    data: {
      actor: entry.actor,
      actie: entry.actie,
      doelType: entry.doelType,
      doelId: entry.doelId,
      detail: entry.detail ?? '',
    },
  });
}

/**
 * Searches the audit log, newest first. Year and platform filters match the `detail` string.
 * @param filter - Optional year, platforms, actor and action; `limiet` caps the result size.
 *   An empty `platformIds` list matches nothing (a nested `OR: []` would match every row).
 * @returns Matching audit rows ordered by `tijdstip` descending
 */
export async function zoekAudit(filter: AuditFilter): Promise<AuditLogEntry[]> {
  if (filter.platformIds?.length === 0) return [];
  const and: Prisma.AuditLogEntryWhereInput[] = [];
  if (filter.jaar !== undefined) and.push({ detail: { contains: `;jaar=${filter.jaar}` } });
  if (filter.platformIds !== undefined) {
    and.push({ OR: filter.platformIds.map((id) => ({ detail: { contains: `platform=${id};` } })) });
  }
  if (filter.actor !== undefined) and.push({ actor: filter.actor });
  if (filter.actie !== undefined) and.push({ actie: filter.actie });
  return prisma.auditLogEntry.findMany({
    where: { AND: and },
    orderBy: { tijdstip: 'desc' },
    take: filter.limiet,
  });
}
