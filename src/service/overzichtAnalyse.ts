import { gemiddelde, heeftScores, type JaarCijfers, type BusinessUnitCijfers } from './overzichtCijfers';
import { zichtbaarVerschil } from './nlGetal';

// Derived statements (rise, fall, growth opportunity, streak) use only definitief data, and a
// comparison between two years only the business units that are definitief in both years. A rise or
// fall is decided on the values rounded to one decimal, as the user sees them.

/** The business unit whose total rose the most against the comparison year. */
export interface Stijger {
  businessUnitId: string;
  waarde: number;
  vorige: number;
  verschil: number;
}

/** A business unit axis score, with the comparison year's score when there is one. */
export interface AsScore {
  businessUnitId: string;
  asId: string;
  waarde: number;
  vorige: number | null;
  verschil: number | null;
}

/** The business unit with the longest run of rising totals up to the newest year. */
export interface Reeks {
  businessUnitId: string;
  aantalMetingen: number;
  vanJaar: number;
  vanWaarde: number;
  naarWaarde: number;
}

/** A business unit that is definitief in both compared years, with its figures of each year. */
export interface Paar {
  nu: BusinessUnitCijfers;
  vorige: BusinessUnitCijfers;
}

/**
 * Business units of a year that are definitief and have a total.
 * @param jaar - Year figures
 * @returns the definitief business units in list order
 */
export function definitieveVan(jaar: JaarCijfers): BusinessUnitCijfers[] {
  return jaar.businessUnits.filter((p) => p.status === 'definitief' && p.totaal !== null);
}

/**
 * The comparison base of two years: business units that are definitief in both.
 * @param nu - Newest year
 * @param vorige - Comparison year
 * @returns the pairs in list order (empty when nothing is in common)
 */
export function gemeenschappelijk(nu: JaarCijfers, vorige: JaarCijfers): Paar[] {
  const eerder = definitieveVan(vorige);
  return definitieveVan(nu).flatMap((p) => {
    const was = eerder.find((e) => e.businessUnitId === p.businessUnitId);
    return was ? [{ nu: p, vorige: was }] : [];
  });
}

/**
 * Mean of the totals of the definitief business units of a year.
 * @param jaar - Year figures
 * @returns the mean, or null without definitief business units
 */
export function definitiefGemiddelde(jaar: JaarCijfers): number | null {
  return gemiddelde(definitieveVan(jaar).map((p) => p.totaal!));
}

/**
 * Business unit with the largest displayed rise of its total; ties keep the list order.
 * @param nu - Newest year with scores
 * @param vorige - Comparison year
 * @returns the riser, or null when no common definitief business unit rose
 */
export function grootsteStijger(nu: JaarCijfers, vorige: JaarCijfers): Stijger | null {
  let beste: Stijger | null = null;
  for (const paar of gemeenschappelijk(nu, vorige)) {
    const verschil = zichtbaarVerschil(paar.nu.totaal!, paar.vorige.totaal!);
    if (verschil > 0 && (!beste || verschil > beste.verschil)) {
      beste = { businessUnitId: paar.nu.businessUnitId, waarde: paar.nu.totaal!, vorige: paar.vorige.totaal!, verschil };
    }
  }
  return beste;
}

/**
 * Business unit and axis with the largest displayed fall; ties keep the list order.
 * @param nu - Newest year with scores
 * @param vorige - Comparison year
 * @returns the axis score, or null when no axis of a common definitief business unit fell
 */
export function grootsteDaling(nu: JaarCijfers, vorige: JaarCijfers): AsScore | null {
  let beste: AsScore | null = null;
  for (const paar of gemeenschappelijk(nu, vorige)) {
    for (const as of nu.assen) {
      const waarde = paar.nu.perAs[as.id];
      const was = paar.vorige.perAs[as.id];
      if (waarde == null || was == null) continue;
      const verschil = zichtbaarVerschil(waarde, was);
      if (verschil < 0 && (!beste || verschil < (beste.verschil ?? 0))) {
        beste = { businessUnitId: paar.nu.businessUnitId, asId: as.id, waarde, vorige: was, verschil };
      }
    }
  }
  return beste;
}

/**
 * Lowest axis score among the definitief business units of a year; ties keep the list order.
 * @param nu - Year figures
 * @returns the axis score without comparison, or null without definitief business units
 */
export function laagsteAs(nu: JaarCijfers): AsScore | null {
  let laagste: AsScore | null = null;
  for (const p of definitieveVan(nu)) {
    for (const as of nu.assen) {
      const waarde = p.perAs[as.id];
      if (waarde == null || (laagste && waarde >= laagste.waarde)) continue;
      laagste = { businessUnitId: p.businessUnitId, asId: as.id, waarde, vorige: null, verschil: null };
    }
  }
  return laagste;
}

/**
 * The largest growth opportunity: the largest fall on an axis, else the lowest definitief axis score.
 * @param nu - Newest year with scores
 * @param vorige - Comparison year, or null
 * @returns the axis score, or null without definitief scores
 */
export function grootsteGroeikans(nu: JaarCijfers, vorige: JaarCijfers | null): AsScore | null {
  return (vorige && grootsteDaling(nu, vorige)) ?? laagsteAs(nu);
}

function definitiefTotaal(jaar: JaarCijfers, businessUnitId: string): number | null {
  return definitieveVan(jaar).find((p) => p.businessUnitId === businessUnitId)?.totaal ?? null;
}

/**
 * Run of displayed rises of one business unit's definitief total that ends in the newest year.
 * @param businessUnitId - Business unit id
 * @param jaren - Years with scores, oldest first
 * @returns the run, or null when the business unit did not rise into the newest year
 */
function reeksVan(businessUnitId: string, jaren: JaarCijfers[]): Reeks | null {
  const laatste = jaren.at(-1);
  const naar = laatste ? definitiefTotaal(laatste, businessUnitId) : null;
  if (!laatste || naar === null) return null;
  let index = jaren.length - 1;
  let vanWaarde = naar;
  while (index > 0) {
    const was = definitiefTotaal(jaren[index - 1]!, businessUnitId);
    if (was === null || zichtbaarVerschil(vanWaarde, was) <= 0) break;
    vanWaarde = was;
    index -= 1;
  }
  const aantalMetingen = jaren.length - 1 - index;
  return aantalMetingen > 0 ? { businessUnitId, aantalMetingen, vanJaar: jaren[index]!.jaar, vanWaarde, naarWaarde: naar } : null;
}

/**
 * Business unit whose definitief total rose the most measurements in a row up to the newest year with scores.
 * @param jaren - Year figures in any order
 * @returns the run, or null when no business unit rose in the newest year
 */
export function langsteStijging(jaren: JaarCijfers[]): Reeks | null {
  const metScores = [...jaren].sort((a, b) => a.jaar - b.jaar).filter(heeftScores);
  let beste: Reeks | null = null;
  for (const p of metScores.at(-1)?.businessUnits ?? []) {
    const reeks = reeksVan(p.businessUnitId, metScores);
    if (reeks && (!beste || reeks.aantalMetingen > beste.aantalMetingen)) beste = reeks;
  }
  return beste;
}
