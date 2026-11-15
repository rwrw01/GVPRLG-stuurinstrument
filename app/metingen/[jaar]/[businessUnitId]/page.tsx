'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { ScoreSchaalLegenda } from '@/src/ui/components/ScoreSchaalLegenda';
import { VraagInvoer } from '@/src/ui/components/VraagInvoer';
import type { UiBusinessUnitRij, UiVragenlijst } from '@/src/ui/components/_vragenlijstTypen';
import { useBusinessUnit } from '@/src/ui/hooks/useBusinessUnit';
import { useIk } from '@/src/ui/hooks/useIk';

/**
 * Flattens the stored scores to one value per question of the year's list.
 * @param lijst - Questionnaire of the year
 * @param rij - Stored row, or null
 * @returns score per question id (null when unanswered)
 */
function vlakkeScores(lijst: UiVragenlijst, rij: UiBusinessUnitRij | null): Record<string, number | null> {
  return Object.fromEntries(lijst.assen.flatMap((as) => as.vragen.map((v) => [v.id, rij?.scoresPerAs[as.id]?.[v.id] ?? null])));
}

/**
 * A free-text field of the form (general comment, aanwezigen).
 * @param props - id, label, optional hint, value, read-only flag and change handler
 * @returns the form group
 */
function TekstVeld(props: { id: string; label: string; hint?: string; waarde: string; alleenLezen: boolean; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="form-group">
      <label htmlFor={props.id}>{props.label}</label>
      {props.hint && <p className="veld-hint" id={`${props.id}-hint`}>{props.hint}</p>}
      <textarea id={props.id} value={props.waarde} disabled={props.alleenLezen} placeholder={props.placeholder}
        aria-describedby={props.hint ? `${props.id}-hint` : undefined} onChange={(e) => props.onChange(e.target.value)} />
    </div>
  );
}

export default function InvulformulierPage() {
  const params = useParams<{ jaar: string; businessUnitId: string }>();
  const router = useRouter();
  const { ik, laden: ikLaden } = useIk();
  // UI only (the server refuses every write of a lezer with 403 alleen-lezen): the form stays
  // read-only until the role is known, and for a lezer or when /api/ik failed.
  const alleenLezen = ikLaden || ik === null || ik.rol === 'lezer';
  const staat = useBusinessUnit(params.jaar, params.businessUnitId);
  const [algemeneToelichting, setAlgemeneToelichting] = useState('');
  const [aanwezigen, setAanwezigen] = useState('');
  const [scores, setScores] = useState<Record<string, number | null>>({});
  const [toelichtingen, setToelichtingen] = useState<Record<string, string>>({});
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    if (staat.status !== 'ok') return;
    setAlgemeneToelichting(staat.rij?.algemeneToelichting ?? '');
    setAanwezigen(staat.rij?.aanwezigen ?? '');
    setScores(vlakkeScores(staat.lijst, staat.rij));
    setToelichtingen(staat.rij?.toelichtingen ?? {});
  }, [staat]);

  if (staat.status === 'laden') return <p>Laden...</p>;
  if (staat.status === 'fout') {
    return (
      <div>
        <h2>Meting {params.jaar}</h2>
        <div className="alert alert-warning" role="alert">{staat.melding}</div>
      </div>
    );
  }
  const { lijst, unit } = staat;

  async function opslaan(status: 'concept' | 'definitief') {
    setFout(null);
    const vraagScores = lijst.assen.flatMap((as) => as.vragen.map((v) => ({ vraagId: v.id, score: scores[v.id] ?? null, toelichting: toelichtingen[v.id] ?? '' })));
    const response = await fetch(`/api/metingen/${params.jaar}/businessunits/${params.businessUnitId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, algemeneToelichting, aanwezigen, vraagScores }),
    });
    if (!response.ok) {
      const problem = await response.json().catch(() => null);
      setFout(problem?.detail ?? 'Opslaan is mislukt.');
      return;
    }
    if (status === 'definitief') router.push(`/metingen/${params.jaar}/${params.businessUnitId}/resultaat`);
    else alert('Opgeslagen als concept.');
  }

  return (
    <div>
      <h2>{unit.naam} — Meting {params.jaar}</h2>
      {ik?.rol === 'lezer' && <div className="alert alert-info" role="status">Je hebt alleen leesrechten. Wijzigingen opslaan is niet mogelijk.</div>}
      {fout && <div className="alert alert-warning" role="alert">{fout}</div>}
      <ScoreSchaalLegenda />
      {lijst.assen.map((as) => (
        <div className="card" key={as.id}>
          <h2 style={{ color: as.kleur }}>{as.naam}</h2>
          {as.vragen.map((v, vi) => (
            <VraagInvoer key={v.id} vraag={v} nummer={vi + 1} score={scores[v.id] ?? null} toelichting={toelichtingen[v.id] ?? ''} alleenLezen={alleenLezen}
              onScore={(s) => setScores((prev) => ({ ...prev, [v.id]: s }))}
              onToelichting={(t) => setToelichtingen((prev) => ({ ...prev, [v.id]: t }))} />
          ))}
        </div>
      ))}
      <div className="card">
        <TekstVeld id="algemene-toelichting" label="Algemene toelichting bij deze meting (optioneel)" waarde={algemeneToelichting} alleenLezen={alleenLezen}
          onChange={setAlgemeneToelichting} placeholder="Overkoepelende opmerkingen bij deze meting" />
        <TekstVeld id="aanwezigen" label="Aanwezigen" hint="Wie waren erbij?" waarde={aanwezigen} alleenLezen={alleenLezen} onChange={setAanwezigen} />
      </div>
      {!alleenLezen && (
        <div className="btn-group">
          <button className="btn btn-primary" onClick={() => opslaan('concept')}>Opslaan als concept</button>
          <button className="btn btn-success" onClick={() => opslaan('definitief')}>Afronden (definitief)</button>
        </div>
      )}
    </div>
  );
}
