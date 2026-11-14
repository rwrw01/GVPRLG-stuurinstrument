// Shape of GET /api/overzicht as described in api/specs/gvprlg.yaml (schema Overzicht).

export type OverzichtStatus = 'definitief' | 'concept' | 'niet-gestart';

export interface PlatformCijfers {
  platformId: string;
  status: OverzichtStatus;
  perAs: Record<string, number | null>;
  totaal: number | null;
  beantwoord: number;
}

export interface JaarCijfers {
  jaar: number;
  voortgang: string;
  aantalDefinitief: number;
  gemiddelde: number | null;
  perAs: Record<string, number | null>;
  platformen: PlatformCijfers[];
}

export interface AsScore {
  platformId: string;
  asId: string;
  waarde: number;
  vorige: number | null;
  verschil: number | null;
}

export interface Kerncijfers {
  jaar: number;
  gemiddelde: number | null;
  vorigeJaar: number | null;
  vorigeGemiddelde: number | null;
  aantalPlatformen: number;
  aantalDefinitief: number;
  aantalConcept: number;
  aantalNietGestart: number;
  stijger: { platformId: string; waarde: number; vorige: number; verschil: number } | null;
  groeikans: AsScore | null;
}

export interface Gespreksonderwerp {
  soort: 'daling' | 'concept' | 'niet-gestart' | 'stijging';
  titel: string;
  toelichting: string;
}

export interface OverzichtPlatform {
  id: string;
  naam: string;
  kleur: string;
}

export interface AsVergelijking {
  id: string;
  naam: string;
  nu: number | null;
  vorige: number | null;
}

export interface Overzicht {
  platformen: OverzichtPlatform[];
  jaren: JaarCijfers[];
  nuJaar: number | null;
  vorigeJaar: number | null;
  openingszin: string;
  kerncijfers: Kerncijfers | null;
  gespreksonderwerpen: Gespreksonderwerp[];
  assen: AsVergelijking[];
}
