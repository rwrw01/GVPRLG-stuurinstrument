import { formatScore } from './nlGetal';
import { grootsteDaling, grootsteStijger } from './overzichtAnalyse';
import { asNaam, kiesVergelijking, platformNaam, type JaarCijfers } from './overzichtCijfers';

/** Sentence when no year has any answered question. */
export const ZONDER_SCORES = 'Er zijn nog geen scores ingevuld.';

function zonderVergelijking(nu: JaarCijfers): string {
  const aantal = nu.platformen.filter((p) => p.totaal !== null).length;
  const platformen = aantal === 1 ? 'platform' : 'platformen';
  return `In ${nu.jaar} staat het gemiddelde op ${formatScore(nu.gemiddelde ?? 0)} over ${aantal} ${platformen} met scores.`;
}

/**
 * Opening sentence of the start screen, derived from the newest year with scores. Names the
 * platform with the largest rise ("groeit door naar …") and the platform and axis with the largest
 * fall as its largest growth opportunity; respectful wording, no ranking.
 * @param jaren - Year figures in any order
 * @returns one Dutch sentence
 */
export function maakOpeningszin(jaren: JaarCijfers[]): string {
  const { nu, vorige } = kiesVergelijking(jaren);
  if (!nu) return ZONDER_SCORES;
  if (!vorige) return zonderVergelijking(nu);

  const stijger = grootsteStijger(nu, vorige);
  const daling = grootsteDaling(nu, vorige);
  const groei = stijger && `groeit ${platformNaam(stijger.platformId)} door naar ${formatScore(stijger.waarde)}`;
  const kans = daling && `bij ${platformNaam(daling.platformId)} ligt de grootste groeikans op de as ${asNaam(daling.asId)}`;
  if (groei && kans) return `In ${nu.jaar} ${groei}; ${kans}.`;
  if (groei) return `In ${nu.jaar} ${groei}.`;
  if (daling) {
    return `In ${nu.jaar} ligt bij ${platformNaam(daling.platformId)} de grootste groeikans op de as ${asNaam(daling.asId)}.`;
  }
  return `In ${nu.jaar} is het gemiddelde ${formatScore(nu.gemiddelde ?? 0)}, vergelijkbaar met ${vorige.jaar}.`;
}
