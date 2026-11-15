'use client';

import { Fragment, useState } from 'react';

import { ItemFormulier, type Veld } from './ItemFormulier';
import { JarenStatus } from './JarenStatus';
import { RijActies, VervallenLijst } from './RijActies';
import { bevestigVerwijderen, verplaats, voegToe, wijzig } from './_catalogusApi';
import type { CatalogusData, CatBusinessUnit, CatPlatform } from './_catalogusTypen';

type Bewerking = { soort: 'platform' | 'unit'; id: string | null; platformId?: string } | null;

const PLATFORM_VELDEN: Veld[] = [{ sleutel: 'naam', label: 'Naam van het platform', soort: 'tekst', verplicht: true }];

function unitVelden(platformen: CatPlatform[]): Veld[] {
  return [
    { sleutel: 'platformId', label: 'Platform', soort: 'keuze', opties: platformen.map((p) => ({ value: p.id, label: p.naam })) },
    { sleutel: 'naam', label: 'Naam van de businessunit', soort: 'tekst', verplicht: true },
  ];
}

interface Props {
  data: CatalogusData;
  beheerder: boolean;
  onGewijzigd: (fout: string | null) => void;
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
  const [bewerking, setBewerking] = useState<Bewerking>(null);
  const platformen = data.platformen.filter((p) => !p.vervallen);
  const klaar = (fout: string | null) => {
    if (!fout) setBewerking(null);
    onGewijzigd(fout);
    return fout;
  };
  const laatVervallen = async (lijst: 'platformen' | 'businessunits', id: string, wat: string) => {
    if (window.confirm(bevestigVerwijderen(wat, data.metingen))) onGewijzigd(await wijzig(lijst, id, { vervallen: true }));
  };
  const unitFormulier = (b: CatBusinessUnit | null, platformId: string) => (
    <ItemFormulier titel={b ? `Businessunit wijzigen: ${b.naam}` : 'Businessunit toevoegen'} idPrefix={b ? `unit-${b.id}` : `nieuwe-unit-${platformId}`}
      velden={unitVelden(platformen)} begin={{ platformId: b?.platformId ?? platformId, naam: b?.naam ?? '' }} knop={b ? 'Wijziging opslaan' : 'Businessunit toevoegen'}
      onAnnuleren={() => setBewerking(null)}
      onOpslaan={async (w) => klaar(b ? await wijzig('businessunits', b.id, w) : await voegToe('businessunits', w))} />
  );
  const platformFormulier = (p: CatPlatform | null) => (
    <ItemFormulier titel={p ? `Platform wijzigen: ${p.naam}` : 'Platform toevoegen'} idPrefix={p ? `platform-${p.id}` : 'nieuw-platform'} velden={PLATFORM_VELDEN}
      begin={{ naam: p?.naam ?? '' }} knop={p ? 'Wijziging opslaan' : 'Platform toevoegen'} onAnnuleren={() => setBewerking(null)}
      onOpslaan={async (w) => klaar(p ? await wijzig('platformen', p.id, { naam: w.naam }) : await voegToe('platformen', { naam: w.naam }))} />
  );
  const kolommen = beheerder ? 3 : 2;

  return (
    <>
      <JarenStatus metingen={data.metingen} beheerder={beheerder} onGewijzigd={onGewijzigd} />
      <div className="card">
        <div className="tabel-scroll">
          <table aria-label="Platformen en businessunits" className="beheer-tabel beheer-tabel-stapel catalogus-tabel" role="table">
            <thead role="rowgroup">
              <tr role="row"><th role="columnheader">Businessunit</th><th role="columnheader">Kleur</th>{beheerder && <th role="columnheader">Acties</th>}</tr>
            </thead>
            <tbody role="rowgroup">
              {platformen.map((p, pi) => {
                const units = p.businessUnits.filter((b) => !b.vervallen);
                return (
                  <Fragment key={p.id}>
                    <tr role="row" className="groep-kop" data-platform-rij={p.id}>
                      <th role="rowheader" colSpan={kolommen - (beheerder ? 1 : 0)} scope="rowgroup">
                        Platform {p.naam} <span className="groep-aantal">({units.length} {units.length === 1 ? 'businessunit' : 'businessunits'})</span>
                      </th>
                      {beheerder && (
                        <td role="cell" data-label="Acties" className="cel-acties">
                          <RijActies naam={`platform ${p.naam}`} kanOmhoog={pi > 0} kanOmlaag={pi < platformen.length - 1} verwijderLabel="Laten vervallen"
                            onVerplaats={async (r) => onGewijzigd(await verplaats('platformen', p.id, r))}
                            onWijzig={() => setBewerking({ soort: 'platform', id: p.id })} onVerwijder={() => laatVervallen('platformen', p.id, `het platform "${p.naam}"`)} />
                          <button type="button" className="btn btn-outline" onClick={() => setBewerking({ soort: 'unit', id: null, platformId: p.id })}>Businessunit toevoegen aan {p.naam}</button>
                        </td>
                      )}
                    </tr>
                    {bewerking?.soort === 'platform' && bewerking.id === p.id && <tr role="row"><td role="cell" colSpan={kolommen} className="cel-editor">{platformFormulier(p)}</td></tr>}
                    {bewerking?.soort === 'unit' && bewerking.id === null && bewerking.platformId === p.id && <tr role="row"><td role="cell" colSpan={kolommen} className="cel-editor">{unitFormulier(null, p.id)}</td></tr>}
                    {units.map((b, bi) => (
                      <Fragment key={b.id}>
                        <tr role="row" data-businessunit={b.id}>
                          <td role="cell" data-label="Businessunit">{b.naam}</td>
                          <td role="cell" data-label="Kleur"><span className="kleur-stip" aria-hidden="true" style={{ background: b.kleur }} /> <span className="visueel-verborgen">eigen lijnkleur</span></td>
                          {beheerder && (
                            <td role="cell" data-label="Acties" className="cel-acties">
                              <RijActies naam={b.naam} kanOmhoog={bi > 0} kanOmlaag={bi < units.length - 1} verwijderLabel="Laten vervallen"
                                onVerplaats={async (r) => onGewijzigd(await verplaats('businessunits', b.id, r))}
                                onWijzig={() => setBewerking({ soort: 'unit', id: b.id })} onVerwijder={() => laatVervallen('businessunits', b.id, `de businessunit "${b.naam}"`)} />
                            </td>
                          )}
                        </tr>
                        {bewerking?.soort === 'unit' && bewerking.id === b.id && <tr role="row"><td role="cell" colSpan={kolommen} className="cel-editor">{unitFormulier(b, b.platformId)}</td></tr>}
                      </Fragment>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {beheerder && (bewerking?.soort === 'platform' && bewerking.id === null
          ? platformFormulier(null)
          : <button type="button" className="btn btn-primary" onClick={() => setBewerking({ soort: 'platform', id: null })}>Platform toevoegen</button>)}
      </div>
      <VervallenLijst titel="Vervallen platformen en businessunits" beheerder={beheerder}
        items={[
          ...data.platformen.filter((p) => p.vervallen).map((p) => ({ id: `platform:${p.id}`, naam: `platform ${p.naam}`, omschrijving: `Platform ${p.naam}` })),
          ...data.platformen.flatMap((p) => p.businessUnits.filter((b) => b.vervallen).map((b) => ({ id: `unit:${b.id}`, naam: b.naam, omschrijving: `${b.naam} (platform ${p.naam})` }))),
        ]}
        onHerstel={async (sleutel) => {
          const [soort, id] = sleutel.split(':') as ['platform' | 'unit', string];
          onGewijzigd(await wijzig(soort === 'platform' ? 'platformen' : 'businessunits', id, { vervallen: false }));
        }} />
    </>
  );
}
