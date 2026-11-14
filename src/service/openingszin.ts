import { vergelijkGemiddelde } from './kerncijfers';
import { formatScore, zichtbaarVerschil } from './nlGetal';
import { definitiefGemiddelde, definitieveVan, grootsteDaling, grootsteStijger } from './overzichtAnalyse';
import { asNaam, kiesVergelijking, platformNaam, type JaarCijfers } from './overzichtCijfers';

/** Sentence when no year has any answered question. */
export const ZONDER_SCORES = 'Er zijn nog geen scores ingevuld.';

/**
 * Neutral sentence about the state of a year, without comparison and based on definitief platforms.
 * @param nu - Newest year with scores
 * @returns the sentence
 */
export function standzin(nu: JaarCijfers): string {
  const aantal = definitieveVan(nu).length;
  if (aantal === 0) return `In ${nu.jaar} is nog geen platform definitief; de ingevulde scores staan in concept.`;
  const platformen = aantal === 1 ? 'definitief platform' : 'definitieve platformen';
  return `In ${nu.jaar} staat het gemiddelde op ${formatScore(definitiefGemiddelde(nu)!)} over ${aantal} ${platformen}.`;
}

/**
 * Opening sentence of the start screen, derived from the newest year with scores. Names the
 * platform with the largest rise ("groeit door naar …") and the platform and axis with the largest
 * fall as its largest growth opportunity. Only platforms definitief in both compared years count;
 * without such a base it gives the neutral state sentence. Respectful wording, no ranking.
 * @param jaren - Year figures in any order
 * @returns one Dutch sentence
 */
export function maakOpeningszin(jaren: JaarCijfers[]): string {
  const { nu, vorige } = kiesVergelijking(jaren);
  if (!nu) return ZONDER_SCORES;
  const vergelijking = vergelijkGemiddelde(nu, vorige);
  if (!vorige || !vergelijking) return standzin(nu);

  const stijger = grootsteStijger(nu, vorige);
  const daling = grootsteDaling(nu, vorige);
  const groei = stijger && `groeit ${platformNaam(stijger.platformId)} door naar ${formatScore(stijger.waarde)}`;
  const kans = daling && `bij ${platformNaam(daling.platformId)} ligt de grootste groeikans op de as ${asNaam(daling.asId)}`;
  if (groei && kans) return `In ${nu.jaar} ${groei}; ${kans}.`;
  if (groei) return `In ${nu.jaar} ${groei}.`;
  if (daling) {
    return `In ${nu.jaar} ligt bij ${platformNaam(daling.platformId)} de grootste groeikans op de as ${asNaam(daling.asId)}.`;
  }
  if (zichtbaarVerschil(vergelijking.nu, vergelijking.vorige) !== 0) return standzin(nu);
  const basis = vergelijking.aantal === 1 ? '1 platform' : `${vergelijking.aantal} platformen`;
  return `In ${nu.jaar} is het gemiddelde ${formatScore(vergelijking.nu)}, vergelijkbaar met ${vorige.jaar} (over ${basis}).`;
}
