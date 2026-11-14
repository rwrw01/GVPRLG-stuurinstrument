import { CONFIG } from './config';
import { heeftScores, type JaarCijfers, type PlatformCijfers } from './overzichtCijfers';

/** Differences smaller than this round to 0,0 on screen and count as "equal". */
export const DREMPEL = 0.05;

/** The platform whose total rose the most against the comparison year. */
export interface Stijger {
  platformId: string;
  waarde: number;
  vorige: number;
  verschil: number;
}

/** A platform axis score, with the comparison year's score when there is one. */
export interface AsScore {
  platformId: string;
  asId: string;
  waarde: number;
  vorige: number | null;
  verschil: number | null;
}

/** The platform with the longest run of rising totals up to the newest year. */
export interface Reeks {
  platformId: string;
  aantalJaren: number;
  vanJaar: number;
  vanWaarde: number;
  naarWaarde: number;
}

function vind(jaar: JaarCijfers, platformId: string): PlatformCijfers | undefined {
  return jaar.platformen.find((p) => p.platformId === platformId);
}

/**
 * Platform with the largest rise of its total (at least DREMPEL); ties keep the configured order.
 * @param nu - Newest year with scores
 * @param vorige - Comparison year
 * @returns the riser, or null when no platform rose
 */
export function grootsteStijger(nu: JaarCijfers, vorige: JaarCijfers): Stijger | null {
  let beste: Stijger | null = null;
  for (const p of nu.platformen) {
    const was = vind(vorige, p.platformId)?.totaal;
    if (p.totaal == null || was == null) continue;
    const verschil = p.totaal - was;
    if (verschil >= DREMPEL && (!beste || verschil > beste.verschil)) {
      beste = { platformId: p.platformId, waarde: p.totaal, vorige: was, verschil };
    }
  }
  return beste;
}

/**
 * Platform and axis with the largest fall (at least DREMPEL); ties keep the configured order.
 * @param nu - Newest year with scores
 * @param vorige - Comparison year
 * @returns the axis score, or null when no axis fell
 */
export function grootsteDaling(nu: JaarCijfers, vorige: JaarCijfers): AsScore | null {
  let beste: AsScore | null = null;
  for (const p of nu.platformen) {
    for (const as of CONFIG.assen) {
      const waarde = p.perAs[as.id];
      const was = vind(vorige, p.platformId)?.perAs[as.id];
      if (waarde == null || was == null) continue;
      const verschil = waarde - was;
      if (verschil <= -DREMPEL && (!beste || verschil < (beste.verschil ?? 0))) {
        beste = { platformId: p.platformId, asId: as.id, waarde, vorige: was, verschil };
      }
    }
  }
  return beste;
}

/**
 * Lowest platform axis score of a year; ties keep the configured order.
 * @param nu - Year figures
 * @returns the axis score without comparison, or null when the year has no scores
 */
export function laagsteAs(nu: JaarCijfers): AsScore | null {
  let laagste: AsScore | null = null;
  for (const p of nu.platformen) {
    for (const as of CONFIG.assen) {
      const waarde = p.perAs[as.id];
      if (waarde == null || (laagste && waarde >= laagste.waarde)) continue;
      laagste = { platformId: p.platformId, asId: as.id, waarde, vorige: null, verschil: null };
    }
  }
  return laagste;
}

/**
 * The largest growth opportunity: the largest fall on an axis, else the lowest axis score.
 * @param nu - Newest year with scores
 * @param vorige - Comparison year, or null
 * @returns the axis score, or null when there are no scores
 */
export function grootsteGroeikans(nu: JaarCijfers, vorige: JaarCijfers | null): AsScore | null {
  return (vorige && grootsteDaling(nu, vorige)) ?? laagsteAs(nu);
}

function reeksVan(platformId: string, jaren: JaarCijfers[]): Reeks | null {
  const laatste = jaren.at(-1);
  const naar = laatste && vind(laatste, platformId)?.totaal;
  if (!laatste || naar == null) return null;
  let index = jaren.length - 1;
  let vanWaarde = naar;
  while (index > 0) {
    const was = vind(jaren[index - 1]!, platformId)?.totaal;
    if (was == null || vanWaarde - was < DREMPEL) break;
    vanWaarde = was;
    index -= 1;
  }
  const aantalJaren = jaren.length - 1 - index;
  return aantalJaren > 0 ? { platformId, aantalJaren, vanJaar: jaren[index]!.jaar, vanWaarde, naarWaarde: naar } : null;
}

/**
 * Platform whose total rose the most years in a row up to the newest year with scores.
 * @param jaren - Year figures in any order
 * @returns the run, or null when no platform rose in the newest year
 */
export function langsteStijging(jaren: JaarCijfers[]): Reeks | null {
  const metScores = [...jaren].sort((a, b) => a.jaar - b.jaar).filter(heeftScores);
  let beste: Reeks | null = null;
  for (const p of CONFIG.platformen) {
    const reeks = reeksVan(p.id, metScores);
    if (reeks && (!beste || reeks.aantalJaren > beste.aantalJaren)) beste = reeks;
  }
  return beste;
}

/** Key figures of the newest year with scores. */
export interface Kerncijfers {
  jaar: number;
  gemiddelde: number | null;
  vorigeJaar: number | null;
  vorigeGemiddelde: number | null;
  aantalPlatformen: number;
  aantalDefinitief: number;
  aantalConcept: number;
  aantalNietGestart: number;
  stijger: Stijger | null;
  groeikans: AsScore | null;
}

/**
 * Key figures: average with comparison, progress, largest riser and largest growth opportunity.
 * @param nu - Newest year with scores
 * @param vorige - Comparison year, or null
 * @returns the key figures
 */
export function berekenKerncijfers(nu: JaarCijfers, vorige: JaarCijfers | null): Kerncijfers {
  const tel = (status: string) => nu.platformen.filter((p) => p.status === status).length;
  return {
    jaar: nu.jaar,
    gemiddelde: nu.gemiddelde,
    vorigeJaar: vorige?.jaar ?? null,
    vorigeGemiddelde: vorige?.gemiddelde ?? null,
    aantalPlatformen: nu.platformen.length,
    aantalDefinitief: tel('definitief'),
    aantalConcept: tel('concept'),
    aantalNietGestart: tel('niet-gestart'),
    stijger: vorige ? grootsteStijger(nu, vorige) : null,
    groeikans: grootsteGroeikans(nu, vorige),
  };
}
