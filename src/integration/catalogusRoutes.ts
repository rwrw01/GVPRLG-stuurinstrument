import { NextRequest, NextResponse } from 'next/server';
import type { z } from 'zod';

import type { CatalogusRij, CatalogusSoort } from '../data/catalogusRepository';
import { voegToe, verplaats, wijzig, type Catalogus, type CatalogusFout, type ItemWijziging, type NieuwItem } from '../process/catalogusWorkflow';
import type { Result } from '../service/result';
import { vereisGebruiker, weigerRol } from './auth/sessie';
import { CatalogusIdParamsSchema, nederlandseMelding, VerplaatsSchema } from './catalogusSchemas';
import { problemResponse } from './problemResponse';

/** Route context of `/api/beheer/{lijst}/{id}` and its sub-routes. */
export interface CatalogusRouteParams {
  params: Promise<{ id: string }>;
}

type Body = { naam?: string; tekst?: string; asId?: string; platformId?: string; kort?: string; nds?: string | null; vervallen?: boolean };

/**
 * One row in the API shape of its list (OpenAPI CatalogusAs, CatalogusVraag, CatalogusPlatform, CatalogusBusinessUnit).
 * @param soort - Which list
 * @param r - The row
 * @returns the API object
 */
export function naarDto(soort: CatalogusSoort, r: CatalogusRij) {
  const basis = { id: r.id, volgorde: r.volgorde, vervallen: r.vervallen };
  switch (soort) {
    case 'as':
      return { ...basis, naam: r.naam, kleur: r.kleur };
    case 'vraag':
      return { ...basis, asId: r.ouderId, kort: r.kort, tekst: r.naam, nds: r.nds };
    case 'platform':
      return { ...basis, naam: r.naam };
    case 'businessunit':
      return { ...basis, platformId: r.ouderId, naam: r.naam, kleur: r.kleur };
  }
}

/**
 * The full catalogue in the API shape: axes with their questions, platforms with their business units.
 * @param c - Catalogue from the process layer
 * @returns the response body of `GET /api/beheer/catalogus`
 */
export function catalogusDto(c: Catalogus) {
  return {
    assen: c.assen.map((a) => ({ ...naarDto('as', a), vragen: c.vragen.filter((v) => v.ouderId === a.id).map((v) => naarDto('vraag', v)) })),
    platformen: c.platformen.map((p) => ({ ...naarDto('platform', p), businessUnits: c.businessUnits.filter((b) => b.ouderId === p.id).map((b) => naarDto('businessunit', b)) })),
    metingen: c.metingen,
  };
}

// Maps an entity body to the uniform fields (question text and parent ids have their own names in the API).
function naarVelden({ tekst, asId, platformId, ...rest }: Body): NieuwItem & ItemWijziging {
  return { ...rest, naam: tekst ?? rest.naam!, ouderId: asId ?? platformId };
}

// Session (401/403), role beheerder (403, audited as a denial), then the parsed JSON body.
async function vereisBeheerderEnBody<T>(request: NextRequest, schema: z.ZodType<T>): Promise<{ ok: true; gebruiker: Parameters<typeof voegToe>[0]; body: T } | { ok: false; response: NextResponse }> {
  const sessie = await vereisGebruiker();
  if (!sessie.ok) return sessie;
  const geweigerd = await weigerRol(sessie.gebruiker, 'beheerder');
  if (geweigerd) return { ok: false, response: geweigerd };
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return { ok: false, response: problemResponse(400, 'Ongeldige invoer', nederlandseMelding(parsed.error)) };
  return { ok: true, gebruiker: sessie.gebruiker, body: parsed.data };
}

function antwoord(soort: CatalogusSoort, resultaat: Result<CatalogusRij, CatalogusFout>, status = 200): NextResponse {
  if (!resultaat.ok) return problemResponse(resultaat.error.status, resultaat.error.status === 404 ? 'Niet gevonden' : 'Niet toegestaan', resultaat.error.detail);
  return NextResponse.json(naarDto(soort, resultaat.data), { status });
}

async function leesId(params: CatalogusRouteParams['params']): Promise<string | null> {
  const parsed = CatalogusIdParamsSchema.safeParse(await params);
  return parsed.success ? parsed.data.id : null;
}

/**
 * Builds the POST handler that adds an item to one list; beheerder only.
 * @param soort - Which list
 * @param schema - Zod schema of the body
 * @returns the route handler: 201 with the item; 400/401/403/404/409 problem+json otherwise
 */
export function catalogusToevoegen<T extends Body>(soort: CatalogusSoort, schema: z.ZodType<T>) {
  return async function POST(request: NextRequest): Promise<NextResponse> {
    const toegang = await vereisBeheerderEnBody(request, schema);
    if (!toegang.ok) return toegang.response;
    return antwoord(soort, await voegToe(toegang.gebruiker, soort, naarVelden(toegang.body)), 201);
  };
}

/**
 * Builds the PATCH handler that changes, removes or restores an item; beheerder only.
 * @param soort - Which list
 * @param schema - Zod schema of the body
 * @returns the route handler: 200 with the item; 400/401/403/404/409 problem+json otherwise
 */
export function catalogusWijzigen<T extends Body>(soort: CatalogusSoort, schema: z.ZodType<T>) {
  return async function PATCH(request: NextRequest, { params }: CatalogusRouteParams): Promise<NextResponse> {
    const toegang = await vereisBeheerderEnBody(request, schema);
    if (!toegang.ok) return toegang.response;
    const id = await leesId(params);
    if (!id) return problemResponse(400, 'Ongeldige invoer', 'Ongeldige sleutel.');
    return antwoord(soort, await wijzig(toegang.gebruiker, soort, id, naarVelden(toegang.body)));
  };
}

/**
 * Builds the POST handler that moves an item one place up or down; beheerder only.
 * @param soort - Which list
 * @returns the route handler: 200 with the item; 400/401/403/404/409 problem+json otherwise
 */
export function catalogusVerplaatsen(soort: CatalogusSoort) {
  return async function POST(request: NextRequest, { params }: CatalogusRouteParams): Promise<NextResponse> {
    const toegang = await vereisBeheerderEnBody(request, VerplaatsSchema);
    if (!toegang.ok) return toegang.response;
    const id = await leesId(params);
    if (!id) return problemResponse(400, 'Ongeldige invoer', 'Ongeldige sleutel.');
    return antwoord(soort, await verplaats(toegang.gebruiker, soort, id, toegang.body.richting));
  };
}
