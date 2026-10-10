'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CONFIG } from '@/src/service/config';
import { ScoreSchaalLegenda } from '@/src/ui/components/ScoreSchaalLegenda';

interface PlatformData {
  status: string;
  algemeneToelichting: string;
  scoresPerAs: Record<string, Record<string, number | null>>;
  toelichtingen: Record<string, string>;
}

export default function InvulformulierPage() {
  const params = useParams<{ jaar: string; platformId: string }>();
  const router = useRouter();
  const [laden, setLaden] = useState(true);
  const [laadFout, setLaadFout] = useState<string | null>(null);
  const [algemeneToelichting, setAlgemeneToelichting] = useState('');
  const [scores, setScores] = useState<Record<string, number | null>>({});
  const [toelichtingen, setToelichtingen] = useState<Record<string, string>>({});
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    setLaden(true);
    setLaadFout(null);
    fetch(`/api/metingen/${params.jaar}/platformen/${params.platformId}`)
      .then(async (response) => {
        if (!response.ok) {
          const problem = await response.json().catch(() => null);
          setLaadFout(problem?.detail ?? 'Onbekende fout bij het laden van dit platform.');
          setLaden(false);
          return;
        }
        const json = await response.json();
        const platform: PlatformData | null = json.platform;
        setAlgemeneToelichting(platform?.algemeneToelichting ?? '');
        const vlakkeScores: Record<string, number | null> = {};
        for (const as of CONFIG.assen) {
          for (const v of as.vragen) {
            vlakkeScores[v.id] = platform?.scoresPerAs[as.id]?.[v.id] ?? null;
          }
        }
        setScores(vlakkeScores);
        setToelichtingen(platform?.toelichtingen ?? {});
        setLaden(false);
      })
      .catch(() => {
        setLaadFout('Kon dit platform niet laden.');
        setLaden(false);
      });
  }, [params.jaar, params.platformId]);

  async function opslaan(status: 'concept' | 'definitief') {
    setFout(null);
    const vraagScores = CONFIG.assen.flatMap((as) =>
      as.vragen.map((v) => ({
        vraagId: v.id,
        score: scores[v.id] ?? null,
        toelichting: toelichtingen[v.id] ?? '',
      })),
    );
    const response = await fetch(`/api/metingen/${params.jaar}/platformen/${params.platformId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, algemeneToelichting, vraagScores }),
    });
    if (!response.ok) {
      const problem = await response.json();
      setFout(problem.detail);
      return;
    }
    if (status === 'definitief') {
      router.push(`/metingen/${params.jaar}/${params.platformId}/resultaat`);
    } else {
      alert('Opgeslagen als concept.');
    }
  }

  const platform = CONFIG.platformen.find((p) => p.id === params.platformId);

  if (laden) return <p>Laden...</p>;

  if (laadFout) {
    return (
      <div>
        <h2>{platform?.naam} — Meting {params.jaar}</h2>
        <div className="alert alert-warning" role="alert">{laadFout}</div>
      </div>
    );
  }

  return (
    <div>
      <h2>{platform?.naam} — Meting {params.jaar}</h2>
      {fout && <div className="alert alert-warning" role="alert">{fout}</div>}
      <ScoreSchaalLegenda />
      {CONFIG.assen.map((as) => (
        <div className="card" key={as.id}>
          <h2 style={{ color: as.kleur }}>{as.naam}</h2>
          {as.vragen.map((v, vi) => (
            <div className="question-row" key={v.id}>
              <span className="question-nr">{vi + 1}.</span>
              <span className="question-text-compact">
                {v.tekst}
                {v.nds && <span className="nds-tag">NDS</span>}
              </span>
              <div className="score-group" role="radiogroup" aria-label={v.tekst}>
                {CONFIG.schaal.map((s) => (
                  <label className="score-option" key={s.waarde}>
                    <input
                      type="radio"
                      name={v.id}
                      value={s.waarde}
                      checked={scores[v.id] === s.waarde}
                      onChange={() => setScores((prev) => ({ ...prev, [v.id]: s.waarde }))}
                      aria-label={`${s.waarde} - ${s.label}: ${s.beschrijving}`}
                    />
                    <span className="score-btn">{s.waarde}</span>
                  </label>
                ))}
              </div>
              <div className="question-toelichting">
                <label htmlFor={`toelichting-${v.id}`}>Opmerking (optioneel)</label>
                <textarea
                  id={`toelichting-${v.id}`}
                  value={toelichtingen[v.id] ?? ''}
                  onChange={(e) => setToelichtingen((prev) => ({ ...prev, [v.id]: e.target.value }))}
                  placeholder="Onderbouwing / verantwoording voor deze score"
                />
              </div>
            </div>
          ))}
        </div>
      ))}
      <div className="card">
        <div className="form-group">
          <label htmlFor="algemene-toelichting">Algemene toelichting bij deze meting (optioneel)</label>
          <textarea
            id="algemene-toelichting"
            value={algemeneToelichting}
            onChange={(e) => setAlgemeneToelichting(e.target.value)}
            placeholder="Overkoepelende opmerkingen bij deze platform-meting"
          />
        </div>
      </div>
      <div className="btn-group">
        <button className="btn btn-primary" onClick={() => opslaan('concept')}>Opslaan als concept</button>
        <button className="btn btn-success" onClick={() => opslaan('definitief')}>Afronden (definitief)</button>
      </div>
    </div>
  );
}
