'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { formatScore } from '@/src/service/nlGetal';
import { berekenGemiddeldePerVraag, berekenOrganisatieGemiddelde, type ScoresPerAs } from '@/src/service/scores';
import { PlatformStatus } from '@/src/ui/components/PlatformStatus';
import { Spinnenweb, type SpinnenwebSerie } from '@/src/ui/components/Spinnenweb';
import { asGroepen, naarSpaakWaarden, vraagSpaken } from '@/src/ui/components/_spinnenwebSpaken';
import type { UiBusinessUnit, UiVragenlijst } from '@/src/ui/components/_vragenlijstTypen';
import { useVorigeMeting, type VorigeMeting } from '@/src/ui/hooks/useVorigeMeting';
import { useVragenlijst } from '@/src/ui/hooks/useVragenlijst';

interface Rij {
  status: 'concept' | 'definitief';
  scoresPerAs: ScoresPerAs;
}
type Rijen = Record<string, Rij>;

type PageState = { status: 'laden' } | { status: 'fout'; melding: string } | { status: 'ok'; rijen: Rijen };

const KLEUR_NU = '#2c7fa0';
const KLEUR_VORIG = '#7d8c93';

/**
 * Grey dashed outline of the previous year on the spokes of this year; a question that was not
 * in the previous year stays empty. Only drawn when at least one value exists.
 * @param lijst - Questionnaire of the shown year (the spokes)
 * @param vorige - Previous meting
 * @param rijen - Rows of the previous year to average
 * @returns the series in a list, or an empty list
 */
function vorigeSerie(lijst: UiVragenlijst, vorige: VorigeMeting, rijen: ScoresPerAs[]): SpinnenwebSerie[] {
  const waarden = naarSpaakWaarden(lijst, berekenGemiddeldePerVraag(vorige.lijst, rijen));
  if (!waarden.some((v) => v != null)) return [];
  return [{ label: `${vorige.jaar} (grijze stippellijn)`, waarden, kleur: KLEUR_VORIG, gestippeld: true, vulling: false }];
}

function definitief(units: Array<{ id: string }>, rijen: Record<string, { status: string; scoresPerAs: ScoresPerAs }>): ScoresPerAs[] {
  return units.filter((b) => rijen[b.id]?.status === 'definitief').map((b) => rijen[b.id]!.scoresPerAs);
}

function vorigeOrganisatie(lijst: UiVragenlijst, vorige: VorigeMeting | null): SpinnenwebSerie[] {
  return vorige ? vorigeSerie(lijst, vorige, definitief(vorige.lijst.businessUnits, vorige.businessUnits)) : [];
}

// Previous year of one business unit, only when it took part in that year.
function vorigeUnit(lijst: UiVragenlijst, vorige: VorigeMeting | null, id: string): SpinnenwebSerie[] {
  const rij = vorige?.businessUnits[id];
  return vorige && rij ? vorigeSerie(lijst, vorige, [rij.scoresPerAs]) : [];
}

function tekentVorigJaar(lijst: UiVragenlijst, rijen: Rijen, vorige: VorigeMeting | null): boolean {
  const organisatie = definitief(lijst.businessUnits, rijen).length > 0 && vorigeOrganisatie(lijst, vorige).length > 0;
  return organisatie || lijst.businessUnits.some((b) => rijen[b.id] && vorigeUnit(lijst, vorige, b.id).length > 0);
}

/**
 * Organisation web: average of the definitief business units, with the previous year when it has scores.
 * @param props - Shown year, its list and rows, and the previous meting
 * @returns the card
 */
function OrganisatieWeb({ jaar, lijst, rijen, vorige }: { jaar: string; lijst: UiVragenlijst; rijen: Rijen; vorige: VorigeMeting | null }) {
  const afgerond = lijst.businessUnits.filter((b) => rijen[b.id]?.status === 'definitief');
  const scores = definitief(lijst.businessUnits, rijen);
  const orgGem = berekenOrganisatieGemiddelde(lijst, scores);
  return (
    <div className="card">
      <h3>Spinnenweb organisatie</h3>
      {afgerond.length === 0 ? (
        <p>Nog geen afgeronde businessunits. Het spinnenweb verschijnt zodra een businessunit is afgerond.</p>
      ) : (
        <>
          <Spinnenweb titel={`Spinnenweb organisatie ${jaar}`} spaken={vraagSpaken(lijst)} grootte={420} groepen={asGroepen(lijst)}
            series={[{ label: `Organisatie ${jaar}`, waarden: naarSpaakWaarden(lijst, berekenGemiddeldePerVraag(lijst, scores)), kleur: KLEUR_NU }, ...vorigeOrganisatie(lijst, vorige)]} />
          <p className="totaalscore">{lijst.assen.map((a) => `${a.naam} ${orgGem[a.id] == null ? '–' : formatScore(orgGem[a.id]!)}`).join(', ')}</p>
          <p style={{ textAlign: 'center' }}>Gemiddelde van {afgerond.map((b) => b.naam).join(', ')}</p>
        </>
      )}
    </div>
  );
}

/**
 * Card of one business unit: status, its web with the previous year, and the links.
 * @param props - Shown year, its list, the unit, its row and the previous meting
 * @returns the card
 */
function UnitKaart({ jaar, lijst, unit, data, vorige }: { jaar: string; lijst: UiVragenlijst; unit: UiBusinessUnit; data?: Rij; vorige: VorigeMeting | null }) {
  return (
    <div className={`card${data?.status === 'definitief' ? ' is-definitief' : ''}`} data-platform={unit.id} data-businessunit={unit.id}>
      <div className="platform-kop">
        <h3>{unit.naam}</h3>
        <PlatformStatus status={data?.status ?? null} />
      </div>
      {data && (
        <Spinnenweb titel={`Spinnenweb ${unit.naam} ${jaar}`} spaken={vraagSpaken(lijst)} grootte={220} toonLabels={false}
          series={[{ label: `${unit.naam} ${jaar}`, waarden: naarSpaakWaarden(lijst, berekenGemiddeldePerVraag(lijst, [data.scoresPerAs])), kleur: KLEUR_NU, gestippeld: data.status === 'concept' }, ...vorigeUnit(lijst, vorige, unit.id)]} />
      )}
      <div className="btn-group">
        <Link className="btn btn-primary" href={`/metingen/${jaar}/${unit.id}`}>Invullen</Link>
        <Link className="btn btn-outline" href={`/metingen/${jaar}/${unit.id}/resultaat`}>Bekijken</Link>
      </div>
    </div>
  );
}

/**
 * The business unit cards; a platform with more than one business unit gets its name as heading.
 * @param props - Shown year, its list, the rows and the previous meting
 * @returns the grouped cards
 */
function UnitKaarten({ jaar, lijst, rijen, vorige }: { jaar: string; lijst: UiVragenlijst; rijen: Rijen; vorige: VorigeMeting | null }) {
  const kaart = (unit: UiBusinessUnit) => <UnitKaart key={unit.id} jaar={jaar} lijst={lijst} unit={unit} data={rijen[unit.id]} vorige={vorige} />;
  const enkel = lijst.platformen.filter((p) => p.businessUnitIds.length === 1);
  const groepen = lijst.platformen.filter((p) => p.businessUnitIds.length > 1);
  const units = (ids: string[]) => ids.map((id) => lijst.businessUnits.find((b) => b.id === id)!).filter(Boolean);
  return (
    <>
      {enkel.length > 0 && <div className="dashboard-grid">{units(enkel.flatMap((p) => p.businessUnitIds)).map(kaart)}</div>}
      {groepen.map((p) => (
        <section key={p.id} className="platform-groep" aria-labelledby={`platform-${p.id}`}>
          <h3 id={`platform-${p.id}`} className="platform-groep-kop">Platform {p.naam}</h3>
          <div className="dashboard-grid">{units(p.businessUnitIds).map(kaart)}</div>
        </section>
      ))}
    </>
  );
}

function useMetingRijen(jaar: string): PageState {
  const [state, setState] = useState<PageState>({ status: 'laden' });
  useEffect(() => {
    let actief = true;
    fetch(`/api/metingen/${jaar}`)
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!actief) return;
        if (!response.ok) return setState({ status: 'fout', melding: body?.detail ?? 'Kon de meting niet laden.' });
        setState({ status: 'ok', rijen: body.meting.businessUnits });
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
  const state = useMetingRijen(params.jaar);
  const lijstStaat = useVragenlijst(params.jaar);
  const vorige = useVorigeMeting(Number(params.jaar));

  if (state.status === 'laden' || lijstStaat.status === 'laden') return <p>Laden...</p>;
  const fout = state.status === 'fout' ? state.melding : lijstStaat.status === 'fout' ? lijstStaat.melding : null;
  if (fout || state.status !== 'ok' || lijstStaat.status !== 'ok') {
    return (
      <div>
        <h2>Meting {params.jaar}</h2>
        <div className="alert alert-warning" role="alert">{fout}</div>
      </div>
    );
  }
  const { lijst } = lijstStaat;
  const afgerond = lijst.businessUnits.filter((b) => state.rijen[b.id]?.status === 'definitief');
  return (
    <div>
      <h2>Meting {params.jaar}</h2>
      <p>{afgerond.length} van {lijst.businessUnits.length} businessunits afgerond.</p>
      {vorige && tekentVorigJaar(lijst, state.rijen, vorige) && (
        <p className="vergelijk-uitleg">Het gevulde vlak is {params.jaar}; de grijze stippellijn in de webben is het vorige meetjaar {vorige.jaar}.</p>
      )}
      <OrganisatieWeb jaar={params.jaar} lijst={lijst} rijen={state.rijen} vorige={vorige} />
      <UnitKaarten jaar={params.jaar} lijst={lijst} rijen={state.rijen} vorige={vorige} />
    </div>
  );
}
