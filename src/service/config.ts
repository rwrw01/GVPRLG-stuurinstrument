export interface SchaalNiveau {
  waarde: number;
  /** CMMI name of the level, shown after the Dutch name. */
  label: string;
  /** Dutch name of the level, shown first in the UI. */
  naam: string;
  beschrijving: string;
}

export interface NdsThema {
  id: string;
  kleur: string;
}

// Axes, questions, platforms and business units are managed in the app (catalogue tables, frozen
// per measurement year); only the NDS themes and the 1-5 scale stay in code.
export const CONFIG: {
  ndsThemas: NdsThema[];
  schaal: SchaalNiveau[];
} = {
  ndsThemas: [
    { id: 'Open', kleur: '#6366F1' },
    { id: 'Cloud', kleur: '#3786D2' },
    { id: 'AI', kleur: '#2c7fa0' },
    { id: 'Burgers en ondernemers centraal', kleur: '#15803D' },
    { id: 'Digitale weerbaarheid en autonomie', kleur: '#1c3f4f' },
    { id: 'Digitaal vakmanschap', kleur: '#C2410C' },
  ],
  schaal: [
    { waarde: 1, label: 'Initial', naam: 'Ad hoc', beschrijving: 'Ad-hoc, geen gestructureerde aanpak' },
    { waarde: 2, label: 'Managed', naam: 'Herhaalbaar', beschrijving: 'Herhaalbaar op projectniveau, nog niet organisatiebreed geborgd' },
    { waarde: 3, label: 'Defined', naam: 'Vastgelegd', beschrijving: 'Gestandaardiseerd en organisatiebreed vastgelegd' },
    { waarde: 4, label: 'Quantitatively Managed', naam: 'Gemeten', beschrijving: 'Gemeten en gestuurd op basis van data' },
    { waarde: 5, label: 'Optimizing', naam: 'Lerend', beschrijving: 'Continue verbetering ingebed in de organisatie' },
  ],
};
