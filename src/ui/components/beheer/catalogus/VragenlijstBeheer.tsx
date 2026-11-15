'use client';

import { useState } from 'react';

import { AsGroep, type Bediening, type Bewerking } from './AsGroep';
import { JarenStatus } from './JarenStatus';
import { VervallenLijst } from './RijActies';
import { AsFormulier } from './_vragenlijstFormulieren';
import { wijzig } from './_catalogusApi';
import type { CatalogusData } from './_catalogusTypen';

interface Props {
  data: CatalogusData;
  beheerder: boolean;
  onGewijzigd: (fout: string | null) => void;
}

/**
 * The removed axes and questions with their restore buttons.
 * @param props - The catalogue, the beheerder flag and the change handler
 * @returns the collapsed section
 */
function VerwijderdeVragen({ data, beheerder, onGewijzigd }: Props) {
  const items = [
    ...data.assen.filter((a) => a.vervallen).map((a) => ({ id: `assen:${a.id}`, naam: `as ${a.naam}`, omschrijving: `As ${a.naam}` })),
    ...data.assen.flatMap((a) => a.vragen.filter((v) => v.vervallen).map((v) => ({ id: `vragen:${v.id}`, naam: v.kort, omschrijving: `${v.kort} (as ${a.naam}): ${v.tekst}` }))),
  ];
  return (
    <VervallenLijst titel="Verwijderde assen en vragen" beheerder={beheerder} items={items}
      onHerstel={async (sleutel) => {
        const [lijst, id] = sleutel.split(':') as ['assen' | 'vragen', string];
        onGewijzigd(await wijzig(lijst, id, { vervallen: false }));
      }} />
  );
}

/**
 * The questionnaire in one table: per axis a header row, below it its questions. A beheerder adds,
 * changes, moves, removes and restores; everyone else reads. Removed items are in a collapsed section.
 * @param props.data - The catalogue
 * @param props.beheerder - Whether edit controls are shown
 * @param props.onGewijzigd - Reloads after a change; receives the server message on refusal
 * @returns the administration block
 */
export function VragenlijstBeheer({ data, beheerder, onGewijzigd }: Props) {
  const [bewerking, zetBewerking] = useState<Bewerking>(null);
  const klaar = (fout: string | null) => {
    if (!fout) zetBewerking(null);
    onGewijzigd(fout);
    return fout;
  };
  const assen = data.assen.filter((a) => !a.vervallen);
  const b: Bediening = { beheerder, bewerking, zetBewerking, klaar, onGewijzigd, metingen: data.metingen, assen, kolommen: beheerder ? 4 : 3 };
  return (
    <>
      <JarenStatus metingen={data.metingen} beheerder={beheerder} onGewijzigd={onGewijzigd} />
      <div className="card">
        <div className="tabel-scroll">
          <table aria-label="Vragenlijst" className="beheer-tabel beheer-tabel-stapel catalogus-tabel" role="table">
            <thead role="rowgroup">
              <tr role="row"><th role="columnheader">Kort label</th><th role="columnheader">Vraag</th><th role="columnheader">NDS-thema</th>{beheerder && <th role="columnheader">Acties</th>}</tr>
            </thead>
            <tbody role="rowgroup">{assen.map((a, i) => <AsGroep key={a.id} as={a} index={i} b={b} />)}</tbody>
          </table>
        </div>
        {beheerder && (bewerking?.soort === 'as' && bewerking.id === null
          ? <AsFormulier as={null} klaar={klaar} onAnnuleren={() => zetBewerking(null)} />
          : <button type="button" className="btn btn-primary" onClick={() => zetBewerking({ soort: 'as', id: null })}>As toevoegen</button>)}
      </div>
      <VerwijderdeVragen data={data} beheerder={beheerder} onGewijzigd={onGewijzigd} />
    </>
  );
}
