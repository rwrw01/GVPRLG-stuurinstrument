import { NextRequest, NextResponse } from 'next/server';

import { heropenBusinessUnit } from '@/src/data/metingenRepository';
import { weigerRol } from '@/src/integration/auth/sessie';
import { problemResponse } from '@/src/integration/problemResponse';

import { laadContext, type BusinessUnitRouteParams } from '../_context';

/**
 * Reopens a finalised business unit row (definitief -> concept); beheerder only. The repository writes
 * the `platform_heropend` audit entry.
 * @param _request - Incoming request (unused; no body)
 * @param context - Route params with year and business unit id
 * @returns 200 `{ ok: true }` when reopened; 400/401/403/404/409 problem+json otherwise
 */
export async function POST(_request: NextRequest, { params }: BusinessUnitRouteParams) {
  const context = await laadContext(params, (gebruiker) => weigerRol(gebruiker, 'beheerder'));
  if (!context.ok) return context.response;
  const { gebruiker, meting, unit } = context;

  const resultaat = await heropenBusinessUnit({ metingId: meting.id, businessUnitId: unit.id, actor: gebruiker.id });
  if (resultaat === 'niet-gevonden') {
    return problemResponse(404, 'Businessunit nog niet ingevuld', `${unit.naam} is nog niet ingevuld voor jaar ${meting.jaar}.`);
  }
  if (resultaat === 'niet-definitief') {
    return problemResponse(409, 'Businessunit is niet definitief', `${unit.naam} is nog niet afgerond voor jaar ${meting.jaar}.`);
  }
  return NextResponse.json({ ok: true });
}
