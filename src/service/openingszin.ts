import { vergelijkGemiddelde } from './kerncijfers';
import { formatScore, zichtbaarVerschil } from './nlGetal';
import { definitiefGemiddelde, definitieveVan, grootsteDaling, grootsteStijger } from './overzichtAnalyse';
import { asNaam, businessUnitNaam, kiesVergelijking, type JaarCijfers } from './overzichtCijfers';

/** Sentence when no year has any answered question. */
export const ZONDER_SCORES = 'Er zijn nog geen scores ingevuld.';

/**
 * Neutral sentence about the state of a year, without comparison and based on definitief business units.
 * @param nu - Newest year with scores
 * @returns the sentence
 */
export function standzin(nu: JaarCijfers): string {
  const aantal = definitieveVan(nu).length;
  if (aantal === 0) return `In ${nu.jaar} is nog geen businessunit definitief; de ingevulde scores staan in concept.`;
  const units = aantal === 1 ? 'definitieve businessunit' : 'definitieve businessunits';
  return `In ${nu.jaar} staat het gemiddelde op ${formatScore(definitiefGemiddelde(nu)!)} over ${aantal} ${units}.`;
}

/**
 * Opening sentence of the start screen, derived from the newest year with scores. Names the
 * business unit with the largest rise ("groeit door naar …") and the business unit and axis with the largest
 * fall as its largest growth opportunity. Only business units definitief in both compared years count;
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
  const groei = stijger && `groeit ${businessUnitNaam(nu, stijger.businessUnitId)} door naar ${formatScore(stijger.waarde)}`;
  const kans = daling && `bij ${businessUnitNaam(nu, daling.businessUnitId)} ligt de grootste groeikans op de as ${asNaam(nu, daling.asId)}`;
  if (groei && kans) return `In ${nu.jaar} ${groei}; ${kans}.`;
  if (groei) return `In ${nu.jaar} ${groei}.`;
  if (daling) {
    return `In ${nu.jaar} ligt bij ${businessUnitNaam(nu, daling.businessUnitId)} de grootste groeikans op de as ${asNaam(nu, daling.asId)}.`;
  }
  if (zichtbaarVerschil(vergelijking.nu, vergelijking.vorige) !== 0) return standzin(nu);
  return vergelijkbaarZin(nu, vorige.jaar, vergelijking.aantal);
}

/**
 * State sentence (the same year average as the key figure) plus a comparison clause with its own
 * base: the simple "vergelijkbaar met {jaar}" only when every definitief business unit of this year was
 * also definitief in the comparison year.
 * @param nu - Newest year with scores
 * @param vorigeJaar - Comparison year
 * @param aantalGemeenschappelijk - Business units definitief in both years
 * @returns the sentence
 */
function vergelijkbaarZin(nu: JaarCijfers, vorigeJaar: number, aantalGemeenschappelijk: number): string {
  const stand = standzin(nu).slice(0, -1);
  if (aantalGemeenschappelijk === definitieveVan(nu).length) return `${stand}, vergelijkbaar met ${vorigeJaar}.`;
  if (aantalGemeenschappelijk === 1) return `${stand}; de businessunit die ook in ${vorigeJaar} definitief was, scoort vergelijkbaar.`;
  return `${stand}; de ${aantalGemeenschappelijk} businessunits die ook in ${vorigeJaar} definitief waren, scoren gemiddeld vergelijkbaar.`;
}
