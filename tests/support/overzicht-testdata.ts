// Test-only helper: imported exclusively from *.test.ts files, never from production code.
import type { Vragenlijst } from '@/src/data/vragenlijstRepository';
import { berekenBusinessUnitCijfers, berekenJaarCijfers, type BusinessUnitCijfers, type BusinessUnitRij, type JaarCijfers, type MetingInvoer } from '@/src/service/overzichtCijfers';

import { STANDAARD, standaardLijst } from './vragenlijst-testdata';

/**
 * A business unit row in which every question of an axis gets the given score; axes left out stay unanswered.
 * @param status - Stored status (`concept` or `definitief`)
 * @param perAs - Score per axis id
 * @returns the row
 */
export function rij(status: string, perAs: Partial<Record<string, number>>): BusinessUnitRij {
  const scoresPerAs: BusinessUnitRij['scoresPerAs'] = {};
  for (const as of STANDAARD.assen) {
    const score = perAs[as.id];
    scoresPerAs[as.id] = Object.fromEntries(as.vragen.map((v) => [v.id, score ?? null]));
  }
  return { status, scoresPerAs };
}

/**
 * A row with the same score on every axis.
 * @param status - Stored status
 * @param score - Score for all 16 questions
 * @returns the row
 */
export function gelijk(status: string, score: number): BusinessUnitRij {
  return rij(status, { techniek: score, mens: score, proces: score });
}

/**
 * A meting input for one year.
 * @param jaar - Year
 * @param businessUnits - Rows per business unit id
 * @returns the meting input
 */
export function meting(jaar: number, businessUnits: Record<string, BusinessUnitRij> = {}): MetingInvoer {
  return { jaar, businessUnits };
}

/**
 * Year figures of a meting input against a list (default: the migrated list of that year).
 * @param m - Meting input
 * @param lijst - Questionnaire of the year
 * @returns the year figures
 */
export function cijfers(m: MetingInvoer, lijst: Vragenlijst = standaardLijst(m.jaar)): JaarCijfers {
  return berekenJaarCijfers(lijst, m);
}

/**
 * Figures of one migrated business unit against the migrated list.
 * @param id - Business unit id of the migrated list
 * @param data - Row, or undefined
 * @returns the figures
 */
export function unitCijfers(id: string, data: BusinessUnitRij | undefined): BusinessUnitCijfers {
  return berekenBusinessUnitCijfers(standaardLijst(), STANDAARD.businessUnits.find((b) => b.id === id)!, data);
}
