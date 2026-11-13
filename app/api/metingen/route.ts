import { NextRequest, NextResponse } from 'next/server';
import { CreateMetingSchema } from '@/src/integration/schemas';
import { problemResponse } from '@/src/integration/problemResponse';
import { vereisGebruiker, weigerRol } from '@/src/integration/auth/sessie';
import { createMeting, listMetingen } from '@/src/data/metingenRepository';

/**
 * Lists all metingen for any active user.
 * @returns 200 with the metingen, or 401/403 problem+json without an active session
 */
export async function GET() {
  const sessie = await vereisGebruiker();
  if (!sessie.ok) return sessie.response;
  const metingen = await listMetingen();
  return NextResponse.json({ metingen });
}

/**
 * Creates a meting for a year; administrators only.
 * @param request - JSON body with `jaar`
 * @returns 201 with the meting; 401/403 without access; 400 on invalid input; 409 on a duplicate year
 */
export async function POST(request: NextRequest) {
  const sessie = await vereisGebruiker();
  if (!sessie.ok) return sessie.response;
  const geweigerd = await weigerRol(sessie.gebruiker, 'beheerder');
  if (geweigerd) return geweigerd;

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
