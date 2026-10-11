'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CONFIG } from '@/src/service/config';
import { berekenGemiddeldePerVraag, berekenOrganisatieGemiddelde, type PlatformScoresByAs } from '@/src/service/scores';
import { Spinnenweb } from '@/src/ui/components/Spinnenweb';
import { PlatformStatus } from '@/src/ui/components/PlatformStatus';
import { AS_GROEPEN, VRAAG_SPAKEN, naarSpaakWaarden } from '@/src/ui/components/_spinnenwebSpaken';

interface PlatformSamenvatting {
  status: 'concept' | 'definitief';
  scoresPerAs: PlatformScoresByAs;
}

type PageState =
  | { status: 'laden' }
  | { status: 'fout'; melding: string }
  | { status: 'ok'; platformen: Record<string, PlatformSamenvatting> };


export default function MetingOverzichtPage() {
  const params = useParams<{ jaar: string }>();
  const [state, setState] = useState<PageState>({ status: 'laden' });

  useEffect(() => {
    let actief = true;
    fetch(`/api/metingen/${params.jaar}`)
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!actief) return;
        if (!response.ok) {
          setState({ status: 'fout', melding: body?.detail ?? 'Kon de meting niet laden.' });
          return;
        }
        setState({ status: 'ok', platformen: body.meting.platformen });
      })
      .catch(() => actief && setState({ status: 'fout', melding: 'Kon de meting niet laden.' }));
    return () => {
      actief = false;
    };
  }, [params.jaar]);

  if (state.status === 'laden') return <p>Laden...</p>;
  if (state.status === 'fout') {
    return (
      <div>
        <h2>Meting {params.jaar}</h2>
        <div className="alert alert-warning" role="alert">{state.melding}</div>
      </div>
    );
  }

  const afgerond = CONFIG.platformen.filter((p) => state.platformen[p.id]?.status === 'definitief');
  const afgerondeScores = afgerond.map((p) => state.platformen[p.id]!.scoresPerAs);
  const orgGem = berekenOrganisatieGemiddelde(afgerondeScores);
  const orgPerVraag = berekenGemiddeldePerVraag(afgerondeScores);

  return (
    <div>
      <h2>Meting {params.jaar}</h2>
      <p>{afgerond.length} van {CONFIG.platformen.length} BU&apos;s afgerond.</p>

      <div className="card">
        <h3>Spinnenweb organisatie</h3>
        {afgerond.length === 0 ? (
          <p>Nog geen afgeronde BU&apos;s. Het spinnenweb verschijnt zodra een BU is afgerond.</p>
        ) : (
          <>
            <Spinnenweb titel={`Spinnenweb organisatie ${params.jaar}`} spaken={VRAAG_SPAKEN} grootte={420} groepen={AS_GROEPEN}
              series={[{ label: `Organisatie ${params.jaar}`, waarden: naarSpaakWaarden(orgPerVraag), kleur: '#000041' }]} />
            <p className="totaalscore">
              {CONFIG.assen.map((a) => `${a.naam} ${orgGem[a.id]?.toFixed(1) ?? '-'}`).join(' · ')}
            </p>
            <p style={{ textAlign: 'center' }}>Gemiddelde van {afgerond.map((p) => p.naam).join(', ')}</p>
          </>
        )}
      </div>

      <div className="dashboard-grid">
        {CONFIG.platformen.map((p) => {
          const data = state.platformen[p.id];
          return (
            <div className={`card${data?.status === 'definitief' ? ' is-definitief' : ''}`} key={p.id} data-platform={p.id}>
              <div className="platform-kop">
                <h3>{p.naam}</h3>
                <PlatformStatus status={data?.status ?? null} />
              </div>
              {data && (
                <Spinnenweb titel={`Spinnenweb ${p.naam} ${params.jaar}`} spaken={VRAAG_SPAKEN} grootte={220} toonLabels={false}
                  series={[{ label: p.naam, waarden: naarSpaakWaarden(berekenGemiddeldePerVraag([data.scoresPerAs])), kleur: '#E2007A', gestippeld: data.status === 'concept' }]} />
              )}
              <div className="btn-group">
                <Link className="btn btn-primary" href={`/metingen/${params.jaar}/${p.id}`}>Invullen</Link>
                <Link className="btn btn-outline" href={`/metingen/${params.jaar}/${p.id}/resultaat`}>Bekijken</Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
