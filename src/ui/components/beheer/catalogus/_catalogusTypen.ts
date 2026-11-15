// Shape of GET /api/beheer/catalogus as described in api/specs/gvprlg.yaml (schema Catalogus).

export interface CatVraag {
  id: string;
  asId: string;
  kort: string;
  tekst: string;
  nds: string | null;
  volgorde: number;
  vervallen: boolean;
}

export interface CatAs {
  id: string;
  naam: string;
  kleur: string;
  volgorde: number;
  vervallen: boolean;
  vragen: CatVraag[];
}

export interface CatBusinessUnit {
  id: string;
  platformId: string;
  naam: string;
  kleur: string;
  volgorde: number;
  vervallen: boolean;
}

export interface CatPlatform {
  id: string;
  naam: string;
  volgorde: number;
  vervallen: boolean;
  businessUnits: CatBusinessUnit[];
}

export interface CatMeting {
  jaar: number;
  vastgelegd: boolean;
  heeftInhoud: boolean;
}

export interface CatalogusData {
  assen: CatAs[];
  platformen: CatPlatform[];
  metingen: CatMeting[];
}
