import { CONFIG } from '@/src/service/config';
import type { Spaak } from './Spinnenweb';

/** One spoke per question, coloured by its axis. */
export const VRAAG_SPAKEN: Spaak[] = CONFIG.assen.flatMap((as) => as.vragen.map((v) => ({ label: v.kort, kleur: as.kleur })));

/** Axis names with their colour, used as legend under the spinnenweb. */
export const AS_GROEPEN: Spaak[] = CONFIG.assen.map((as) => ({ label: as.naam, kleur: as.kleur }));

/**
 * Orders per-question values in spoke order.
 * @param perVraag value per question id
 * @returns values in the same order as VRAAG_SPAKEN
 */
export function naarSpaakWaarden(perVraag: Record<string, number | null>): Array<number | null> {
  return CONFIG.assen.flatMap((as) => as.vragen.map((v) => perVraag[v.id] ?? null));
}
