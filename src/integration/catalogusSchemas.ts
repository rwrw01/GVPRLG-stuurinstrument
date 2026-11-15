import { z } from 'zod';

import { CONFIG } from '../service/config';

const NDS_IDS = CONFIG.ndsThemas.map((t) => t.id) as [string, ...string[]];

const Naam = z
  .string({ error: 'Vul een naam in.' })
  .trim()
  .min(1, { error: 'Vul een naam in.' })
  .max(100, { error: 'De naam mag maximaal 100 tekens zijn.' });
const Kort = z
  .string({ error: 'Vul een kort label in.' })
  .trim()
  .min(1, { error: 'Vul een kort label in.' })
  .max(22, { error: 'Het korte label mag maximaal 22 tekens zijn.' });
const Tekst = z
  .string({ error: 'Vul de vraagtekst in.' })
  .trim()
  .min(1, { error: 'De vraagtekst mag niet leeg zijn.' })
  .max(1000, { error: 'De vraagtekst mag maximaal 1000 tekens zijn.' });
const Nds = z.enum(NDS_IDS, { error: 'Kies een NDS-thema uit de lijst.' }).nullable();
const Sleutel = z.string({ error: 'Ongeldige sleutel.' }).min(1, { error: 'Ongeldige sleutel.' }).max(64, { error: 'Ongeldige sleutel.' });
const Vervallen = z.boolean({ error: 'Vervallen moet waar of onwaar zijn.' });
const OBJECT = { error: 'Verwacht een JSON-object.' };

function minstensEen<T extends Record<string, unknown>>(waarde: T): boolean {
  return Object.values(waarde).some((v) => v !== undefined);
}
const LEEG = { error: 'Geef minstens één wijziging op.' };

/** Body of `POST /api/beheer/assen`. */
export const NieuweAsSchema = z.object({ naam: Naam }, OBJECT);
/** Body of `PATCH /api/beheer/assen/{id}`. */
export const AsWijzigingSchema = z.object({ naam: Naam.optional(), vervallen: Vervallen.optional() }, OBJECT).refine(minstensEen, LEEG);

/** Body of `POST /api/beheer/vragen`. */
export const NieuweVraagSchema = z.object({ asId: Sleutel, kort: Kort, tekst: Tekst, nds: Nds.optional() }, OBJECT);
/** Body of `PATCH /api/beheer/vragen/{id}`; `nds: null` clears the theme. */
export const VraagWijzigingSchema = z
  .object({ asId: Sleutel.optional(), kort: Kort.optional(), tekst: Tekst.optional(), nds: Nds.optional(), vervallen: Vervallen.optional() }, OBJECT)
  .refine(minstensEen, LEEG);

/** Body of `POST /api/beheer/platformen`. */
export const NieuwPlatformSchema = z.object({ naam: Naam }, OBJECT);
/** Body of `PATCH /api/beheer/platformen/{id}`. */
export const PlatformWijzigingSchema = z.object({ naam: Naam.optional(), vervallen: Vervallen.optional() }, OBJECT).refine(minstensEen, LEEG);

/** Body of `POST /api/beheer/businessunits`. */
export const NieuweBusinessUnitSchema = z.object({ platformId: Sleutel, naam: Naam }, OBJECT);
/** Body of `PATCH /api/beheer/businessunits/{id}`. */
export const BusinessUnitWijzigingSchema = z
  .object({ platformId: Sleutel.optional(), naam: Naam.optional(), vervallen: Vervallen.optional() }, OBJECT)
  .refine(minstensEen, LEEG);

/** Body of `POST /api/beheer/{lijst}/{id}/verplaats`. */
export const VerplaatsSchema = z.object({ richting: z.enum(['omhoog', 'omlaag'], { error: 'Kies omhoog of omlaag.' }) }, OBJECT);

/** Route params of `/api/beheer/{lijst}/{id}` and its sub-routes. */
export const CatalogusIdParamsSchema = z.object({ id: Sleutel });

/**
 * The Dutch messages of a failed parse, as one problem detail.
 * @param error - The Zod error
 * @returns the messages joined with spaces
 */
export function nederlandseMelding(error: z.ZodError): string {
  return [...new Set(error.issues.map((i) => i.message))].join(' ');
}
