import { formatScore, noemOp } from './nlGetal';
import { grootsteDaling, langsteStijging } from './overzichtAnalyse';
import { asNaam, businessUnitNaam, kiesVergelijking, type BusinessUnitCijfers, type JaarCijfers } from './overzichtCijfers';

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
 * @param aantalVragen - Number of questions in the year's list
 * @returns e.g. "1 van de 16 vragen is beantwoord."
 */
function beantwoordZin(beantwoord: number, aantalVragen: number): string {
  return beantwoord === 1
    ? `1 van de ${aantalVragen} vragen is beantwoord.`
    : `${beantwoord} van de ${aantalVragen} vragen zijn beantwoord.`;
}

/**
 * Talking point for the largest fall on an axis of a business unit definitief in both years.
 * @param nu - Newest year with scores
 * @param vorige - Comparison year, or null
 * @returns the point, or null without such a fall
 */
function dalingOnderwerp(nu: JaarCijfers, vorige: JaarCijfers | null): Gespreksonderwerp | null {
  const daling = vorige && grootsteDaling(nu, vorige);
  if (!vorige || !daling) return null;
  return {
    soort: 'daling',
    titel: `${businessUnitNaam(nu, daling.businessUnitId)}: de as ${asNaam(nu, daling.asId)} staat onder druk`,
    toelichting: `Van ${formatScore(daling.vorige ?? 0)} in ${vorige.jaar} naar ${formatScore(daling.waarde)} in ${nu.jaar}. Dit vraagt samen aandacht.`,
  };
}

/**
 * Talking point for the business units still in concept in the newest year.
 * @param nu - Newest year with scores
 * @returns the point, or null when no business unit is in concept
 */
function conceptOnderwerp(nu: JaarCijfers): Gespreksonderwerp | null {
  const concepten = nu.businessUnits.filter((p) => p.status === 'concept');
  if (concepten.length === 0) return null;
  const namen = noemOp(concepten.map((p) => p.naam));
  if (concepten.length === 1) {
    return {
      soort: 'concept',
      titel: `${namen} staat nog in concept`,
      toelichting: beantwoordZin(concepten[0]!.beantwoord, nu.aantalVragen),
    };
  }
  const telling = concepten.map((p: BusinessUnitCijfers) => `${p.naam} ${p.beantwoord} van ${nu.aantalVragen}`);
  return { soort: 'concept', titel: `${namen} staan nog in concept`, toelichting: `Beantwoorde vragen: ${telling.join(', ')}.` };
}

/**
 * Talking point for the business units without a row in the newest year.
 * @param nu - Newest year with scores
 * @returns the point, or null when every business unit has started
 */
function nietGestartOnderwerp(nu: JaarCijfers): Gespreksonderwerp | null {
  const open = nu.businessUnits.filter((p) => p.status === 'niet-gestart');
  if (open.length === 0) return null;
  const namen = noemOp(open.map((p) => p.naam));
  return {
    soort: 'niet-gestart',
    titel: open.length === 1 ? `${namen} is nog niet gestart` : `${namen} zijn nog niet gestart`,
    toelichting: `Voor ${nu.jaar} zijn nog geen scores ingevuld.`,
  };
}

/**
 * Talking point for the business unit whose definitief total rose the most measurements in a row.
 * @param nu - Newest year with scores
 * @param jaren - All year figures
 * @returns the point, or null when no business unit rose into the newest year
 */
function stijgingOnderwerp(nu: JaarCijfers, jaren: JaarCijfers[]): Gespreksonderwerp | null {
  const reeks = langsteStijging(jaren);
  if (!reeks) return null;
  const naam = businessUnitNaam(nu, reeks.businessUnitId);
  return {
    soort: 'stijging',
    titel: reeks.aantalMetingen === 1 ? `${naam} groeit ten opzichte van ${reeks.vanJaar}` : `${naam} groeit ${reeks.aantalMetingen} metingen op rij`,
    toelichting: `Van ${formatScore(reeks.vanWaarde)} in ${reeks.vanJaar} naar ${formatScore(reeks.naarWaarde)} in ${nu.jaar}.`,
  };
}

/**
 * Talking points in fixed order: the largest fall on an axis, business units in concept, business units not
 * started and the business unit that has been rising the longest; at most MAX_ONDERWERPEN.
 * @param jaren - Year figures in any order
 * @returns the talking points (empty when no year has scores)
 */
export function kiesGespreksonderwerpen(jaren: JaarCijfers[]): Gespreksonderwerp[] {
  const { nu, vorige } = kiesVergelijking(jaren);
  if (!nu) return [];
  const kandidaten = [dalingOnderwerp(nu, vorige), conceptOnderwerp(nu), nietGestartOnderwerp(nu), stijgingOnderwerp(nu, jaren)];
  return kandidaten.filter((o): o is Gespreksonderwerp => o !== null).slice(0, MAX_ONDERWERPEN);
}
