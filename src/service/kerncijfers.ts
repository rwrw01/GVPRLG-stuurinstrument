import { CONFIG } from './config';
import { gemiddelde, type JaarCijfers } from './overzichtCijfers';
import {
  definitiefGemiddelde,
  definitieveVan,
  gemeenschappelijk,
  grootsteGroeikans,
  grootsteStijger,
  type AsScore,
  type Stijger,
} from './overzichtAnalyse';

/** Average of the platforms that are definitief in both years, in each year. */
export interface Vergelijking {
  nu: number;
  vorige: number;
  aantal: number;
}

/** Key figures of the newest year with scores. */
export interface Kerncijfers {
  jaar: number;
  /** Mean total of the definitief platforms of the year. */
  gemiddelde: number | null;
  /** Number of platforms behind `gemiddelde`. */
  aantalGemiddelde: number;
  vorigeJaar: number | null;
  /** Comparison over the platforms definitief in both years; null when there is none. */
  vergelijking: Vergelijking | null;
  aantalPlatformen: number;
  aantalDefinitief: number;
  aantalConcept: number;
  aantalNietGestart: number;
  stijger: Stijger | null;
  groeikans: AsScore | null;
}

/** One axis averaged over platforms; compared over the common definitief platforms when possible. */
export interface AsVergelijking {
  id: string;
  naam: string;
  nu: number | null;
  vorige: number | null;
  /** Number of platforms behind the figures. */
  aantal: number;
  /** True when `nu` and `vorige` are over the platforms definitief in both years. */
  vergeleken: boolean;
}

/**
 * Compares the mean total of the platforms that are definitief in both years.
 * @param nu - Newest year with scores
 * @param vorige - Comparison year, or null
 * @returns the comparison, or null without a comparison year or without common platforms
 */
export function vergelijkGemiddelde(nu: JaarCijfers, vorige: JaarCijfers | null): Vergelijking | null {
  const paren = vorige ? gemeenschappelijk(nu, vorige) : [];
  if (paren.length === 0) return null;
  return {
    nu: gemiddelde(paren.map((p) => p.nu.totaal!))!,
    vorige: gemiddelde(paren.map((p) => p.vorige.totaal!))!,
    aantal: paren.length,
  };
}

/**
 * Key figures: definitief average with its base and comparison, progress, largest riser and
 * largest growth opportunity.
 * @param nu - Newest year with scores
 * @param vorige - Comparison year, or null
 * @returns the key figures
 */
export function berekenKerncijfers(nu: JaarCijfers, vorige: JaarCijfers | null): Kerncijfers {
  const tel = (status: string) => nu.platformen.filter((p) => p.status === status).length;
  return {
    jaar: nu.jaar,
    gemiddelde: definitiefGemiddelde(nu),
    aantalGemiddelde: definitieveVan(nu).length,
    vorigeJaar: vorige?.jaar ?? null,
    vergelijking: vergelijkGemiddelde(nu, vorige),
    aantalPlatformen: nu.platformen.length,
    aantalDefinitief: tel('definitief'),
    aantalConcept: tel('concept'),
    aantalNietGestart: tel('niet-gestart'),
    stijger: vorige ? grootsteStijger(nu, vorige) : null,
    groeikans: grootsteGroeikans(nu, vorige),
  };
}

function gemiddeldeAs(waarden: Array<number | null | undefined>): number | null {
  return gemiddelde(waarden.filter((v): v is number => v != null));
}

/**
 * The three axes: over the platforms definitief in both years when there are any, otherwise the
 * definitief platforms of the newest year without comparison.
 * @param nu - Newest year with scores, or null
 * @param vorige - Comparison year, or null
 * @returns one entry per configured axis
 */
export function vergelijkAssen(nu: JaarCijfers | null, vorige: JaarCijfers | null): AsVergelijking[] {
  const paren = nu && vorige ? gemeenschappelijk(nu, vorige) : [];
  const eigen = nu ? definitieveVan(nu) : [];
  return CONFIG.assen.map((as) => {
    if (paren.length > 0) {
      return {
        id: as.id,
        naam: as.naam,
        nu: gemiddeldeAs(paren.map((p) => p.nu.perAs[as.id])),
        vorige: gemiddeldeAs(paren.map((p) => p.vorige.perAs[as.id])),
        aantal: paren.length,
        vergeleken: true,
      };
    }
    return { id: as.id, naam: as.naam, nu: gemiddeldeAs(eigen.map((p) => p.perAs[as.id])), vorige: null, aantal: eigen.length, vergeleken: false };
  });
}
