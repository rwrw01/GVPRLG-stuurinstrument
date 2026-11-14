// Test-only helper: imported exclusively from *.test.ts files, never from production code.
import { CONFIG } from './config';
import type { MetingInvoer, PlatformRij } from './overzichtCijfers';

/**
 * A platform row in which every question of an axis gets the given score; axes left out stay unanswered.
 * @param status - Stored status (`concept` or `definitief`)
 * @param perAs - Score per axis id
 * @returns the row
 */
export function rij(status: string, perAs: Partial<Record<string, number>>): PlatformRij {
  const scoresPerAs: PlatformRij['scoresPerAs'] = {};
  for (const as of CONFIG.assen) {
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
export function gelijk(status: string, score: number): PlatformRij {
  return rij(status, { techniek: score, mens: score, proces: score });
}

/**
 * A meting input for one year.
 * @param jaar - Year
 * @param platformen - Rows per platform id
 * @returns the meting input
 */
export function meting(jaar: number, platformen: Record<string, PlatformRij> = {}): MetingInvoer {
  return { jaar, platformen };
}
