import { NextRequest, NextResponse } from 'next/server';

import { heropenPlatform } from '@/src/data/metingenRepository';
import { weigerRol } from '@/src/integration/auth/sessie';
import { problemResponse } from '@/src/integration/problemResponse';

import { laadContext, type PlatformRouteParams } from '../_context';

/**
 * Reopens a finalised platform (definitief -> concept); beheerder only. The repository writes
 * the `platform_heropend` audit entry.
 * @param _request - Incoming request (unused; no body)
 * @param context - Route params with year and platform id
 * @returns 200 `{ ok: true }` when reopened; 400/401/403/404/409 problem+json otherwise
 */
export async function POST(_request: NextRequest, { params }: PlatformRouteParams) {
  const context = await laadContext(params, (gebruiker) => weigerRol(gebruiker, 'beheerder'));
  if (!context.ok) return context.response;
  const { gebruiker, meting, platformId } = context;

  const resultaat = await heropenPlatform({ metingId: meting.id, platformId, actor: gebruiker.id });
  if (resultaat === 'niet-gevonden') {
    return problemResponse(404, 'Platform nog niet ingevuld', `Platform "${platformId}" is nog niet ingevuld voor jaar ${meting.jaar}.`);
  }
  if (resultaat === 'niet-definitief') {
    return problemResponse(409, 'Platform is niet definitief', `Platform "${platformId}" is nog niet afgerond voor jaar ${meting.jaar}.`);
  }
  return NextResponse.json({ ok: true });
}
