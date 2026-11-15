// Test-only helper: imported exclusively from *.test.ts files, never from production code.
// Each route test declares the mock itself (vi.mock is hoisted per file):
//   vi.mock('@/src/integration/auth/sessie', async (importOriginal) => ({
//     ...(await importOriginal<typeof import('@/src/integration/auth/sessie')>()),
//     vereisGebruiker: vi.fn(),
//   }));
// Only vereisGebruiker is replaced; weigerRol / weigerBusinessUnitSchrijfrecht stay real.
import { vi } from 'vitest';

import type { GebruikerRecord } from '@/src/data/gebruikersRepository';
import { problemResponse } from '@/src/integration/problemResponse';

import { vereisGebruiker } from './sessie';

/**
 * Makes the mocked `vereisGebruiker` return the given user, or a 401 when no user is given.
 * @param gebruiker - The logged-in user, or null for "no session"
 * @returns Nothing; configures the module mock for subsequent calls
 */
export function mockSessie(gebruiker: GebruikerRecord | null): void {
  vi.mocked(vereisGebruiker).mockResolvedValue(
    gebruiker
      ? { ok: true, gebruiker }
      : { ok: false, response: problemResponse(401, 'Niet ingelogd', 'Log in om deze gegevens te bekijken.') },
  );
}
