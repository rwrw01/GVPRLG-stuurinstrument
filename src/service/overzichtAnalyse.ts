import { CONFIG } from './config';
import { gemiddelde, heeftScores, type JaarCijfers, type PlatformCijfers } from './overzichtCijfers';
import { zichtbaarVerschil } from './nlGetal';

// Derived statements (rise, fall, growth opportunity, streak) use only definitief data, and a
// comparison between two years only the platforms that are definitief in both years. A rise or
// fall is decided on the values rounded to one decimal, as the user sees them.

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
  aantalMetingen: number;
  vanJaar: number;
  vanWaarde: number;
  naarWaarde: number;
}

/** A platform that is definitief in both compared years, with its figures of each year. */
export interface Paar {
  nu: PlatformCijfers;
  vorige: PlatformCijfers;
}

/**
 * Platforms of a year that are definitief and have a total.
 * @param jaar - Year figures
 * @returns the definitief platforms in config order
 */
export function definitieveVan(jaar: JaarCijfers): PlatformCijfers[] {
  return jaar.platformen.filter((p) => p.status === 'definitief' && p.totaal !== null);
}

/**
 * The comparison base of two years: platforms that are definitief in both.
 * @param nu - Newest year
 * @param vorige - Comparison year
 * @returns the pairs in config order (empty when nothing is in common)
 */
export function gemeenschappelijk(nu: JaarCijfers, vorige: JaarCijfers): Paar[] {
  const eerder = definitieveVan(vorige);
  return definitieveVan(nu).flatMap((p) => {
    const was = eerder.find((e) => e.platformId === p.platformId);
    return was ? [{ nu: p, vorige: was }] : [];
  });
}

/**
 * Mean of the totals of the definitief platforms of a year.
 * @param jaar - Year figures
 * @returns the mean, or null without definitief platforms
 */
export function definitiefGemiddelde(jaar: JaarCijfers): number | null {
  return gemiddelde(definitieveVan(jaar).map((p) => p.totaal!));
}

/**
 * Platform with the largest displayed rise of its total; ties keep the configured order.
 * @param nu - Newest year with scores
 * @param vorige - Comparison year
 * @returns the riser, or null when no common definitief platform rose
 */
export function grootsteStijger(nu: JaarCijfers, vorige: JaarCijfers): Stijger | null {
  let beste: Stijger | null = null;
  for (const paar of gemeenschappelijk(nu, vorige)) {
    const verschil = zichtbaarVerschil(paar.nu.totaal!, paar.vorige.totaal!);
    if (verschil > 0 && (!beste || verschil > beste.verschil)) {
      beste = { platformId: paar.nu.platformId, waarde: paar.nu.totaal!, vorige: paar.vorige.totaal!, verschil };
    }
  }
  return beste;
}

/**
 * Platform and axis with the largest displayed fall; ties keep the configured order.
 * @param nu - Newest year with scores
 * @param vorige - Comparison year
 * @returns the axis score, or null when no axis of a common definitief platform fell
 */
export function grootsteDaling(nu: JaarCijfers, vorige: JaarCijfers): AsScore | null {
  let beste: AsScore | null = null;
  for (const paar of gemeenschappelijk(nu, vorige)) {
    for (const as of CONFIG.assen) {
      const waarde = paar.nu.perAs[as.id];
      const was = paar.vorige.perAs[as.id];
      if (waarde == null || was == null) continue;
      const verschil = zichtbaarVerschil(waarde, was);
      if (verschil < 0 && (!beste || verschil < (beste.verschil ?? 0))) {
        beste = { platformId: paar.nu.platformId, asId: as.id, waarde, vorige: was, verschil };
      }
    }
  }
  return beste;
}

/**
 * Lowest axis score among the definitief platforms of a year; ties keep the configured order.
 * @param nu - Year figures
 * @returns the axis score without comparison, or null without definitief platforms
 */
export function laagsteAs(nu: JaarCijfers): AsScore | null {
  let laagste: AsScore | null = null;
  for (const p of definitieveVan(nu)) {
    for (const as of CONFIG.assen) {
      const waarde = p.perAs[as.id];
      if (waarde == null || (laagste && waarde >= laagste.waarde)) continue;
      laagste = { platformId: p.platformId, asId: as.id, waarde, vorige: null, verschil: null };
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

function definitiefTotaal(jaar: JaarCijfers, platformId: string): number | null {
  return definitieveVan(jaar).find((p) => p.platformId === platformId)?.totaal ?? null;
}

/**
 * Run of displayed rises of one platform's definitief total that ends in the newest year.
 * @param platformId - Platform id
 * @param jaren - Years with scores, oldest first
 * @returns the run, or null when the platform did not rise into the newest year
 */
function reeksVan(platformId: string, jaren: JaarCijfers[]): Reeks | null {
  const laatste = jaren.at(-1);
  const naar = laatste ? definitiefTotaal(laatste, platformId) : null;
  if (!laatste || naar === null) return null;
  let index = jaren.length - 1;
  let vanWaarde = naar;
  while (index > 0) {
    const was = definitiefTotaal(jaren[index - 1]!, platformId);
    if (was === null || zichtbaarVerschil(vanWaarde, was) <= 0) break;
    vanWaarde = was;
    index -= 1;
  }
  const aantalMetingen = jaren.length - 1 - index;
  return aantalMetingen > 0 ? { platformId, aantalMetingen, vanJaar: jaren[index]!.jaar, vanWaarde, naarWaarde: naar } : null;
}

/**
 * Platform whose definitief total rose the most measurements in a row up to the newest year with scores.
 * @param jaren - Year figures in any order
 * @returns the run, or null when no platform rose in the newest year
 */
export function langsteStijging(jaren: JaarCijfers[]): Reeks | null {
  const metScores = [...jaren].sort((a, b) => a.jaar - b.jaar).filter(heeftScores);
  let beste: Reeks | null = null;
  for (const p of CONFIG.platformen) {
    const reeks = reeksVan(p.id, metScores);
    if (reeks && (!beste || reeks.aantalMetingen > beste.aantalMetingen)) beste = reeks;
  }
  return beste;
}
