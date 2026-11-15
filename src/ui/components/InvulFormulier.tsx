'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { ScoreSchaalLegenda } from './ScoreSchaalLegenda';
import { VraagInvoer } from './VraagInvoer';
import type { UiBusinessUnit, UiBusinessUnitRij, UiVragenlijst } from './_vragenlijstTypen';

interface Waarden {
  scores: Record<string, number | null>;
  toelichtingen: Record<string, string>;
  algemeneToelichting: string;
  aanwezigen: string;
}

/**
 * The form values of a stored row, one score per question of the year's list.
 * @param lijst - Questionnaire of the year
 * @param rij - Stored row, or null
 * @returns the initial form values
 */
function beginWaarden(lijst: UiVragenlijst, rij: UiBusinessUnitRij | null): Waarden {
  return {
    scores: Object.fromEntries(lijst.assen.flatMap((as) => as.vragen.map((v) => [v.id, rij?.scoresPerAs[as.id]?.[v.id] ?? null]))),
    toelichtingen: rij?.toelichtingen ?? {},
    algemeneToelichting: rij?.algemeneToelichting ?? '',
    aanwezigen: rij?.aanwezigen ?? '',
  };
}

/**
 * Sends the form to the score API.
 * @param url - The business unit route
 * @param lijst - Questionnaire of the year (decides which questions are sent)
 * @param w - Form values
 * @param status - `concept` or `definitief`
 * @returns null on success, otherwise the Dutch message
 */
async function verstuur(url: string, lijst: UiVragenlijst, w: Waarden, status: 'concept' | 'definitief'): Promise<string | null> {
  const vraagScores = lijst.assen.flatMap((as) => as.vragen.map((v) => ({ vraagId: v.id, score: w.scores[v.id] ?? null, toelichting: w.toelichtingen[v.id] ?? '' })));
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, algemeneToelichting: w.algemeneToelichting, aanwezigen: w.aanwezigen, vraagScores }),
  });
  if (response.ok) return null;
  const problem = await response.json().catch(() => null);
  return problem?.detail ?? 'Opslaan is mislukt.';
}

/**
 * A free-text field of the form (general comment, aanwezigen).
 * @param props - id, label, optional hint and placeholder, value, read-only flag and change handler
 * @returns the form group
 */
function TekstVeld(props: { id: string; label: string; hint?: string; placeholder?: string; waarde: string; alleenLezen: boolean; onChange: (v: string) => void }) {
  return (
    <div className="form-group">
      <label htmlFor={props.id}>{props.label}</label>
      {props.hint && <p className="veld-hint" id={`${props.id}-hint`}>{props.hint}</p>}
      <textarea id={props.id} value={props.waarde} disabled={props.alleenLezen} placeholder={props.placeholder}
        aria-describedby={props.hint ? `${props.id}-hint` : undefined} onChange={(e) => props.onChange(e.target.value)} />
    </div>
  );
}

interface InvulFormulierProps {
  jaar: string;
  lijst: UiVragenlijst;
  unit: UiBusinessUnit;
  rij: UiBusinessUnitRij | null;
  alleenLezen: boolean;
}

/**
 * The invulformulier of one business unit: the questions of the year's list per axis, the general
 * comment, Aanwezigen and the save buttons (hidden when read-only).
 * @param props - Year, its list, the unit, the stored row and whether the form is read-only
 * @returns the form
 */
export function InvulFormulier({ jaar, lijst, unit, rij, alleenLezen }: InvulFormulierProps) {
  const router = useRouter();
  const [w, setW] = useState<Waarden>(() => beginWaarden(lijst, rij));
  const [fout, setFout] = useState<string | null>(null);
  const zet = (deel: Partial<Waarden>) => setW((oud) => ({ ...oud, ...deel }));
  async function opslaan(status: 'concept' | 'definitief') {
    setFout(null);
    const melding = await verstuur(`/api/metingen/${jaar}/businessunits/${unit.id}`, lijst, w, status);
    if (melding) return setFout(melding);
    if (status === 'definitief') router.push(`/metingen/${jaar}/${unit.id}/resultaat`);
    else alert('Opgeslagen als concept.');
  }
  return (
    <>
      {fout && <div className="alert alert-warning" role="alert">{fout}</div>}
      <ScoreSchaalLegenda />
      {lijst.assen.map((as) => (
        <div className="card" key={as.id}>
          <h2 style={{ color: as.kleur }}>{as.naam}</h2>
          {as.vragen.map((v, vi) => (
            <VraagInvoer key={v.id} vraag={v} nummer={vi + 1} score={w.scores[v.id] ?? null} toelichting={w.toelichtingen[v.id] ?? ''} alleenLezen={alleenLezen}
              onScore={(s) => zet({ scores: { ...w.scores, [v.id]: s } })} onToelichting={(t) => zet({ toelichtingen: { ...w.toelichtingen, [v.id]: t } })} />
          ))}
        </div>
      ))}
      <div className="card">
        <TekstVeld id="algemene-toelichting" label="Algemene toelichting bij deze meting (optioneel)" waarde={w.algemeneToelichting} alleenLezen={alleenLezen}
          onChange={(t) => zet({ algemeneToelichting: t })} placeholder="Overkoepelende opmerkingen bij deze meting" />
        <TekstVeld id="aanwezigen" label="Aanwezigen" hint="Wie waren erbij?" waarde={w.aanwezigen} alleenLezen={alleenLezen} onChange={(t) => zet({ aanwezigen: t })} />
      </div>
      {!alleenLezen && (
        <div className="btn-group">
          <button className="btn btn-primary" onClick={() => opslaan('concept')}>Opslaan als concept</button>
          <button className="btn btn-success" onClick={() => opslaan('definitief')}>Afronden (definitief)</button>
        </div>
      )}
    </>
  );
}
