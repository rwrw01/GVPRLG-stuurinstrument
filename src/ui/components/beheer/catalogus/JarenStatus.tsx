'use client';

import { verstuurJson } from '../../_verstuurJson';
import type { CatMeting } from './_catalogusTypen';

/**
 * Which open years take over a change and which years are frozen; a beheerder can unfreeze a
 * frozen year that holds nothing yet.
 * @param props.metingen - Year states
 * @param props.beheerder - Whether the unfreeze buttons are shown
 * @param props.onGewijzigd - Called after an unfreeze (or its error message)
 * @returns the note
 */
export function JarenStatus({ metingen, beheerder, onGewijzigd }: { metingen: CatMeting[]; beheerder: boolean; onGewijzigd: (fout: string | null) => void }) {
  const open = metingen.filter((m) => !m.vastgelegd).map((m) => m.jaar);
  const vast = metingen.filter((m) => m.vastgelegd);
  async function geefVrij(jaar: number) {
    if (!window.confirm(`De vragenlijst van ${jaar} weer openzetten? Er is nog niets ingevuld; het jaar volgt daarna weer de actuele lijst.`)) return;
    onGewijzigd(await verstuurJson(`/api/beheer/metingen/${jaar}/vrijgeven`, 'POST'));
  }
  return (
    <div className="alert alert-info jaren-status" role="note" aria-label="Meetjaren">
      <p>
        {open.length > 0 ? `Wijzigingen gelden direct voor de open meetjaren: ${open.join(', ')}.` : 'Er zijn geen open meetjaren.'}{' '}
        {vast.length > 0 ? `Vastgelegde meetjaren blijven ongewijzigd: ${vast.map((m) => m.jaar).join(', ')}.` : ''}
      </p>
      {beheerder && vast.some((m) => !m.heeftInhoud) && (
        <ul className="jaren-vrijgeven">
          {vast.filter((m) => !m.heeftInhoud).map((m) => (
            <li key={m.jaar}>
              {m.jaar} ligt vast maar bevat nog niets.{' '}
              <button type="button" className="btn btn-outline" onClick={() => geefVrij(m.jaar)}>Vragenlijst {m.jaar} weer openzetten</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
