'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CONFIG } from '@/src/service/config';
import { berekenGemiddeldePerAs, berekenGemiddeldePerVraag, berekenTotaalGemiddelde, type PlatformScoresByAs } from '@/src/service/scores';
import { HeropenenKnop } from '@/src/ui/components/HeropenenKnop';
import { Spinnenweb } from '@/src/ui/components/Spinnenweb';
import { VraagDetail } from '@/src/ui/components/VraagDetail';
import { AS_GROEPEN, VRAAG_SPAKEN, naarSpaakWaarden } from '@/src/ui/components/_spinnenwebSpaken';
import { useIk } from '@/src/ui/hooks/useIk';

interface PlatformData {
  status: string;
  algemeneToelichting: string;
  scoresPerAs: PlatformScoresByAs;
  toelichtingen: Record<string, string>;
}

type PageState =
  | { status: 'laden' }
  | { status: 'leeg' }
  | { status: 'fout'; melding: string }
  | { status: 'ok'; platform: PlatformData };

export default function ResultaatPage() {
  const params = useParams<{ jaar: string; platformId: string }>();
  const [state, setState] = useState<PageState>({ status: 'laden' });
  // Bumped after a reopen to re-fetch the platform.
  const [versie, setVersie] = useState(0);
  const { ik } = useIk();

  useEffect(() => {
    let actief = true;
    setState({ status: 'laden' });
    fetch(`/api/metingen/${params.jaar}/platformen/${params.platformId}`)
      .then(async (response) => {
        if (!actief) return;
        if (!response.ok) {
          const problem = await response.json().catch(() => null);
          setState({ status: 'fout', melding: problem?.detail ?? 'Onbekende fout bij het ophalen van de resultaten.' });
          return;
        }
        const json = await response.json();
        if (!actief) return;
        if (!json.platform) {
          setState({ status: 'leeg' });
        } else {
          setState({ status: 'ok', platform: json.platform });
        }
      })
      .catch(() => actief && setState({ status: 'fout', melding: 'Kon de resultaten niet laden.' }));
    return () => {
      actief = false;
    };
  }, [params.jaar, params.platformId, versie]);

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
      {ik?.rol === 'beheerder' && data.status === 'definitief' && (
        <HeropenenKnop jaar={params.jaar} platformId={params.platformId} onHeropend={() => setVersie((v) => v + 1)} />
      )}
      <div style={{ marginTop: '1rem' }}>
        <div className="card">
          <h3>Spinnenweb</h3>
          <Spinnenweb
            titel={`Spinnenweb ${platform?.naam ?? params.platformId} ${params.jaar}`}
            spaken={VRAAG_SPAKEN}
            groepen={AS_GROEPEN}
            grootte={420}
            series={[{ label: `${platform?.naam} ${params.jaar}`, waarden: naarSpaakWaarden(berekenGemiddeldePerVraag([data.scoresPerAs])), kleur: '#2c7fa0', gestippeld: data.status === 'concept' }]}
          />
          <p className="totaalscore">Totaal: {totaal?.toFixed(1) ?? '-'} / 5</p>
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
        </div>
        <div className="card">
          <h3>Detail per vraag</h3>
          <VraagDetail scoresPerAs={data.scoresPerAs} toelichtingen={data.toelichtingen ?? {}} />
        </div>
      </div>
      {data.algemeneToelichting && (
        <div className="card">
          <h3>Algemene toelichting</h3>
          <p>{data.algemeneToelichting}</p>
        </div>
      )}
    </div>
  );
}
