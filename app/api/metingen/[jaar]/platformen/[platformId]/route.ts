import { NextRequest, NextResponse } from 'next/server';
import { SavePlatformScoreSchema } from '@/src/integration/schemas';
import { problemResponse } from '@/src/integration/problemResponse';
import { getMetingByJaar, savePlatformScore } from '@/src/data/metingenRepository';
import { CONFIG } from '@/src/service/config';
import { valideerVoorAfronden } from '@/src/process/platformWorkflow';
import { TEST_USER_ID } from '@/src/integration/testUser';

interface RouteParams {
  params: Promise<{ jaar: string; platformId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { jaar: jaarParam, platformId } = await params;
  const jaar = Number(jaarParam);
  const meting = await getMetingByJaar(jaar);
  if (!meting) {
    return problemResponse(404, 'Meting niet gevonden', `Geen meting voor jaar ${jaar}.`);
  }
  const platform = meting.platformen[platformId] ?? null;
  return NextResponse.json({ platform });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { jaar: jaarParam, platformId } = await params;
  const jaar = Number(jaarParam);
  if (!CONFIG.platformen.some((p) => p.id === platformId)) {
    return problemResponse(404, 'Onbekend platform', `Platform "${platformId}" bestaat niet.`);
  }
  const body = await request.json().catch(() => null);
  const parsed = SavePlatformScoreSchema.safeParse(body);
  if (!parsed.success) {
    return problemResponse(400, 'Ongeldige invoer', parsed.error.message);
  }
  if (parsed.data.status === 'definitief') {
    const fout = valideerVoorAfronden(parsed.data.vraagScores);
    if (fout) return problemResponse(422, 'Kan niet afronden', fout);
  }
  const meting = await getMetingByJaar(jaar);
  if (!meting) {
    return problemResponse(404, 'Meting niet gevonden', `Geen meting voor jaar ${jaar}.`);
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
