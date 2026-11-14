import { CONFIG } from './config';
import type { PlatformScoresByAs } from './scores';

/** Status of one platform within one measurement year on the start screen. */
export type OverzichtStatus = 'definitief' | 'concept' | 'niet-gestart';

/** One stored platform row as the repository returns it. */
export interface PlatformRij {
  status: string;
  scoresPerAs: PlatformScoresByAs;
}

/** One measurement year with the rows of the platforms that have one. */
export interface MetingInvoer {
  jaar: number;
  platformen: Record<string, PlatformRij>;
}

/** Calculated figures of one platform in one year. */
export interface PlatformCijfers {
  platformId: string;
  status: OverzichtStatus;
  perAs: Record<string, number | null>;
  totaal: number | null;
  beantwoord: number;
}

/** Calculated figures of one year over all platforms. */
export interface JaarCijfers {
  jaar: number;
  voortgang: string;
  aantalDefinitief: number;
  gemiddelde: number | null;
  perAs: Record<string, number | null>;
  platformen: PlatformCijfers[];
}

/** Total number of questions in the questionnaire. */
export const AANTAL_VRAGEN = CONFIG.assen.reduce((som, as) => som + as.vragen.length, 0);

/**
 * Arithmetic mean.
 * @param waarden - Values to average
 * @returns the mean, or null for an empty list
 */
export function gemiddelde(waarden: number[]): number | null {
  return waarden.length > 0 ? waarden.reduce((som, v) => som + v, 0) / waarden.length : null;
}

function antwoorden(scores: PlatformScoresByAs, asId: string, vraagIds: string[]): number[] {
  return vraagIds.map((id) => scores[asId]?.[id]).filter((v): v is number => v != null);
}

/**
 * Figures of one platform: per axis the mean of its answered questions, the total as the mean of
 * all answered questions (so an axis with more questions weighs more). Unanswered questions do not count.
 * @param platformId - Platform id
 * @param rij - Stored row, or undefined when the platform has none (status `niet-gestart`)
 * @returns the platform figures
 */
export function berekenPlatformCijfers(platformId: string, rij: PlatformRij | undefined): PlatformCijfers {
  const perAs: Record<string, number | null> = {};
  const alle: number[] = [];
  for (const as of CONFIG.assen) {
    const waarden = rij ? antwoorden(rij.scoresPerAs, as.id, as.vragen.map((v) => v.id)) : [];
    perAs[as.id] = gemiddelde(waarden);
    alle.push(...waarden);
  }
  if (!rij) return { platformId, status: 'niet-gestart', perAs, totaal: null, beantwoord: 0 };
  const status: OverzichtStatus = rij.status === 'definitief' ? 'definitief' : 'concept';
  return { platformId, status, perAs, totaal: gemiddelde(alle), beantwoord: alle.length };
}

/**
 * Progress label of a year in the side menu.
 * @param aantalDefinitief - Platforms with status definitief
 * @param aantalPlatformen - Number of platforms
 * @returns "afgerond" when every platform is definitief, otherwise "<definitief>/<platformen>"
 */
export function voortgangLabel(aantalDefinitief: number, aantalPlatformen: number): string {
  return aantalDefinitief >= aantalPlatformen ? 'afgerond' : `${aantalDefinitief}/${aantalPlatformen}`;
}

/**
 * Figures of one year: every configured platform in fixed order, the mean of the platform totals
 * and per axis the mean of the platform axis averages. Concepts count.
 * @param meting - The year with its stored platform rows
 * @returns the year figures
 */
export function berekenJaarCijfers(meting: MetingInvoer): JaarCijfers {
  const platformen = CONFIG.platformen.map((p) => berekenPlatformCijfers(p.id, meting.platformen[p.id]));
  const aantalDefinitief = platformen.filter((p) => p.status === 'definitief').length;
  const perAs: Record<string, number | null> = {};
  for (const as of CONFIG.assen) {
    perAs[as.id] = gemiddelde(platformen.map((p) => p.perAs[as.id]).filter((v): v is number => v != null));
  }
  return {
    jaar: meting.jaar,
    voortgang: voortgangLabel(aantalDefinitief, platformen.length),
    aantalDefinitief,
    gemiddelde: gemiddelde(platformen.map((p) => p.totaal).filter((v): v is number => v != null)),
    perAs,
    platformen,
  };
}

/**
 * Whether any platform of the year has at least one answered question.
 * @param jaar - Year figures
 * @returns true when the year has scores
 */
export function heeftScores(jaar: JaarCijfers): boolean {
  return jaar.platformen.some((p) => p.totaal !== null);
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
 * Display name of a platform.
 * @param platformId - Platform id
 * @returns the configured name, or the id when unknown
 */
export function platformNaam(platformId: string): string {
  return CONFIG.platformen.find((p) => p.id === platformId)?.naam ?? platformId;
}

/**
 * Display name of an axis.
 * @param asId - Axis id
 * @returns the configured name, or the id when unknown
 */
export function asNaam(asId: string): string {
  return CONFIG.assen.find((a) => a.id === asId)?.naam ?? asId;
}
