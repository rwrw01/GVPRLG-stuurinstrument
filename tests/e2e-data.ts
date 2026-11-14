// Shared E2E fixtures: fixed users and years, so global setup and the specs agree on them.

/** Years 2030-2099 are reserved for E2E runs; real and seeded measurements stay below 2030. */
export const E2E_JAAR_VAN = 2030;
export const E2E_JAAR_TOT = 2099;

/** Fixed measurement year used by the fase-B auth journeys (recreated by global setup). */
export const FASE_B_JAAR = 2041;

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

/**
 * Random year for the fase-A specs, above the fixed fase-B years so the two never collide.
 * @returns A year in 2050-2099
 */
export function willekeurigJaar(): number {
  return 2050 + Math.floor(Math.random() * 50);
}
