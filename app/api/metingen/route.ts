import { NextRequest, NextResponse } from 'next/server';
import { CreateMetingSchema } from '@/src/integration/schemas';
import { problemResponse } from '@/src/integration/problemResponse';
import { createMeting, listMetingen } from '@/src/data/metingenRepository';

export async function GET() {
  const metingen = await listMetingen();
  return NextResponse.json({ metingen });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = CreateMetingSchema.safeParse(body);
  if (!parsed.success) {
    return problemResponse(400, 'Ongeldige invoer', parsed.error.message);
  }
  const bestaande = await listMetingen();
  if (bestaande.some((m) => m.jaar === parsed.data.jaar)) {
    return problemResponse(409, 'Meting bestaat al', `Er bestaat al een meting voor ${parsed.data.jaar}.`);
  }
  const meting = await createMeting(parsed.data.jaar);
  return NextResponse.json({ meting }, { status: 201 });
}
