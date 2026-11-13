import type { AuditLogEntry, Prisma } from '@prisma/client';

import { prisma } from './prismaClient';

/** All audit actions the application records. */
export type AuditActie =
  | 'gebruiker_toegevoegd'
  | 'eerste_login'
  | 'ingelogd'
  | 'uitgelogd'
  | 'koppeling_toegevoegd'
  | 'koppeling_verwijderd'
  | 'rol_gewijzigd'
  | 'toegang_ingetrokken'
  | 'toegang_hersteld'
  | 'toegang_geweigerd'
  | 'platform_heropend'
  | 'account_ontkoppeld'
  | 'platform_opgeslagen_concept'
  | 'platform_afgerond';

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
 * @param filter - Optional year, platforms, actor and action; `limiet` caps the result size
 * @returns Matching audit rows ordered by `tijdstip` descending
 */
export async function zoekAudit(filter: AuditFilter): Promise<AuditLogEntry[]> {
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
