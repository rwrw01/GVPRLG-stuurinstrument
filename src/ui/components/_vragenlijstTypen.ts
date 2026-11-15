// Shape of GET /api/metingen/{jaar}/vragenlijst and the business unit routes as described in
// api/specs/gvprlg.yaml (schemas Vragenlijst, LijstBusinessUnit, BusinessUnitRij).

export interface UiVraag {
  id: string;
  asId: string;
  kort: string;
  tekst: string;
  nds?: string;
}

export interface UiAs {
  id: string;
  naam: string;
  kleur: string;
  vragen: UiVraag[];
}

export interface UiPlatform {
  id: string;
  naam: string;
  businessUnitIds: string[];
}

export interface UiBusinessUnit {
  id: string;
  platformId: string;
  naam: string;
  kleur: string;
}

export interface UiVragenlijst {
  jaar: number;
  vastgelegd: boolean;
  assen: UiAs[];
  platformen: UiPlatform[];
  businessUnits: UiBusinessUnit[];
}

export interface UiBusinessUnitRij {
  status: 'concept' | 'definitief';
  algemeneToelichting: string;
  aanwezigen: string;
  scoresPerAs: Record<string, Record<string, number | null>>;
  toelichtingen: Record<string, string>;
}

/** Why a business unit is read-only for the user (mirrors `AlleenLezenReden` of the API). */
export type UiAlleenLezenReden = 'rol-lezer' | 'geen-koppeling';
