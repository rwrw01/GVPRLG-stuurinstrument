// Test-only helper: imported exclusively from *.test.ts files, never from production code.
import { bewaarBusinessUnitScore } from '@/src/data/metingenRepository';

/**
 * Saves one business unit row without access or list checks (the year is frozen as on a real save).
 * @param input - Row; `aanwezigen` defaults to empty
 * @returns Promise that resolves once saved
 */
export async function bewaarTestScore(input: {
  metingId: string;
  jaar: number;
  businessUnitId: string;
  status: string;
  algemeneToelichting: string;
  aanwezigen?: string;
  laatstGewijzigdDoor: string;
  actorEmail?: string;
  vraagScores: Array<{ vraagId: string; score: number | null; toelichting: string }>;
}): Promise<void> {
  const resultaat = await bewaarBusinessUnitScore({ aanwezigen: '', ...input }, () => null);
  if (!resultaat.ok) throw new Error(`Test save refused: ${String(resultaat.fout)}`);
}
