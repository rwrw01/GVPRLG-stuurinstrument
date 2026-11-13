import { NextRequest, NextResponse } from 'next/server';
import { SavePlatformScoreSchema } from '@/src/integration/schemas';
import { problemResponse } from '@/src/integration/problemResponse';
import { weigerPlatformSchrijfrecht } from '@/src/integration/auth/sessie';
import { savePlatformScore } from '@/src/data/metingenRepository';
import { valideerVoorAfronden } from '@/src/process/platformWorkflow';

import { laadContext, type PlatformRouteParams } from './_context';

/**
 * Returns the scores of one platform within a meting for any active user.
 * @param _request - Incoming request (unused)
 * @param context - Route params with year and platform id
 * @returns 200 with the platform (or null when not filled in yet); 400/401/403/404 problem+json
 */
export async function GET(_request: NextRequest, { params }: PlatformRouteParams) {
  const context = await laadContext(params);
  if (!context.ok) return context.response;
  const platform = context.meting.platformen[context.platformId] ?? null;
  return NextResponse.json({ platform });
}

/**
 * Saves scores for one platform as concept or definitief; requires platform write access.
 * @param request - JSON body with status, general comment and question scores
 * @param context - Route params with year and platform id
 * @returns 200 when saved; 400/401/403/404/409/422 problem+json otherwise
 */
export async function PUT(request: NextRequest, { params }: PlatformRouteParams) {
  const context = await laadContext(params);
  if (!context.ok) return context.response;
  const { gebruiker, meting, platformId } = context;
  const geweigerd = await weigerPlatformSchrijfrecht(gebruiker, meting, platformId);
  if (geweigerd) return geweigerd;

  const parsed = SavePlatformScoreSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return problemResponse(400, 'Ongeldige invoer', parsed.error.message);
  }
  if (meting.platformen[platformId]?.status === 'definitief') {
    return problemResponse(409, 'Platform is al definitief', `Platform "${platformId}" is al afgerond voor jaar ${meting.jaar}. Een beheerder moet dit eerst heropenen.`);
  }
  if (parsed.data.status === 'definitief') {
    const fout = valideerVoorAfronden(parsed.data.vraagScores);
    if (fout) return problemResponse(422, 'Kan niet afronden', fout);
  }

  await savePlatformScore({
    metingId: meting.id,
    jaar: meting.jaar,
    platformId,
    status: parsed.data.status,
    algemeneToelichting: parsed.data.algemeneToelichting,
    laatstGewijzigdDoor: gebruiker.id,
    actorEmail: gebruiker.email,
    vraagScores: parsed.data.vraagScores,
  });
  return NextResponse.json({ ok: true });
}
