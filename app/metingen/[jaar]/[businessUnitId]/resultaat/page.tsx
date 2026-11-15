'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

import { berekenGemiddeldePerAs, berekenGemiddeldePerVraag, berekenTotaalGemiddelde } from '@/src/service/scores';
import { HeropenenKnop } from '@/src/ui/components/HeropenenKnop';
import { Spinnenweb } from '@/src/ui/components/Spinnenweb';
import { VraagDetail } from '@/src/ui/components/VraagDetail';
import { asGroepen, naarSpaakWaarden, vraagSpaken } from '@/src/ui/components/_spinnenwebSpaken';
import type { UiBusinessUnitRij, UiVragenlijst } from '@/src/ui/components/_vragenlijstTypen';
import { useBusinessUnit } from '@/src/ui/hooks/useBusinessUnit';
import { useIk } from '@/src/ui/hooks/useIk';

/**
 * Web, axis table and total of one business unit row.
 * @param props.lijst - Questionnaire of the year
 * @param props.rij - The stored row
 * @param props.titel - Name and year for the accessible names
 * @returns the card
 */
function ResultaatKaart({ lijst, rij, titel }: { lijst: UiVragenlijst; rij: UiBusinessUnitRij; titel: string }) {
  const gemPerAs = berekenGemiddeldePerAs(lijst, rij.scoresPerAs);
  const totaal = berekenTotaalGemiddelde(lijst, rij.scoresPerAs);
  return (
    <div className="card">
      <h3>Spinnenweb</h3>
      <Spinnenweb titel={`Spinnenweb ${titel}`} spaken={vraagSpaken(lijst)} groepen={asGroepen(lijst)} grootte={420}
        series={[{ label: titel, waarden: naarSpaakWaarden(lijst, berekenGemiddeldePerVraag(lijst, [rij.scoresPerAs])), kleur: '#2c7fa0', gestippeld: rij.status === 'concept' }]} />
      <p className="totaalscore">Totaal: {totaal?.toFixed(1) ?? '-'} / 5</p>
      <table aria-label="Scores per as">
        <thead>
          <tr>
            {lijst.assen.map((a) => <th key={a.id}>{a.naam}</th>)}
            <th>Totaal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {lijst.assen.map((a) => <td key={a.id}>{gemPerAs[a.id]?.toFixed(1) ?? '-'}</td>)}
            <td>{totaal?.toFixed(1) ?? '-'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/**
 * The general comment (when given) and who took part.
 * @param props.rij - The stored row
 * @returns the cards
 */
function Toelichtingen({ rij }: { rij: UiBusinessUnitRij }) {
  return (
    <>
      {rij.algemeneToelichting && (
        <div className="card">
          <h3>Algemene toelichting</h3>
          <p>{rij.algemeneToelichting}</p>
        </div>
      )}
      <div className="card" aria-labelledby="aanwezigen-kop">
        <h3 id="aanwezigen-kop">Aanwezigen</h3>
        <p className="aanwezigen">{rij.aanwezigen || 'Niet ingevuld.'}</p>
      </div>
    </>
  );
}

/**
 * A heading with one message (load error or not filled in yet).
 * @param props - Heading text, alert kind and message
 * @returns the block
 */
function Melding({ kop, soort, tekst }: { kop: string; soort: 'warning' | 'info'; tekst: string }) {
  return (
    <div>
      <h2>{kop}</h2>
      <div className={`alert alert-${soort}`} role="alert">{tekst}</div>
    </div>
  );
}

export default function ResultaatPage() {
  const params = useParams<{ jaar: string; businessUnitId: string }>();
  // Bumped after a reopen to re-fetch the row.
  const [versie, setVersie] = useState(0);
  const staat = useBusinessUnit(params.jaar, params.businessUnitId, versie);
  const { ik } = useIk();

  if (staat.status === 'laden') return <p>Laden...</p>;
  if (staat.status === 'fout') return <Melding kop={`Resultaat ${params.jaar}`} soort="warning" tekst={staat.melding} />;
  const { lijst, unit, rij } = staat;
  const kop = <h2>{unit.naam} — Resultaat {params.jaar}</h2>;
  if (!rij) return <Melding kop={`${unit.naam} — Resultaat ${params.jaar}`} soort="info" tekst="Deze businessunit is nog niet ingevuld." />;

  return (
    <div>
      {kop}
      <span className={`badge badge-${rij.status}`}>{rij.status}</span>
      {ik?.rol === 'beheerder' && rij.status === 'definitief' && (
        <HeropenenKnop jaar={params.jaar} businessUnitId={params.businessUnitId} onHeropend={() => setVersie((v) => v + 1)} />
      )}
      <div style={{ marginTop: '1rem' }}>
        <ResultaatKaart lijst={lijst} rij={rij} titel={`${unit.naam} ${params.jaar}`} />
        <div className="card">
          <h3>Detail per vraag</h3>
          <VraagDetail lijst={lijst} scoresPerAs={rij.scoresPerAs} toelichtingen={rij.toelichtingen ?? {}} />
        </div>
      </div>
      <Toelichtingen rij={rij} />
    </div>
  );
}
