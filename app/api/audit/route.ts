import type { AuditLogEntry } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { zoekAudit } from '@/src/data/auditRepository';
import { vindGebruikersOpIds } from '@/src/data/gebruikersRepository';
import { vereisGebruiker, weigerRol } from '@/src/integration/auth/sessie';
import { AuditFilterSchema } from '@/src/integration/beheerSchemas';
import { problemResponse } from '@/src/integration/problemResponse';
import { naarAuditFilter } from '@/src/process/auditToegang';

type AuditRegelMetActor = AuditLogEntry & { actorNaam: string | null; actorEmail: string | null };

// Resolves the actor ids (Gebruiker.id) to a readable identity in one query. Unknown actors
// (seed scripts, `onbekend`, a raw Keycloak sub of a refused login) get null; keycloakSub never leaves.
async function _metActorIdentiteit(regels: AuditLogEntry[]): Promise<AuditRegelMetActor[]> {
  const gebruikers = await vindGebruikersOpIds(regels.map((r) => r.actor));
  const perId = new Map(gebruikers.map((g) => [g.id, g]));
  return regels.map((r) => {
    const g = perId.get(r.actor);
    return { ...r, actorNaam: g?.naam ?? null, actorEmail: g?.email ?? null };
  });
}

/**
 * Searches the audit log, newest first; beheerder only (an invuller or lezer gets an audited 403).
 * @param request - Request with optional query `jaar`, `platformId`, `actor`, `actie`, `limiet` (1-500, default 200)
 * @returns 200 `{ regels }` with `actorNaam`/`actorEmail` per row; 400/401/403 problem+json otherwise
 */
export async function GET(request: NextRequest) {
  const sessie = await vereisGebruiker();
  if (!sessie.ok) return sessie.response;
  const geweigerd = await weigerRol(sessie.gebruiker, 'beheerder');
  if (geweigerd) return geweigerd;

  const query = AuditFilterSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!query.success) return problemResponse(400, 'Ongeldige invoer', query.error.message);
  const regels = await zoekAudit(naarAuditFilter(query.data));
  return NextResponse.json({ regels: await _metActorIdentiteit(regels) });
}
