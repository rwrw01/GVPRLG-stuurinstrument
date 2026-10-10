import { NextRequest, NextResponse } from 'next/server';
import { RouteParamsSchema, SavePlatformScoreSchema } from '@/src/integration/schemas';
import { problemResponse } from '@/src/integration/problemResponse';
import { getMetingByJaar, savePlatformScore } from '@/src/data/metingenRepository';
import { CONFIG } from '@/src/service/config';
import { valideerVoorAfronden } from '@/src/process/platformWorkflow';
import { TEST_USER_ID } from '@/src/integration/testUser';

interface RouteParams {
  params: Promise<{ jaar: string; platformId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const parsedParams = RouteParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return problemResponse(400, 'Ongeldige invoer', parsedParams.error.message);
  }
  const { jaar, platformId } = parsedParams.data;
  if (!CONFIG.platformen.some((p) => p.id === platformId)) {
    return problemResponse(404, 'Onbekend platform', `Platform "${platformId}" bestaat niet.`);
  }

  const meting = await getMetingByJaar(jaar);
  if (!meting) {
    return problemResponse(404, 'Meting niet gevonden', `Geen meting voor jaar ${jaar}.`);
  }
  const platform = meting.platformen[platformId] ?? null;
  return NextResponse.json({ platform });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const parsedParams = RouteParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return problemResponse(400, 'Ongeldige invoer', parsedParams.error.message);
  }
  const { jaar, platformId } = parsedParams.data;
  if (!CONFIG.platformen.some((p) => p.id === platformId)) {
    return problemResponse(404, 'Onbekend platform', `Platform "${platformId}" bestaat niet.`);
  }

  const body = await request.json().catch(() => null);
  const parsed = SavePlatformScoreSchema.safeParse(body);
  if (!parsed.success) {
    return problemResponse(400, 'Ongeldige invoer', parsed.error.message);
  }

  const meting = await getMetingByJaar(jaar);
  if (!meting) {
    return problemResponse(404, 'Meting niet gevonden', `Geen meting voor jaar ${jaar}.`);
  }

  const bestaand = meting.platformen[platformId];
  if (bestaand?.status === 'definitief') {
    return problemResponse(409, 'Platform is al definitief', `Platform "${platformId}" is al afgerond voor jaar ${jaar}. Een beheerder moet dit eerst heropenen.`);
  }

  if (parsed.data.status === 'definitief') {
    const fout = valideerVoorAfronden(parsed.data.vraagScores);
    if (fout) return problemResponse(422, 'Kan niet afronden', fout);
  }

  await savePlatformScore({
    metingId: meting.id,
    platformId,
    status: parsed.data.status,
    algemeneToelichting: parsed.data.algemeneToelichting,
    laatstGewijzigdDoor: TEST_USER_ID,
    vraagScores: parsed.data.vraagScores,
  });

  return NextResponse.json({ ok: true });
}
