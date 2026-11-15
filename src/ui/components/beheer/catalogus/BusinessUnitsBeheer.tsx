'use client';

import { useState } from 'react';

import { JarenStatus } from './JarenStatus';
import { PlatformGroep, type UnitBediening, type UnitBewerking } from './PlatformGroep';
import { VervallenLijst } from './RijActies';
import { PlatformFormulier } from './_businessUnitFormulieren';
import { wijzig } from './_catalogusApi';
import type { CatalogusData } from './_catalogusTypen';

interface Props {
  data: CatalogusData;
  beheerder: boolean;
  onGewijzigd: (fout: string | null) => void;
}

/**
 * The lapsed platforms and business units with their restore buttons.
 * @param props - The catalogue, the beheerder flag and the change handler
 * @returns the collapsed section
 */
function VervallenUnits({ data, beheerder, onGewijzigd }: Props) {
  const items = [
    ...data.platformen.filter((p) => p.vervallen).map((p) => ({ id: `platformen:${p.id}`, naam: `platform ${p.naam}`, omschrijving: `Platform ${p.naam}` })),
    ...data.platformen.flatMap((p) => p.businessUnits.filter((u) => u.vervallen).map((u) => ({ id: `businessunits:${u.id}`, naam: u.naam, omschrijving: `${u.naam} (platform ${p.naam})` }))),
  ];
  return (
    <VervallenLijst titel="Vervallen platformen en businessunits" beheerder={beheerder} items={items}
      onHerstel={async (sleutel) => {
        const [lijst, id] = sleutel.split(':') as ['platformen' | 'businessunits', string];
        onGewijzigd(await wijzig(lijst, id, { vervallen: false }));
      }} />
  );
}

/**
 * Platforms and business units in one table: per platform a header row, below it its business
 * units with their colour. A beheerder adds, renames, moves, lets lapse and restores.
 * @param props.data - The catalogue
 * @param props.beheerder - Whether edit controls are shown
 * @param props.onGewijzigd - Reloads after a change; receives the server message on refusal
 * @returns the administration block
 */
export function BusinessUnitsBeheer({ data, beheerder, onGewijzigd }: Props) {
  const [bewerking, zetBewerking] = useState<UnitBewerking>(null);
  const klaar = (fout: string | null) => {
    if (!fout) zetBewerking(null);
    onGewijzigd(fout);
    return fout;
  };
  const platformen = data.platformen.filter((p) => !p.vervallen);
  const b: UnitBediening = { beheerder, bewerking, zetBewerking, klaar, onGewijzigd, metingen: data.metingen, platformen, kolommen: beheerder ? 3 : 2 };
  return (
    <>
      <JarenStatus metingen={data.metingen} beheerder={beheerder} onGewijzigd={onGewijzigd} />
      <div className="card">
        <div className="tabel-scroll">
          <table aria-label="Platformen en businessunits" className="beheer-tabel beheer-tabel-stapel catalogus-tabel" role="table">
            <thead role="rowgroup">
              <tr role="row"><th role="columnheader">Businessunit</th><th role="columnheader">Kleur</th>{beheerder && <th role="columnheader">Acties</th>}</tr>
            </thead>
            <tbody role="rowgroup">{platformen.map((p, i) => <PlatformGroep key={p.id} platform={p} index={i} b={b} />)}</tbody>
          </table>
        </div>
        {beheerder && (bewerking?.soort === 'platform' && bewerking.id === null
          ? <PlatformFormulier platform={null} klaar={klaar} onAnnuleren={() => zetBewerking(null)} />
          : <button type="button" className="btn btn-primary" onClick={() => zetBewerking({ soort: 'platform', id: null })}>Platform toevoegen</button>)}
      </div>
      <VervallenUnits data={data} beheerder={beheerder} onGewijzigd={onGewijzigd} />
    </>
  );
}
