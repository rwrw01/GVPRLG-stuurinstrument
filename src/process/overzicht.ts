import { listMetingenMetScores } from '../data/metingenRepository';
import { CONFIG } from '../service/config';
import { kiesGespreksonderwerpen, type Gespreksonderwerp } from '../service/gespreksonderwerpen';
import { berekenKerncijfers, vergelijkAssen, type AsVergelijking, type Kerncijfers } from '../service/kerncijfers';
import { maakOpeningszin } from '../service/openingszin';
import { berekenJaarCijfers, kiesVergelijking, type JaarCijfers, type MetingInvoer } from '../service/overzichtCijfers';

/** Everything the start screen and the side menu show, ready to render. */
export interface Overzicht {
  platformen: Array<{ id: string; naam: string; kleur: string }>;
  jaren: JaarCijfers[];
  nuJaar: number | null;
  vorigeJaar: number | null;
  openingszin: string;
  kerncijfers: Kerncijfers | null;
  gespreksonderwerpen: Gespreksonderwerp[];
  assen: AsVergelijking[];
}

/**
 * Composes the start screen from the stored metingen with the pure calculation rules.
 * @param metingen - Every meting with its platform rows, in any order
 * @returns the overview, years oldest first
 */
export function bouwOverzicht(metingen: MetingInvoer[]): Overzicht {
  const jaren = [...metingen].sort((a, b) => a.jaar - b.jaar).map(berekenJaarCijfers);
  const { nu, vorige } = kiesVergelijking(jaren);
  return {
    platformen: CONFIG.platformen.map(({ id, naam, kleur }) => ({ id, naam, kleur })),
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
 * Loads every meting and composes the start screen. The caller checks the session first.
 * @returns the overview
 */
export async function haalOverzicht(): Promise<Overzicht> {
  return bouwOverzicht(await listMetingenMetScores());
}
