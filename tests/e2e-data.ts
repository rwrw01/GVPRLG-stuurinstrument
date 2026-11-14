// Shared E2E fixtures: fixed users and years, so global setup and the specs agree on them.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Years 2030-2099 are reserved for E2E runs; real and seeded measurements stay below 2030. */
export const E2E_JAAR_VAN = 2030;
export const E2E_JAAR_TOT = 2099;

/** Fixed measurement year used by the fase-B auth journeys (recreated by global setup). */
export const FASE_B_JAAR = 2041;

/** Two years seeded for the start-screen journeys: a rise for belastingen, a fall for R&O (concept). */
export const OVERZICHT_JAREN = [2043, 2044] as const;

/** Platform of FASE_B_JAAR that the invuller is linked to. */
export const PLATFORM_INVULLER = 'belastingen';
/** Platform of FASE_B_JAAR seeded as concept by someone else (journey 4). */
export const PLATFORM_CONCEPT = 'ro';
/** Platform of FASE_B_JAAR seeded as definitief, reopened in journey 8. */
export const PLATFORM_DEFINITIEF = 'burgerzaken';
/** Platform linked to the new chair in journey 5. */
export const PLATFORM_NIEUWE_VOORZITTER = 'sociaal-domein';

/** Dev realm users; all except NIEUWE_VOORZITTER log in with the dev TOTP seed. */
export const GEBRUIKERS = {
  beheerder: { email: 'beheerder@test.local', naam: 'Test Beheerder' },
  invuller: { email: 'invuller@test.local', naam: 'Test Invuller' },
  lezer: { email: 'lezer@test.local', naam: 'Test Lezer' },
  /** App-only user (no Keycloak account) that journey "rol lezer" turns from invuller into lezer. */
  wordtLezer: { email: 'wordt-lezer@test.local', naam: 'Test Wordt Lezer' },
  nieuweVoorzitter: { email: 'invuller2@test.local', naam: 'Test Invuller Twee' },
  zonderAppGebruiker: { email: 'geen-app@test.local', naam: 'Geen App' },
} as const;

/** Session files written by auth.setup.js (one real TOTP login per user per run). */
export const SESSIE_BEHEERDER = 'playwright/.auth/beheerder.json';
export const SESSIE_INVULLER = 'playwright/.auth/invuller.json';

/** Claimed random years of the current run, one empty file per year, shared by all workers. */
export const JAREN_CLAIM_MAP = join(tmpdir(), 'gvprlg-e2e-jaren');

/**
 * Removes the claims of a previous run; called once by global setup before the workers start.
 * @returns nothing
 */
export function wisJaarClaims(): void {
  rmSync(JAREN_CLAIM_MAP, { recursive: true, force: true });
  mkdirSync(JAREN_CLAIM_MAP, { recursive: true });
}

/**
 * Random year for the fase-A specs, above the fixed fase-B years so the two never collide, and
 * unique within a run across all workers: each year is claimed with an exclusively created file.
 * A repeated year would make POST /api/metingen answer 409 and a journey continue on another
 * journey's data.
 * @returns A year in 2050-2099 that no other test of this run got
 */
export function willekeurigJaar(): number {
  mkdirSync(JAREN_CLAIM_MAP, { recursive: true });
  const start = Math.floor(Math.random() * 50);
  for (let stap = 0; stap < 50; stap += 1) {
    const jaar = 2050 + ((start + stap) % 50);
    try {
      writeFileSync(join(JAREN_CLAIM_MAP, String(jaar)), '', { flag: 'wx' });
      return jaar;
    } catch {
      // Claimed by another test of this run: try the next year.
    }
  }
  throw new Error('All E2E years 2050-2099 are claimed in this run');
}
