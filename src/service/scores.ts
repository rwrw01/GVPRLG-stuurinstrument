import type { Vragenlijst } from '../data/vragenlijstRepository';

export type VraagScoreMap = Record<string, number | null>;
export type ScoresPerAs = Record<string, VraagScoreMap>;

/** The part of a year's questionnaire the score calculations need. */
export type AssenLijst = Pick<Vragenlijst, 'assen'>;

/**
 * Mean per axis of the answered questions of one business unit row.
 * @param lijst - Questionnaire of the year
 * @param rij - Scores per axis of one business unit
 * @returns average per axis id, null for an axis without answered questions
 */
export function berekenGemiddeldePerAs(lijst: AssenLijst, rij: ScoresPerAs): Record<string, number | null> {
  const result: Record<string, number | null> = {};
  for (const as of lijst.assen) {
    const scores = as.vragen.map((v) => rij[as.id]?.[v.id]).filter((s): s is number => s != null);
    result[as.id] = scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : null;
  }
  return result;
}

/**
 * Mean of the axis averages of one business unit row.
 * @param lijst - Questionnaire of the year
 * @param rij - Scores per axis of one business unit
 * @returns the total, or null without answered questions
 */
export function berekenTotaalGemiddelde(lijst: AssenLijst, rij: ScoresPerAs): number | null {
  const waarden = Object.values(berekenGemiddeldePerAs(lijst, rij)).filter((v): v is number => v != null);
  return waarden.length > 0 ? waarden.reduce((sum, v) => sum + v, 0) / waarden.length : null;
}

/**
 * Averages each axis over several business units (mean of their axis averages).
 * The caller decides which rows count, e.g. only those with status definitief.
 * @param lijst - Questionnaire of the year
 * @param rijen - Scores per axis for each business unit to include
 * @returns average per axis id, or null when no row has a score on that axis
 */
export function berekenOrganisatieGemiddelde(lijst: AssenLijst, rijen: ScoresPerAs[]): Record<string, number | null> {
  const perRij = rijen.map((r) => berekenGemiddeldePerAs(lijst, r));
  const result: Record<string, number | null> = {};
  for (const as of lijst.assen) {
    const waarden = perRij.map((g) => g[as.id]).filter((v): v is number => v != null);
    result[as.id] = waarden.length > 0 ? waarden.reduce((sum, v) => sum + v, 0) / waarden.length : null;
  }
  return result;
}

/**
 * Averages every question of the list over several business units, the spokes of the web. A
 * question that is not in the list (another year's question) is not part of the result.
 * @param lijst - Questionnaire of the year
 * @param rijen - Scores per axis for each business unit to include
 * @returns average per question id, or null when no row scored that question
 */
export function berekenGemiddeldePerVraag(lijst: AssenLijst, rijen: ScoresPerAs[]): Record<string, number | null> {
  const result: Record<string, number | null> = {};
  for (const as of lijst.assen) {
    for (const vraag of as.vragen) {
      const waarden = rijen.map((p) => p[as.id]?.[vraag.id]).filter((v): v is number => v != null);
      result[vraag.id] = waarden.length > 0 ? waarden.reduce((sum, v) => sum + v, 0) / waarden.length : null;
    }
  }
  return result;
}
