import { formatScore, noemOp } from './nlGetal';
import { grootsteDaling, langsteStijging } from './overzichtAnalyse';
import { AANTAL_VRAGEN, asNaam, kiesVergelijking, platformNaam, type JaarCijfers, type PlatformCijfers } from './overzichtCijfers';

/** Kind of talking point; the UI shows an icon plus text for it. */
export type OnderwerpSoort = 'daling' | 'concept' | 'niet-gestart' | 'stijging';

/** One talking point for the board meeting, derived from the figures. */
export interface Gespreksonderwerp {
  soort: OnderwerpSoort;
  titel: string;
  toelichting: string;
}

/** At most this many talking points are shown. */
export const MAX_ONDERWERPEN = 4;

/**
 * Sentence with the number of answered questions, singular for one.
 * @param beantwoord - Number of answered questions
 * @returns e.g. "1 van de 16 vragen is beantwoord."
 */
function beantwoordZin(beantwoord: number): string {
  return beantwoord === 1
    ? `1 van de ${AANTAL_VRAGEN} vragen is beantwoord.`
    : `${beantwoord} van de ${AANTAL_VRAGEN} vragen zijn beantwoord.`;
}

/**
 * Talking point for the largest fall on an axis of a platform definitief in both years.
 * @param nu - Newest year with scores
 * @param vorige - Comparison year, or null
 * @returns the point, or null without such a fall
 */
function dalingOnderwerp(nu: JaarCijfers, vorige: JaarCijfers | null): Gespreksonderwerp | null {
  const daling = vorige && grootsteDaling(nu, vorige);
  if (!vorige || !daling) return null;
  return {
    soort: 'daling',
    titel: `${platformNaam(daling.platformId)}: de as ${asNaam(daling.asId)} staat onder druk`,
    toelichting: `Van ${formatScore(daling.vorige ?? 0)} in ${vorige.jaar} naar ${formatScore(daling.waarde)} in ${nu.jaar}. Dit vraagt samen aandacht.`,
  };
}

/**
 * Talking point for the platforms still in concept in the newest year.
 * @param nu - Newest year with scores
 * @returns the point, or null when no platform is in concept
 */
function conceptOnderwerp(nu: JaarCijfers): Gespreksonderwerp | null {
  const concepten = nu.platformen.filter((p) => p.status === 'concept');
  if (concepten.length === 0) return null;
  const namen = noemOp(concepten.map((p) => platformNaam(p.platformId)));
  if (concepten.length === 1) {
    return {
      soort: 'concept',
      titel: `${namen} staat nog in concept`,
      toelichting: beantwoordZin(concepten[0]!.beantwoord),
    };
  }
  const telling = concepten.map((p: PlatformCijfers) => `${platformNaam(p.platformId)} ${p.beantwoord} van ${AANTAL_VRAGEN}`);
  return { soort: 'concept', titel: `${namen} staan nog in concept`, toelichting: `Beantwoorde vragen: ${telling.join(', ')}.` };
}

/**
 * Talking point for the platforms without a row in the newest year.
 * @param nu - Newest year with scores
 * @returns the point, or null when every platform has started
 */
function nietGestartOnderwerp(nu: JaarCijfers): Gespreksonderwerp | null {
  const open = nu.platformen.filter((p) => p.status === 'niet-gestart');
  if (open.length === 0) return null;
  const namen = noemOp(open.map((p) => platformNaam(p.platformId)));
  return {
    soort: 'niet-gestart',
    titel: open.length === 1 ? `${namen} is nog niet gestart` : `${namen} zijn nog niet gestart`,
    toelichting: `Voor ${nu.jaar} zijn nog geen scores ingevuld.`,
  };
}

/**
 * Talking point for the platform whose definitief total rose the most measurements in a row.
 * @param nu - Newest year with scores
 * @param jaren - All year figures
 * @returns the point, or null when no platform rose into the newest year
 */
function stijgingOnderwerp(nu: JaarCijfers, jaren: JaarCijfers[]): Gespreksonderwerp | null {
  const reeks = langsteStijging(jaren);
  if (!reeks) return null;
  const naam = platformNaam(reeks.platformId);
  return {
    soort: 'stijging',
    titel: reeks.aantalMetingen === 1 ? `${naam} groeit ten opzichte van ${reeks.vanJaar}` : `${naam} groeit ${reeks.aantalMetingen} metingen op rij`,
    toelichting: `Van ${formatScore(reeks.vanWaarde)} in ${reeks.vanJaar} naar ${formatScore(reeks.naarWaarde)} in ${nu.jaar}.`,
  };
}

/**
 * Talking points in fixed order: the largest fall on an axis, platforms in concept, platforms not
 * started and the platform that has been rising the longest; at most MAX_ONDERWERPEN.
 * @param jaren - Year figures in any order
 * @returns the talking points (empty when no year has scores)
 */
export function kiesGespreksonderwerpen(jaren: JaarCijfers[]): Gespreksonderwerp[] {
  const { nu, vorige } = kiesVergelijking(jaren);
  if (!nu) return [];
  const kandidaten = [dalingOnderwerp(nu, vorige), conceptOnderwerp(nu), nietGestartOnderwerp(nu), stijgingOnderwerp(nu, jaren)];
  return kandidaten.filter((o): o is Gespreksonderwerp => o !== null).slice(0, MAX_ONDERWERPEN);
}
