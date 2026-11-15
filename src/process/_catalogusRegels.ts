import type { CatalogusRij, CatalogusSoort } from '../data/catalogusRepository';
import { MINIMUM_VRAGEN } from '../data/vragenlijstRepository';
import { AS_PALET, BUSINESS_UNIT_PALET, volgendeVrijeKleur } from '../service/paletten';

/** A refused catalogue change: 404 for an unknown item, 409 for a rule. Detail is Dutch. */
export interface CatalogusFout {
  status: 404 | 409;
  detail: string;
}

/** The list a question or business unit hangs under. */
export const OUDER: Partial<Record<CatalogusSoort, CatalogusSoort>> = { vraag: 'as', businessunit: 'platform' };

const NIET_GEVONDEN: Record<CatalogusSoort, string> = {
  as: 'Deze as bestaat niet.',
  vraag: 'Deze vraag bestaat niet.',
  platform: 'Dit platform bestaat niet.',
  businessunit: 'Deze businessunit bestaat niet.',
};

/**
 * The 404 refusal for an unknown item.
 * @param soort - Which list
 * @returns the refusal
 */
export function nietGevonden(soort: CatalogusSoort): CatalogusFout {
  return { status: 404, detail: NIET_GEVONDEN[soort] };
}

/**
 * Checks the parent an active question or business unit would hang under.
 * @param soort - `vraag` or `businessunit`
 * @param ouder - The parent row, or undefined when it does not exist
 * @returns null when allowed, otherwise 404 (unknown) or 409 (removed parent)
 */
export function controleerOuder(soort: CatalogusSoort, ouder: CatalogusRij | undefined): CatalogusFout | null {
  const ouderSoort = OUDER[soort];
  if (!ouderSoort) return null;
  if (!ouder) return nietGevonden(ouderSoort);
  if (!ouder.vervallen) return null;
  return ouderSoort === 'as'
    ? { status: 409, detail: `De as ${ouder.naam} is verwijderd. Maak eerst de as weer actief.` }
    : { status: 409, detail: `Het platform ${ouder.naam} is vervallen. Maak eerst het platform weer actief.` };
}

/**
 * Checks whether an item may be removed (vervallen).
 * @param soort - Which list
 * @param item - The item to remove
 * @param rijen - Rows of the item's own list
 * @param kinderen - Rows of the child list (questions of an axis, business units of a platform)
 * @returns null when allowed, otherwise a 409 refusal
 */
export function controleerVervallen(soort: CatalogusSoort, item: CatalogusRij, rijen: CatalogusRij[], kinderen: CatalogusRij[]): CatalogusFout | null {
  const actieveKinderen = kinderen.some((k) => k.ouderId === item.id && !k.vervallen);
  if (soort === 'as' && actieveKinderen) {
    return { status: 409, detail: `De as ${item.naam} heeft nog actieve vragen. Verplaats of verwijder die vragen eerst.` };
  }
  if (soort === 'platform' && actieveKinderen) {
    return { status: 409, detail: `Het platform ${item.naam} heeft nog actieve businessunits. Verplaats die eerst of laat ze eerst vervallen.` };
  }
  const overblijvend = rijen.filter((r) => !r.vervallen && r.id !== item.id).length;
  if (soort === 'vraag' && overblijvend < MINIMUM_VRAGEN) {
    return { status: 409, detail: `Er moeten minstens ${MINIMUM_VRAGEN} actieve vragen overblijven; een spinnenweb heeft ${MINIMUM_VRAGEN} spaken nodig.` };
  }
  return null;
}

/**
 * The colour of a new axis or business unit: the first palette colour no item ever used.
 * @param soort - Which list
 * @param rijen - Every row of that list, removed ones included
 * @returns `{ kleur }` (null for lists without colour), or a 409 refusal when the palette is used up
 */
export function nieuweKleur(soort: CatalogusSoort, rijen: CatalogusRij[]): { kleur: string | null } | CatalogusFout {
  if (soort !== 'as' && soort !== 'businessunit') return { kleur: null };
  const palet = soort === 'as' ? AS_PALET : BUSINESS_UNIT_PALET;
  const kleur = volgendeVrijeKleur(palet, rijen.map((r) => r.kleur));
  if (kleur) return { kleur };
  const wat = soort === 'as' ? `as (maximaal ${palet.length})` : `businessunit (maximaal ${palet.length})`;
  return { status: 409, detail: `Er is geen kleur meer vrij voor een nieuwe ${wat}. Het palet moet eerst in de code worden uitgebreid.` };
}

/**
 * The next order number among the siblings (same parent).
 * @param rijen - Rows of the list
 * @param ouderId - Parent id (null for axes and platforms)
 * @returns one more than the highest order number, 0 for the first
 */
export function volgendeVolgorde(rijen: CatalogusRij[], ouderId: string | null): number {
  return rijen.filter((r) => r.ouderId === ouderId).reduce((max, r) => Math.max(max, r.volgorde + 1), 0);
}

/**
 * The active siblings in their order after moving one item up or down.
 * @param rijen - Rows of the list
 * @param item - The item to move (active)
 * @param richting - `omhoog` or `omlaag`
 * @returns the reordered siblings, or a 409 refusal at the edge
 */
export function nieuweVolgorde(rijen: CatalogusRij[], item: CatalogusRij, richting: 'omhoog' | 'omlaag'): CatalogusRij[] | CatalogusFout {
  if (item.vervallen) return { status: 409, detail: 'Een verwijderd item kan niet worden verplaatst. Maak het eerst weer actief.' };
  const broers = rijen.filter((r) => r.ouderId === item.ouderId && !r.vervallen).sort((a, b) => a.volgorde - b.volgorde);
  const i = broers.findIndex((r) => r.id === item.id);
  const j = richting === 'omhoog' ? i - 1 : i + 1;
  if (j < 0 || j >= broers.length) return { status: 409, detail: richting === 'omhoog' ? 'Dit staat al bovenaan.' : 'Dit staat al onderaan.' };
  [broers[i], broers[j]] = [broers[j]!, broers[i]!];
  return broers;
}

/**
 * The fields that differ between two versions of a row, for the audit detail.
 * @param oud - Row before
 * @param nieuw - Row after
 * @returns old and new values of the changed fields
 */
export function verschil(oud: CatalogusRij, nieuw: CatalogusRij): { oud: Partial<CatalogusRij>; nieuw: Partial<CatalogusRij> } {
  const sleutels = (Object.keys(nieuw) as Array<keyof CatalogusRij>).filter((k) => oud[k] !== nieuw[k]);
  return {
    oud: Object.fromEntries(sleutels.map((k) => [k, oud[k]])),
    nieuw: Object.fromEntries(sleutels.map((k) => [k, nieuw[k]])),
  };
}

/**
 * Type guard for a refusal.
 * @param waarde - Value that may be a refusal
 * @returns true when it is a CatalogusFout
 */
export function isFout(waarde: unknown): waarde is CatalogusFout {
  return typeof waarde === 'object' && waarde !== null && 'status' in waarde && 'detail' in waarde;
}
