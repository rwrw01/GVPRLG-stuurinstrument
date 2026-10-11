import { NextRequest, NextResponse } from 'next/server';
import { JaarParamsSchema } from '@/src/integration/schemas';
import { problemResponse } from '@/src/integration/problemResponse';
import { getMetingByJaar } from '@/src/data/metingenRepository';

interface RouteParams {
  params: Promise<{ jaar: string }>;
}

/**
 * Returns one meting with the status and scores of every platform filled in so far.
 * @param _request incoming request (unused)
 * @param context route params with the measurement year
 * @returns 200 with the meting, 400 on an invalid year, 404 when the year does not exist
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const parsed = JaarParamsSchema.safeParse(await params);
  if (!parsed.success) {
    return problemResponse(400, 'Ongeldige invoer', parsed.error.message);
  }
  const meting = await getMetingByJaar(parsed.data.jaar);
  if (!meting) {
    return problemResponse(404, 'Meting niet gevonden', `Geen meting voor jaar ${parsed.data.jaar}.`);
  }
  return NextResponse.json({ meting });
}
