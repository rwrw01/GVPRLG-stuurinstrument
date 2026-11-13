import { NextRequest, NextResponse } from 'next/server';

import { zoekAudit, type AuditFilter } from '@/src/data/auditRepository';
import { platformIdsVanGebruiker, type GebruikerRecord } from '@/src/data/gebruikersRepository';
import { vereisGebruiker } from '@/src/integration/auth/sessie';
import { AuditFilterSchema } from '@/src/integration/beheerSchemas';
import { problemResponse } from '@/src/integration/problemResponse';

type AuditQuery = ReturnType<typeof AuditFilterSchema.parse>;

// A beheerder sees everything. An invuller only sees rows of platforms he is assigned to in any
// year (an empty set yields no rows) and cannot filter on actor.
async function filterVoor(gebruiker: GebruikerRecord, query: AuditQuery): Promise<AuditFilter> {
  const { platformId, actor, ...rest } = query;
  if (gebruiker.rol === 'beheerder') {
    return { ...rest, actor, platformIds: platformId ? [platformId] : undefined };
  }
  const eigen = await platformIdsVanGebruiker(gebruiker.id);
  const platformIds = platformId && eigen.includes(platformId) ? [platformId] : eigen;
  return { ...rest, platformIds };
}

/**
 * Searches the audit log, newest first, scoped to what the logged-in user may see.
 * @param request - Request with optional query `jaar`, `platformId`, `actor`, `actie`, `limiet` (1-500, default 200)
 * @returns 200 `{ regels }`; 400/401/403 problem+json otherwise
 */
export async function GET(request: NextRequest) {
  const sessie = await vereisGebruiker();
  if (!sessie.ok) return sessie.response;

  const query = AuditFilterSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!query.success) return problemResponse(400, 'Ongeldige invoer', query.error.message);
  const regels = await zoekAudit(await filterVoor(sessie.gebruiker, query.data));
  return NextResponse.json({ regels });
}
