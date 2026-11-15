import type { LijstBusinessUnit, Vragenlijst } from '../data/vragenlijstRepository';
import { beantwoordeScores, berekenGemiddeldePerAs, berekenTotaalGemiddelde, type ScoresPerAs } from './scores';

/** Status of one business unit within one measurement year on the start screen. */
export type OverzichtStatus = 'definitief' | 'concept' | 'niet-gestart';

/** One stored business unit row as the repository returns it. */
export interface BusinessUnitRij {
  status: string;
  scoresPerAs: ScoresPerAs;
}

/** One measurement year with the rows of the business units that have one. */
export interface MetingInvoer {
  jaar: number;
  businessUnits: Record<string, BusinessUnitRij>;
}

/** Calculated figures of one business unit in one year, with its name and colour of that year. */
export interface BusinessUnitCijfers {
  businessUnitId: string;
  naam: string;
  kleur: string;
  platformId: string;
  platformNaam: string;
  status: OverzichtStatus;
  perAs: Record<string, number | null>;
  totaal: number | null;
  beantwoord: number;
}

/** An axis of a year, as it was named and coloured in that year. */
export interface JaarAs {
  id: string;
  naam: string;
  kleur: string;
}

/** Calculated figures of one year over the business units of that year's list. */
export interface JaarCijfers {
  jaar: number;
  vastgelegd: boolean;
  voortgang: string;
  aantalDefinitief: number;
  /** Number of questions in that year's list. */
  aantalVragen: number;
  gemiddelde: number | null;
  perAs: Record<string, number | null>;
  assen: JaarAs[];
  businessUnits: BusinessUnitCijfers[];
}

/**
 * Arithmetic mean.
 * @param waarden - Values to average
 * @returns the mean, or null for an empty list
 */
export function gemiddelde(waarden: number[]): number | null {
  return waarden.length > 0 ? waarden.reduce((som, v) => som + v, 0) / waarden.length : null;
}

/**
 * Figures of one business unit: per axis the mean of its answered questions, the total as the mean
 * of all answered questions (`berekenTotaalGemiddelde`, so an axis with more questions weighs more).
 * Unanswered questions and questions outside the year's list do not count.
 * @param lijst - Questionnaire of the year
 * @param unit - The business unit of that year
 * @param rij - Stored row, or undefined when the unit has none (status `niet-gestart`)
 * @returns the business unit figures
 */
export function berekenBusinessUnitCijfers(lijst: Vragenlijst, unit: LijstBusinessUnit, rij: BusinessUnitRij | undefined): BusinessUnitCijfers {
  const scores = rij?.scoresPerAs ?? {};
  const perAs = berekenGemiddeldePerAs(lijst, scores);
  const platformNaam = lijst.platformen.find((p) => p.id === unit.platformId)?.naam ?? unit.platformId;
  const basis = { businessUnitId: unit.id, naam: unit.naam, kleur: unit.kleur, platformId: unit.platformId, platformNaam, perAs };
  if (!rij) return { ...basis, status: 'niet-gestart', totaal: null, beantwoord: 0 };
  const status = rij.status === 'definitief' ? 'definitief' : 'concept';
  return { ...basis, status, totaal: berekenTotaalGemiddelde(lijst, scores), beantwoord: beantwoordeScores(lijst, scores).length };
}

/**
 * Progress label of a year in the side menu.
 * @param aantalDefinitief - Business units with status definitief
 * @param aantal - Number of business units in the year
 * @returns "afgerond" when every business unit is definitief, otherwise "<definitief>/<aantal>"
 */
export function voortgangLabel(aantalDefinitief: number, aantal: number): string {
  return aantalDefinitief >= aantal ? 'afgerond' : `${aantalDefinitief}/${aantal}`;
}

/**
 * Figures of one year: every business unit of the year's list in its order, the mean of their
 * totals and per axis the mean of their axis averages. Concepts count.
 * @param lijst - Questionnaire of the year
 * @param meting - The year with its stored rows
 * @returns the year figures
 */
export function berekenJaarCijfers(lijst: Vragenlijst, meting: MetingInvoer): JaarCijfers {
  const businessUnits = lijst.businessUnits.map((b) => berekenBusinessUnitCijfers(lijst, b, meting.businessUnits[b.id]));
  const aantalDefinitief = businessUnits.filter((p) => p.status === 'definitief').length;
  const perAs: Record<string, number | null> = {};
  for (const as of lijst.assen) {
    perAs[as.id] = gemiddelde(businessUnits.map((p) => p.perAs[as.id]).filter((v): v is number => v != null));
  }
  return {
    jaar: meting.jaar,
    vastgelegd: lijst.vastgelegd,
    voortgang: voortgangLabel(aantalDefinitief, businessUnits.length),
    aantalDefinitief,
    aantalVragen: lijst.assen.reduce((som, as) => som + as.vragen.length, 0),
    gemiddelde: gemiddelde(businessUnits.map((p) => p.totaal).filter((v): v is number => v != null)),
    perAs,
    assen: lijst.assen.map(({ id, naam, kleur }) => ({ id, naam, kleur })),
    businessUnits,
  };
}

/**
 * Whether any business unit of the year has at least one answered question.
 * @param jaar - Year figures
 * @returns true when the year has scores
 */
export function heeftScores(jaar: JaarCijfers): boolean {
  return jaar.businessUnits.some((p) => p.totaal !== null);
}

/**
 * Picks the newest year with scores and the year with scores before it.
 * @param jaren - Year figures in any order
 * @returns `nu` and `vorige`, each null when there is no such year
 */
export function kiesVergelijking(jaren: JaarCijfers[]): { nu: JaarCijfers | null; vorige: JaarCijfers | null } {
  const metScores = [...jaren].sort((a, b) => a.jaar - b.jaar).filter(heeftScores);
  return { nu: metScores.at(-1) ?? null, vorige: metScores.at(-2) ?? null };
}

/**
 * Display name of a business unit as it was named in the given year.
 * @param jaar - Year figures
 * @param businessUnitId - Business unit id
 * @returns the name of that year, or the id when unknown
 */
export function businessUnitNaam(jaar: JaarCijfers, businessUnitId: string): string {
  return jaar.businessUnits.find((p) => p.businessUnitId === businessUnitId)?.naam ?? businessUnitId;
}

/**
 * Display name of an axis as it was named in the given year.
 * @param jaar - Year figures
 * @param asId - Axis id
 * @returns the name of that year, or the id when unknown
 */
export function asNaam(jaar: JaarCijfers, asId: string): string {
  return jaar.assen.find((a) => a.id === asId)?.naam ?? asId;
}
