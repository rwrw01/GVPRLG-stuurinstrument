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

export default function ResultaatPage() {
  const params = useParams<{ jaar: string; platformId: string }>();
  const [data, setData] = useState<PlatformData | null>(null);

  useEffect(() => {
    fetch(`/api/metingen/${params.jaar}/platformen/${params.platformId}`)
      .then((r) => r.json())
      .then((json) => setData(json.platform));
  }, [params.jaar, params.platformId]);

  if (!data) return <p>Laden...</p>;

  const platform = CONFIG.platformen.find((p) => p.id === params.platformId);
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
