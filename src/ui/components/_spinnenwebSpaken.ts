import type { Spaak } from './Spinnenweb';
import type { UiVragenlijst } from './_vragenlijstTypen';

type AssenLijst = Pick<UiVragenlijst, 'assen'>;

/**
 * One spoke per question of the year's list, coloured by its axis.
 * @param lijst - Questionnaire of the year
 * @returns the spokes in list order
 */
export function vraagSpaken(lijst: AssenLijst): Spaak[] {
  return lijst.assen.flatMap((as) => as.vragen.map((v) => ({ label: v.kort, kleur: as.kleur })));
}

/**
 * Axis names with their colour, used as legend under the spinnenweb.
 * @param lijst - Questionnaire of the year
 * @returns one entry per axis
 */
export function asGroepen(lijst: AssenLijst): Spaak[] {
  return lijst.assen.map((as) => ({ label: as.naam, kleur: as.kleur }));
}

/**
 * Orders per-question values in spoke order; a question absent from the map (not in the other
 * year) gives null.
 * @param lijst - Questionnaire of the year whose spokes are drawn
 * @param perVraag - Value per question id
 * @returns values in the same order as `vraagSpaken(lijst)`
 */
export function naarSpaakWaarden(lijst: AssenLijst, perVraag: Record<string, number | null>): Array<number | null> {
  return lijst.assen.flatMap((as) => as.vragen.map((v) => perVraag[v.id] ?? null));
}
