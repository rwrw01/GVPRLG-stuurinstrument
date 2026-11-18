import { leesDetail } from '../_verstuurJson';
import type { BeheerGebruiker, GebruikerWijziging } from './_beheerTypen';
import { bewerkStappen, stapVerzoek, voerStappenUit, type BewerkbareGebruiker } from './_gebruikerBewerken';

/** Outcome of loading the user list of one year. */
export type LaadResultaat = { ok: true; gebruikers: BeheerGebruiker[] } | { ok: false; melding: string };

/** What the admin actions need from the page: the chosen year, I/O and the state setters. */
export interface BeheerActiesDeps {
  actueelJaar: () => number;
  haal: (jaar: number) => Promise<LaadResultaat>;
  verstuur: (url: string, method: 'PATCH' | 'PUT', body: unknown) => Promise<string | null>;
  zetGebruikers: (jaar: number, gebruikers: BeheerGebruiker[]) => void;
  zetFout: (melding: string | null) => void;
}

/**
 * Loads the users of one year from `GET /api/beheer/gebruikers`.
 * @param jaar - Measurement year of the platform links
 * @returns the users, or a Dutch error message
 */
export async function haalGebruikers(jaar: number): Promise<LaadResultaat> {
  const response = await fetch(`/api/beheer/gebruikers?jaar=${jaar}`).catch(() => null);
  if (!response) return { ok: false, melding: 'De server is niet bereikbaar.' };
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) return { ok: false, melding: leesDetail(json) ?? 'Kon de gebruikers niet laden.' };
  return { ok: true, gebruikers: (json as { gebruikers: BeheerGebruiker[] }).gebruikers };
}

/**
 * The user-admin actions. Every (re)load is for an explicit year and its answer is dropped when
 * another year is chosen by then, so a slow answer can never fill the table, or an edit panel,
 * with another year's links (CWE-362).
 * @param deps - Chosen year, I/O and state setters
 * @returns `laad`, `wijzig` (access actions) and `slaOp` (role and links from the edit panel)
 */
export function maakBeheerActies(deps: BeheerActiesDeps) {
  async function laad(jaar: number): Promise<void> {
    const resultaat = await deps.haal(jaar);
    if (deps.actueelJaar() !== jaar) return;
    if (resultaat.ok) deps.zetGebruikers(jaar, resultaat.gebruikers);
    else deps.zetFout(resultaat.melding);
  }

  async function wijzig(jaar: number, id: string, wijziging: GebruikerWijziging): Promise<void> {
    deps.zetFout(null);
    const melding = await deps.verstuur(`/api/beheer/gebruikers/${id}`, 'PATCH', wijziging);
    if (melding) deps.zetFout(melding);
    await laad(jaar);
  }

  // Role first, then the year's links; only what changed. The panel shows the returned message;
  // when the year changed meanwhile the panel is gone, so the page shows it instead.
  async function slaOp(jaar: number, g: BeheerGebruiker, nieuw: BewerkbareGebruiker): Promise<string | null> {
    const melding = await voerStappenUit(bewerkStappen(g, nieuw), (stap) => {
      const verzoek = stapVerzoek(g.id, jaar, stap);
      return deps.verstuur(verzoek.url, verzoek.method, verzoek.body);
    });
    if (melding && deps.actueelJaar() !== jaar) deps.zetFout(melding);
    await laad(jaar);
    return melding;
  }

  return { laad, wijzig, slaOp };
}
