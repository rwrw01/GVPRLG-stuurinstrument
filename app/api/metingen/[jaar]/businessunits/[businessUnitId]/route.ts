import { NextRequest, NextResponse } from 'next/server';

import { weigerBusinessUnitSchrijfrecht } from '@/src/integration/auth/sessie';
import { problemResponse } from '@/src/integration/problemResponse';
import { SaveBusinessUnitScoreSchema } from '@/src/integration/schemas';
import { slaBusinessUnitOp } from '@/src/process/platformWorkflow';
import { magPlatformBewerken } from '@/src/process/toegang';

import { laadContext, type BusinessUnitRouteParams } from './_context';

/**
 * Returns the row of one business unit within a meting for any active user, with whether that
 * user may edit it (the same rule as the write check of PUT).
 * @param _request - Incoming request (unused)
 * @param context - Route params with year and business unit id
 * @returns 200 with the row (null when not filled in yet), the unit and `magBewerken`; 400/401/403/404 problem+json
 */
export async function GET(_request: NextRequest, { params }: BusinessUnitRouteParams) {
  const context = await laadContext(params);
  if (!context.ok) return context.response;
  const { gebruiker, meting, unit } = context;
  const businessUnit = meting.businessUnits[unit.id] ?? null;
  const magBewerken = await magPlatformBewerken(gebruiker, meting.id, unit.platformId);
  return NextResponse.json({ businessUnit, unit, magBewerken });
}

/**
 * Saves the row of one business unit as concept or definitief; requires write access to its
 * platform. The first save of a year freezes its questionnaire in the same transaction.
 * @param request - JSON body with status, general comment, aanwezigen and question scores
 * @param context - Route params with year and business unit id
 * @returns 200 when saved; 400/401/403/404/409/422 problem+json otherwise
 */
export async function PUT(request: NextRequest, { params }: BusinessUnitRouteParams) {
  const context = await laadContext(params);
  if (!context.ok) return context.response;
  const { gebruiker, meting, unit } = context;
  const geweigerd = await weigerBusinessUnitSchrijfrecht(gebruiker, meting, unit);
  if (geweigerd) return geweigerd;

  const parsed = SaveBusinessUnitScoreSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return problemResponse(400, 'Ongeldige invoer', parsed.error.message);

  const resultaat = await slaBusinessUnitOp(gebruiker, meting, unit, parsed.data);
  if (!resultaat.ok) return problemResponse(resultaat.error.status, resultaat.error.titel, resultaat.error.detail);
  return NextResponse.json({ ok: true });
}
