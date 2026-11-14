'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CONFIG } from '@/src/service/config';
import { formatScore } from '@/src/service/nlGetal';
import { berekenGemiddeldePerVraag, berekenOrganisatieGemiddelde, type PlatformScoresByAs } from '@/src/service/scores';
import { Spinnenweb, type SpinnenwebSerie } from '@/src/ui/components/Spinnenweb';
import { PlatformStatus } from '@/src/ui/components/PlatformStatus';
import { AS_GROEPEN, VRAAG_SPAKEN, naarSpaakWaarden } from '@/src/ui/components/_spinnenwebSpaken';
import { useVorigeMeting, type VorigeMeting } from '@/src/ui/hooks/useVorigeMeting';

interface PlatformSamenvatting {
  status: 'concept' | 'definitief';
  scoresPerAs: PlatformScoresByAs;
}

type PageState =
  | { status: 'laden' }
  | { status: 'fout'; melding: string }
  | { status: 'ok'; platformen: Record<string, PlatformSamenvatting> };

const KLEUR_NU = '#2c7fa0';
const KLEUR_VORIG = '#7d8c93';

/**
 * Grey dashed outline of the previous year, only when it has at least one answered question.
 * @param jaar - Previous year
 * @param perVraag - Average per question of that year
 * @returns the series in a list, or an empty list when there is nothing to draw
 */
function vorigeSerie(jaar: number, perVraag: Record<string, number | null>): SpinnenwebSerie[] {
  if (!Object.values(perVraag).some((v) => v != null)) return [];
  return [{ label: `${jaar} (grijze stippellijn)`, waarden: naarSpaakWaarden(perVraag), kleur: KLEUR_VORIG, gestippeld: true, vulling: false }];
}

/**
 * Scores of the platforms with status definitief, in config order.
 * @param platformen - Stored platform rows of a year
 * @returns their scores per axis
 */
function definitieveScores(platformen: Record<string, { status: string; scoresPerAs: PlatformScoresByAs }>): PlatformScoresByAs[] {
  return CONFIG.platformen.filter((p) => platformen[p.id]?.status === 'definitief').map((p) => platformen[p.id]!.scoresPerAs);
}

/**
 * Previous-year series of the organisation web (definitief platforms of that year).
 * @param vorige - Previous meting, or null
 * @returns the series in a list, or an empty list
 */
function vorigeOrganisatie(vorige: VorigeMeting | null): SpinnenwebSerie[] {
  return vorige ? vorigeSerie(vorige.jaar, berekenGemiddeldePerVraag(definitieveScores(vorige.platformen))) : [];
}

/**
 * Previous-year series of one platform web.
 * @param vorige - Previous meting, or null
 * @param id - Platform id
 * @returns the series in a list, or an empty list
 */
function vorigePlatform(vorige: VorigeMeting | null, id: string): SpinnenwebSerie[] {
  const rij = vorige?.platformen[id];
  return vorige && rij ? vorigeSerie(vorige.jaar, berekenGemiddeldePerVraag([rij.scoresPerAs])) : [];
}

/**
 * Whether any web on the page actually draws the grey dashed previous-year line.
 * @param platformen - Platform rows of the shown year
 * @param vorige - Previous meting, or null
 * @returns true when at least one dashed line is drawn
 */
function tekentVorigJaar(platformen: Record<string, PlatformSamenvatting>, vorige: VorigeMeting | null): boolean {
  const organisatie = definitieveScores(platformen).length > 0 && vorigeOrganisatie(vorige).length > 0;
  return organisatie || CONFIG.platformen.some((p) => platformen[p.id] && vorigePlatform(vorige, p.id).length > 0);
}

/**
 * Organisation web: average of the definitief platforms, with the previous year when it has scores.
 * @param props.jaar - Shown year
 * @param props.platformen - Platform rows of that year
 * @param props.vorige - Previous meting, or null
 * @returns the card
 */
function OrganisatieWeb({ jaar, platformen, vorige }: { jaar: string; platformen: Record<string, PlatformSamenvatting>; vorige: VorigeMeting | null }) {
  const afgerond = CONFIG.platformen.filter((p) => platformen[p.id]?.status === 'definitief');
  const afgerondeScores = definitieveScores(platformen);
  const orgGem = berekenOrganisatieGemiddelde(afgerondeScores);
  const vorig = vorigeOrganisatie(vorige);
  return (
    <div className="card">
      <h3>Spinnenweb organisatie</h3>
      {afgerond.length === 0 ? (
        <p>Nog geen afgeronde platformen. Het spinnenweb verschijnt zodra een platform is afgerond.</p>
      ) : (
        <>
          <Spinnenweb titel={`Spinnenweb organisatie ${jaar}`} spaken={VRAAG_SPAKEN} grootte={420} groepen={AS_GROEPEN}
            series={[{ label: `Organisatie ${jaar}`, waarden: naarSpaakWaarden(berekenGemiddeldePerVraag(afgerondeScores)), kleur: KLEUR_NU }, ...vorig]} />
          <p className="totaalscore">
            {CONFIG.assen.map((a) => `${a.naam} ${orgGem[a.id] == null ? '–' : formatScore(orgGem[a.id]!)}`).join(', ')}
          </p>
          <p style={{ textAlign: 'center' }}>Gemiddelde van {afgerond.map((p) => p.naam).join(', ')}</p>
        </>
      )}
    </div>
  );
}

/**
 * Card of one platform: status, its web with the previous year, and the links.
 * @param props.jaar - Shown year
 * @param props.id - Platform id
 * @param props.naam - Platform name
 * @param props.data - Platform row of that year, if any
 * @param props.vorige - Previous meting, or null
 * @returns the card
 */
function PlatformKaart({ jaar, id, naam, data, vorige }: { jaar: string; id: string; naam: string; data?: PlatformSamenvatting; vorige: VorigeMeting | null }) {
  const vorig = vorigePlatform(vorige, id);
  return (
    <div className={`card${data?.status === 'definitief' ? ' is-definitief' : ''}`} data-platform={id}>
      <div className="platform-kop">
        <h3>{naam}</h3>
        <PlatformStatus status={data?.status ?? null} />
      </div>
      {data && (
        <Spinnenweb titel={`Spinnenweb ${naam} ${jaar}`} spaken={VRAAG_SPAKEN} grootte={220} toonLabels={false}
          series={[{ label: `${naam} ${jaar}`, waarden: naarSpaakWaarden(berekenGemiddeldePerVraag([data.scoresPerAs])), kleur: KLEUR_NU, gestippeld: data.status === 'concept' }, ...vorig]} />
      )}
      <div className="btn-group">
        <Link className="btn btn-primary" href={`/metingen/${jaar}/${id}`}>Invullen</Link>
        <Link className="btn btn-outline" href={`/metingen/${jaar}/${id}/resultaat`}>Bekijken</Link>
      </div>
    </div>
  );
}

/**
 * Loads one meting with the rows of its platforms.
 * @param jaar - Year from the URL
 * @returns the loading state
 */
function useMeting(jaar: string): PageState {
  const [state, setState] = useState<PageState>({ status: 'laden' });
  useEffect(() => {
    let actief = true;
    fetch(`/api/metingen/${jaar}`)
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
  }, [jaar]);
  return state;
}

export default function MetingOverzichtPage() {
  const params = useParams<{ jaar: string }>();
  const state = useMeting(params.jaar);
  const vorige = useVorigeMeting(Number(params.jaar));

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
  return (
    <div>
      <h2>Meting {params.jaar}</h2>
      <p>{afgerond.length} van {CONFIG.platformen.length} platformen afgerond.</p>
      {vorige && tekentVorigJaar(state.platformen, vorige) && (
        <p className="vergelijk-uitleg">
          Het gevulde vlak is {params.jaar}; de grijze stippellijn in de webben is het vorige meetjaar {vorige.jaar}.
        </p>
      )}
      <OrganisatieWeb jaar={params.jaar} platformen={state.platformen} vorige={vorige} />
      <div className="dashboard-grid">
        {CONFIG.platformen.map((p) => (
          <PlatformKaart key={p.id} jaar={params.jaar} id={p.id} naam={p.naam} data={state.platformen[p.id]} vorige={vorige} />
        ))}
      </div>
    </div>
  );
}
