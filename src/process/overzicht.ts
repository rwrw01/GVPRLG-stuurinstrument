import { listMetingenMetScores } from '../data/metingenRepository';
import { leesVragenlijsten, type Vragenlijst } from '../data/vragenlijstRepository';
import { kiesGespreksonderwerpen, type Gespreksonderwerp } from '../service/gespreksonderwerpen';
import { berekenKerncijfers, vergelijkAssen, type AsVergelijking, type Kerncijfers } from '../service/kerncijfers';
import { maakOpeningszin } from '../service/openingszin';
import { berekenJaarCijfers, kiesVergelijking, type JaarCijfers, type MetingInvoer } from '../service/overzichtCijfers';

/** A business unit that takes part in at least one year, with its name and colour of the newest such year. */
export interface OverzichtBusinessUnit {
  id: string;
  naam: string;
  kleur: string;
  platformNaam: string;
}

/** Everything the start screen and the side menu show, ready to render. */
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

/**
 * Every business unit of any year: first those of the newest year in its order, then those that
 * only took part in older years (a removed unit keeps the name and colour of its last year).
 * @param jaren - Year figures, oldest first
 * @returns the business units for legend, trend and year table
 */
export function alleBusinessUnits(jaren: JaarCijfers[]): OverzichtBusinessUnit[] {
  const gezien = new Map<string, OverzichtBusinessUnit>();
  for (const jaar of [...jaren].reverse()) {
    for (const b of jaar.businessUnits) {
      if (!gezien.has(b.businessUnitId)) gezien.set(b.businessUnitId, { id: b.businessUnitId, naam: b.naam, kleur: b.kleur, platformNaam: b.platformNaam });
    }
  }
  return [...gezien.values()];
}

/**
 * Composes the start screen from the stored metingen and the questionnaire of each year.
 * @param lijsten - Questionnaire per year
 * @param metingen - Every meting with its business unit rows, in any order; a year without list is skipped
 * @returns the overview, years oldest first
 */
export function bouwOverzicht(lijsten: Map<number, Vragenlijst>, metingen: MetingInvoer[]): Overzicht {
  const jaren = [...metingen]
    .filter((m) => lijsten.has(m.jaar))
    .sort((a, b) => a.jaar - b.jaar)
    .map((m) => berekenJaarCijfers(lijsten.get(m.jaar)!, m));
  const { nu, vorige } = kiesVergelijking(jaren);
  return {
    businessUnits: alleBusinessUnits(jaren),
    jaren,
    nuJaar: nu?.jaar ?? null,
    vorigeJaar: vorige?.jaar ?? null,
    openingszin: maakOpeningszin(jaren),
    kerncijfers: nu ? berekenKerncijfers(nu, vorige) : null,
    gespreksonderwerpen: kiesGespreksonderwerpen(jaren),
    assen: vergelijkAssen(nu, vorige),
  };
}

/**
 * Loads every meting with its list and composes the start screen. The caller checks the session first.
 * @returns the overview
 */
export async function haalOverzicht(): Promise<Overzicht> {
  const [lijsten, metingen] = await Promise.all([leesVragenlijsten(), listMetingenMetScores()]);
  return bouwOverzicht(lijsten, metingen);
}
