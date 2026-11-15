import { CONFIG } from '@/src/service/config';

import type { UiVraag } from './_vragenlijstTypen';

interface VraagInvoerProps {
  vraag: UiVraag;
  nummer: number;
  score: number | null;
  toelichting: string;
  alleenLezen: boolean;
  onScore: (score: number) => void;
  onToelichting: (tekst: string) => void;
}

/**
 * One question of the invulformulier: the 1-5 radio group and the optional comment.
 * @param props.vraag - The question of the year's list
 * @param props.nummer - Number within its axis
 * @param props.score - Current score, or null
 * @param props.toelichting - Current comment
 * @param props.alleenLezen - Disables the inputs (lezer, or role not known yet)
 * @param props.onScore - Receives a chosen score
 * @param props.onToelichting - Receives the comment text
 * @returns the question row
 */
export function VraagInvoer({ vraag, nummer, score, toelichting, alleenLezen, onScore, onToelichting }: VraagInvoerProps) {
  return (
    <div className="question-row">
      <span className="question-nr">{nummer}.</span>
      <span className="question-text-compact">
        {vraag.tekst}
        {vraag.nds && <span className="nds-tag">NDS</span>}
      </span>
      <div className="score-group" role="radiogroup" aria-label={vraag.tekst}>
        {CONFIG.schaal.map((s) => (
          <label className="score-option" key={s.waarde}>
            <input
              type="radio"
              name={vraag.id}
              value={s.waarde}
              checked={score === s.waarde}
              disabled={alleenLezen}
              onChange={() => onScore(s.waarde)}
              aria-label={`${s.waarde} - ${s.naam} (${s.label}): ${s.beschrijving}`}
            />
            <span className="score-btn">{s.waarde}</span>
          </label>
        ))}
      </div>
      <div className="question-toelichting">
        <label htmlFor={`toelichting-${vraag.id}`}>Opmerking (optioneel)</label>
        <textarea
          id={`toelichting-${vraag.id}`}
          value={toelichting}
          disabled={alleenLezen}
          onChange={(e) => onToelichting(e.target.value)}
          placeholder="Onderbouwing / verantwoording voor deze score"
        />
      </div>
    </div>
  );
}
