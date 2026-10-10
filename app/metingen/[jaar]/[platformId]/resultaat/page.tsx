'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CONFIG } from '@/src/service/config';
import { berekenGemiddeldePerAs, berekenTotaalGemiddelde, type PlatformScoresByAs } from '@/src/service/scores';

interface PlatformData {
  status: string;
  algemeneToelichting: string;
  scoresPerAs: PlatformScoresByAs;
}

type PageState =
  | { status: 'laden' }
  | { status: 'leeg' }
  | { status: 'fout'; melding: string }
  | { status: 'ok'; platform: PlatformData };

export default function ResultaatPage() {
  const params = useParams<{ jaar: string; platformId: string }>();
  const [state, setState] = useState<PageState>({ status: 'laden' });

  useEffect(() => {
    setState({ status: 'laden' });
    fetch(`/api/metingen/${params.jaar}/platformen/${params.platformId}`)
      .then(async (response) => {
        if (!response.ok) {
          const problem = await response.json().catch(() => null);
          setState({ status: 'fout', melding: problem?.detail ?? 'Onbekende fout bij het ophalen van de resultaten.' });
          return;
        }
        const json = await response.json();
        if (!json.platform) {
          setState({ status: 'leeg' });
        } else {
          setState({ status: 'ok', platform: json.platform });
        }
      })
      .catch(() => setState({ status: 'fout', melding: 'Kon de resultaten niet laden.' }));
  }, [params.jaar, params.platformId]);

  const platform = CONFIG.platformen.find((p) => p.id === params.platformId);

  if (state.status === 'laden') return <p>Laden...</p>;

  if (state.status === 'fout') {
    return (
      <div>
        <h2>{platform?.naam} — Resultaat {params.jaar}</h2>
        <div className="alert alert-warning" role="alert">{state.melding}</div>
      </div>
    );
  }

  if (state.status === 'leeg') {
    return (
      <div>
        <h2>{platform?.naam} — Resultaat {params.jaar}</h2>
        <div className="alert alert-info" role="alert">Dit platform is nog niet ingevuld.</div>
      </div>
    );
  }

  const { platform: data } = state;
  const gemPerAs = berekenGemiddeldePerAs(data.scoresPerAs);
  const totaal = berekenTotaalGemiddelde(data.scoresPerAs);

  return (
    <div>
      <h2>{platform?.naam} — Resultaat {params.jaar}</h2>
      <span className={`badge badge-${data.status}`}>{data.status}</span>
      <table aria-label="Scores per as">
        <thead>
          <tr>
            {CONFIG.assen.map((a) => <th key={a.id}>{a.naam}</th>)}
            <th>Totaal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {CONFIG.assen.map((a) => (
              <td key={a.id}>{gemPerAs[a.id]?.toFixed(1) ?? '-'}</td>
            ))}
            <td>{totaal?.toFixed(1) ?? '-'}</td>
          </tr>
        </tbody>
      </table>
      {data.algemeneToelichting && (
        <div className="card">
          <h3>Algemene toelichting</h3>
          <p>{data.algemeneToelichting}</p>
        </div>
      )}
    </div>
  );
}
