import type { BeheerRol } from './_beheerTypen';

/** Sort direction of the name column. */
export type SorteerRichting = 'oplopend' | 'aflopend';

/** The editable part of a user: role and platform links for the chosen year. */
export interface BewerkbareGebruiker {
  rol: BeheerRol;
  platformIds: string[];
}

/** One call to an existing admin endpoint: a role change (PATCH) or the year's links (PUT). */
export type BewerkStap = { soort: 'rol'; rol: BeheerRol } | { soort: 'koppelingen'; platformIds: string[] };

/**
 * Sorts users by name in Dutch order, ignoring case and accents; equal names by e-mail.
 * @param gebruikers - Users to sort (not modified)
 * @param richting - Ascending or descending
 * @returns a new, sorted array
 */
export function sorteerOpNaam<T extends { naam: string; email: string }>(gebruikers: readonly T[], richting: SorteerRichting): T[] {
  const factor = richting === 'oplopend' ? 1 : -1;
  return [...gebruikers].sort(
    (a, b) => factor * (a.naam.localeCompare(b.naam, 'nl', { sensitivity: 'base' }) || a.email.localeCompare(b.email, 'nl')),
  );
}

function zelfdeVerzameling(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

/**
 * The calls needed to go from the current to the edited state: the role first (a lezer cannot
 * hold links, so lezer -> invuller must be saved before its links), then the links, and never
 * links for a lezer (the server removes them when the role becomes lezer).
 * @param huidig - Role and links as loaded
 * @param nieuw - Role and links as edited
 * @returns the steps in order; empty when nothing changed
 */
export function bewerkStappen(huidig: BewerkbareGebruiker, nieuw: BewerkbareGebruiker): BewerkStap[] {
  const stappen: BewerkStap[] = [];
  if (nieuw.rol !== huidig.rol) stappen.push({ soort: 'rol', rol: nieuw.rol });
  if (nieuw.rol !== 'lezer' && !zelfdeVerzameling(huidig.platformIds, nieuw.platformIds)) {
    stappen.push({ soort: 'koppelingen', platformIds: nieuw.platformIds });
  }
  return stappen;
}

/**
 * Whether saving needs a confirmation: becoming lezer removes all platform links in every year.
 * @param huidig - Current role
 * @param nieuw - Chosen role
 * @returns true when a non-lezer becomes lezer
 */
export function vraagtLezerBevestiging(huidig: BeheerRol, nieuw: BeheerRol): boolean {
  return nieuw === 'lezer' && huidig !== 'lezer';
}

/**
 * Confirmation text shown before a user becomes lezer.
 * @param naam - Display name of the user
 * @returns the Dutch confirmation question
 */
export function lezerBevestiging(naam: string): string {
  return `${naam} wordt lezer. Alle platformkoppelingen in alle meetjaren worden verwijderd. Doorgaan?`;
}

/**
 * The request for one step against the existing admin endpoints.
 * @param id - User id
 * @param jaar - Measurement year of the links
 * @param stap - The step
 * @returns url, method and JSON body
 */
export function stapVerzoek(id: string, jaar: number, stap: BewerkStap): { url: string; method: 'PATCH' | 'PUT'; body: unknown } {
  if (stap.soort === 'rol') return { url: `/api/beheer/gebruikers/${id}`, method: 'PATCH', body: { actie: 'rol', rol: stap.rol } };
  return { url: `/api/beheer/gebruikers/${id}/koppelingen`, method: 'PUT', body: { jaar, platformIds: stap.platformIds } };
}

/**
 * Runs the steps one after another and stops at the first failure. When the role was saved but
 * the links were not, the message says so, because the role change is not rolled back.
 * @param stappen - Steps from `bewerkStappen`
 * @param verstuur - Sends one step; resolves to null on success or a Dutch error message
 * @returns null when everything was saved, otherwise the message to show
 */
export async function voerStappenUit(stappen: BewerkStap[], verstuur: (stap: BewerkStap) => Promise<string | null>): Promise<string | null> {
  let rolOpgeslagen = false;
  for (const stap of stappen) {
    const melding = await verstuur(stap);
    if (melding && rolOpgeslagen) return `De rol is gewijzigd, maar de platformkoppelingen zijn niet opgeslagen: ${melding}`;
    if (melding) return melding;
    if (stap.soort === 'rol') rolOpgeslagen = true;
  }
  return null;
}
