import { getMetingByJaar, type MetingMetBusinessUnits } from '../data/metingenRepository';
import { leesVragenlijst, type Vragenlijst } from '../data/vragenlijstRepository';

/**
 * The questionnaire of one year (frozen copy or active catalogue). The caller checks the session.
 * @param jaar - Measurement year
 * @returns the list, or null when the meting does not exist
 */
export async function haalVragenlijst(jaar: number): Promise<Vragenlijst | null> {
  return leesVragenlijst(jaar);
}

/**
 * One meting with its business unit rows and its questionnaire. The caller checks the session.
 * @param jaar - Measurement year
 * @returns meting and list, or null when the meting does not exist
 */
export async function haalMetingMetLijst(jaar: number): Promise<{ meting: MetingMetBusinessUnits; lijst: Vragenlijst } | null> {
  const [meting, lijst] = await Promise.all([getMetingByJaar(jaar), leesVragenlijst(jaar)]);
  return meting && lijst ? { meting, lijst } : null;
}
