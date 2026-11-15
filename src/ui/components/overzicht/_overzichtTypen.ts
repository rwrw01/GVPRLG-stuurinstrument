// Shape of GET /api/overzicht as described in api/specs/gvprlg.yaml (schema Overzicht).

export type OverzichtStatus = 'definitief' | 'concept' | 'niet-gestart';

export interface BusinessUnitCijfers {
  businessUnitId: string;
  naam: string;
  kleur: string;
  platformId: string;
  platformNaam: string;
  status: OverzichtStatus;
  perAs: Record<string, number | null>;
  totaal: number | null;
  beantwoord: number;
}

export interface JaarCijfers {
  jaar: number;
  vastgelegd: boolean;
  voortgang: string;
  aantalDefinitief: number;
  aantalVragen: number;
  gemiddelde: number | null;
  perAs: Record<string, number | null>;
  assen: Array<{ id: string; naam: string; kleur: string }>;
  businessUnits: BusinessUnitCijfers[];
}

export interface AsScore {
  businessUnitId: string;
  asId: string;
  waarde: number;
  vorige: number | null;
  verschil: number | null;
}

export interface Kerncijfers {
  jaar: number;
  gemiddelde: number | null;
  aantalGemiddelde: number;
  vorigeJaar: number | null;
  vergelijking: { nu: number; vorige: number; aantal: number } | null;
  aantalBusinessUnits: number;
  aantalDefinitief: number;
  aantalConcept: number;
  aantalNietGestart: number;
  stijger: { businessUnitId: string; waarde: number; vorige: number; verschil: number } | null;
  groeikans: AsScore | null;
}

export interface Gespreksonderwerp {
  soort: 'daling' | 'concept' | 'niet-gestart' | 'stijging';
  titel: string;
  toelichting: string;
}

export interface OverzichtBusinessUnit {
  id: string;
  naam: string;
  kleur: string;
  platformNaam: string;
}

export interface AsVergelijking {
  id: string;
  naam: string;
  nu: number | null;
  vorige: number | null;
  aantal: number;
  vergeleken: boolean;
}

export interface Overzicht {
  businessUnits: OverzichtBusinessUnit[];
  jaren: JaarCijfers[];
  nuJaar: number | null;
  vorigeJaar: number | null;
  openingszin: string;
  kerncijfers: Kerncijfers | null;
  gespreksonderwerpen: Gespreksonderwerp[];
  assen: AsVergelijking[];
}
