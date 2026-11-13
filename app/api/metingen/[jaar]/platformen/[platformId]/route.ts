import { NextRequest, NextResponse } from 'next/server';
import { RouteParamsSchema, SavePlatformScoreSchema } from '@/src/integration/schemas';
import { problemResponse } from '@/src/integration/problemResponse';
import { vereisGebruiker, weigerPlatformSchrijfrecht } from '@/src/integration/auth/sessie';
import type { GebruikerRecord } from '@/src/data/gebruikersRepository';
import { getMetingByJaar, savePlatformScore, type MetingWithPlatformen } from '@/src/data/metingenRepository';
import { CONFIG } from '@/src/service/config';
import { valideerVoorAfronden } from '@/src/process/platformWorkflow';

interface RouteParams {
  params: Promise<{ jaar: string; platformId: string }>;
}

type PlatformContext =
  | { ok: true; gebruiker: GebruikerRecord; meting: MetingWithPlatformen; platformId: string }
  | { ok: false; response: NextResponse };

/**
 * Shared checks for both methods, in a fixed order: params (400) -> session (401/403) ->
 * known platform (404) -> existing meting (404).
 * @param params - Raw route params
 * @returns The user, meting and platform id, or the problem+json response to return
 */
async function laadContext(params: RouteParams['params']): Promise<PlatformContext> {
  const parsedParams = RouteParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return { ok: false, response: problemResponse(400, 'Ongeldige invoer', parsedParams.error.message) };
  }
  const sessie = await vereisGebruiker();
  if (!sessie.ok) return sessie;
  const { jaar, platformId } = parsedParams.data;
  if (!CONFIG.platformen.some((p) => p.id === platformId)) {
    return { ok: false, response: problemResponse(404, 'Onbekend platform', `Platform "${platformId}" bestaat niet.`) };
  }
  const meting = await getMetingByJaar(jaar);
  if (!meting) {
    return { ok: false, response: problemResponse(404, 'Meting niet gevonden', `Geen meting voor jaar ${jaar}.`) };
  }
  return { ok: true, gebruiker: sessie.gebruiker, meting, platformId };
}

/**
 * Returns the scores of one platform within a meting for any active user.
 * @param _request - Incoming request (unused)
 * @param context - Route params with year and platform id
 * @returns 200 with the platform (or null when not filled in yet); 400/401/403/404 problem+json
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
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
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
