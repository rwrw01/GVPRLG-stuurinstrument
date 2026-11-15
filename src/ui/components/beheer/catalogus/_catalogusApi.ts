import type { CatMeting } from './_catalogusTypen';
import { verstuurJson } from '../../_verstuurJson';

/** Path segment per list of the catalogue API. */
export type Lijst = 'assen' | 'vragen' | 'platformen' | 'businessunits';

/**
 * Adds an item.
 * @param lijst - Which list
 * @param body - Fields of the new item
 * @returns null on success, otherwise the Dutch message
 */
export function voegToe(lijst: Lijst, body: Record<string, unknown>): Promise<string | null> {
  return verstuurJson(`/api/beheer/${lijst}`, 'POST', body);
}

/**
 * Changes, removes (`vervallen: true`) or restores (`vervallen: false`) an item.
 * @param lijst - Which list
 * @param id - Item id
 * @param body - Fields to change
 * @returns null on success, otherwise the Dutch message
 */
export function wijzig(lijst: Lijst, id: string, body: Record<string, unknown>): Promise<string | null> {
  return verstuurJson(`/api/beheer/${lijst}/${id}`, 'PATCH', body);
}

/**
 * Moves an item one place.
 * @param lijst - Which list
 * @param id - Item id
 * @param richting - `omhoog` or `omlaag`
 * @returns null on success, otherwise the Dutch message
 */
export function verplaats(lijst: Lijst, id: string, richting: 'omhoog' | 'omlaag'): Promise<string | null> {
  return verstuurJson(`/api/beheer/${lijst}/${id}/verplaats`, 'POST', { richting });
}

/**
 * The confirmation text for a removal: frozen years stay unchanged, open years follow.
 * @param wat - What is removed, e.g. "de vraag Cloud & data"
 * @param metingen - Year states
 * @returns the text for window.confirm
 */
export function bevestigVerwijderen(wat: string, metingen: CatMeting[]): string {
  const vast = metingen.filter((m) => m.vastgelegd).map((m) => m.jaar);
  const open = metingen.filter((m) => !m.vastgelegd).map((m) => m.jaar);
  const vastZin = vast.length > 0 ? ` Eerdere, vastgelegde meetjaren (${vast.join(', ')}) blijven ongewijzigd.` : '';
  const openZin = open.length > 0 ? ` De open meetjaren (${open.join(', ')}) nemen dit direct over.` : '';
  return `Weet je zeker dat je ${wat} wilt verwijderen?${vastZin}${openZin}`;
}

/**
 * The confirmation text for letting a platform lapse: as for any removal, plus that the filler
 * links to this platform in the open years go too (frozen years keep theirs).
 * @param naam - Platform name
 * @param metingen - Year states
 * @returns the text for window.confirm
 */
export function bevestigPlatformVervallen(naam: string, metingen: CatMeting[]): string {
  const open = metingen.filter((m) => !m.vastgelegd).map((m) => m.jaar);
  const koppelingen = open.length > 0
    ? ` De koppelingen van invullers aan dit platform in de open meetjaren (${open.join(', ')}) vervallen ook.`
    : '';
  return `${bevestigVerwijderen(`het platform "${naam}"`, metingen)}${koppelingen}`;
}
