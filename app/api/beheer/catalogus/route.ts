import { NextResponse } from 'next/server';

import { vereisGebruiker } from '@/src/integration/auth/sessie';
import { catalogusDto } from '@/src/integration/catalogusRoutes';
import { haalCatalogus } from '@/src/process/catalogusWorkflow';

/**
 * Returns the full catalogue (removed items included) and per year whether its list is frozen,
 * for any active user; only a beheerder can change it.
 * @returns 200 with axes (with questions), platforms (with business units) and metingen; 401/403 problem+json
 */
export async function GET() {
  const sessie = await vereisGebruiker();
  if (!sessie.ok) return sessie.response;
  return NextResponse.json(catalogusDto(await haalCatalogus()));
}
