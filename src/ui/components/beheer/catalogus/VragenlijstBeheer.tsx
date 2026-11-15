'use client';

import { Fragment, useState } from 'react';

import { CONFIG } from '@/src/service/config';

import { ItemFormulier, type Veld } from './ItemFormulier';
import { JarenStatus } from './JarenStatus';
import { RijActies, VervallenLijst } from './RijActies';
import { bevestigVerwijderen, verplaats, voegToe, wijzig } from './_catalogusApi';
import type { CatalogusData, CatAs, CatVraag } from './_catalogusTypen';

type Bewerking = { soort: 'as' | 'vraag'; id: string | null; asId?: string } | null;

const NDS_OPTIES = [{ value: '', label: 'Geen' }, ...CONFIG.ndsThemas.map((t) => ({ value: t.id, label: t.id }))];

function vraagVelden(assen: CatAs[]): Veld[] {
  return [
    { sleutel: 'asId', label: 'As', soort: 'keuze', opties: assen.map((a) => ({ value: a.id, label: a.naam })) },
    { sleutel: 'kort', label: 'Kort label', soort: 'tekst', maxLength: 22, hint: 'Maximaal 22 tekens; staat bij de spaak in het spinnenweb.', verplicht: true },
    { sleutel: 'tekst', label: 'Vraagtekst', soort: 'lang', verplicht: true },
    { sleutel: 'nds', label: 'NDS-thema', soort: 'keuze', opties: NDS_OPTIES },
  ];
}
const AS_VELDEN: Veld[] = [{ sleutel: 'naam', label: 'Naam van de as', soort: 'tekst', verplicht: true }];

interface Props {
  data: CatalogusData;
  beheerder: boolean;
  onGewijzigd: (fout: string | null) => void;
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
  const [bewerking, setBewerking] = useState<Bewerking>(null);
  const assen = data.assen.filter((a) => !a.vervallen);
  const actieveAssen = assen;
  const klaar = (fout: string | null) => {
    if (!fout) setBewerking(null);
    onGewijzigd(fout);
    return fout;
  };
  const verwijderVraag = async (v: CatVraag) => {
    if (window.confirm(bevestigVerwijderen(`de vraag "${v.kort}"`, data.metingen))) onGewijzigd(await wijzig('vragen', v.id, { vervallen: true }));
  };
  const verwijderAs = async (a: CatAs) => {
    if (window.confirm(bevestigVerwijderen(`de as "${a.naam}"`, data.metingen))) onGewijzigd(await wijzig('assen', a.id, { vervallen: true }));
  };
  const vraagFormulier = (v: CatVraag | null, asId: string) => (
    <ItemFormulier titel={v ? `Vraag wijzigen: ${v.kort}` : 'Vraag toevoegen'} idPrefix={v ? `vraag-${v.id}` : `nieuwe-vraag-${asId}`} velden={vraagVelden(actieveAssen)}
      begin={{ asId: v?.asId ?? asId, kort: v?.kort ?? '', tekst: v?.tekst ?? '', nds: v?.nds ?? '' }} knop={v ? 'Wijziging opslaan' : 'Vraag toevoegen'}
      onAnnuleren={() => setBewerking(null)}
      onOpslaan={async (w) => {
        const body = { asId: w.asId, kort: w.kort, tekst: w.tekst, nds: w.nds || null };
        return klaar(v ? await wijzig('vragen', v.id, body) : await voegToe('vragen', body));
      }} />
  );
  const asFormulier = (a: CatAs | null) => (
    <ItemFormulier titel={a ? `As wijzigen: ${a.naam}` : 'As toevoegen'} idPrefix={a ? `as-${a.id}` : 'nieuwe-as'} velden={AS_VELDEN} begin={{ naam: a?.naam ?? '' }}
      knop={a ? 'Wijziging opslaan' : 'As toevoegen'} onAnnuleren={() => setBewerking(null)}
      onOpslaan={async (w) => klaar(a ? await wijzig('assen', a.id, { naam: w.naam }) : await voegToe('assen', { naam: w.naam }))} />
  );
  const kolommen = beheerder ? 4 : 3;

  return (
    <>
      <JarenStatus metingen={data.metingen} beheerder={beheerder} onGewijzigd={onGewijzigd} />
      <div className="card">
        <div className="tabel-scroll">
          <table aria-label="Vragenlijst" className="beheer-tabel beheer-tabel-stapel catalogus-tabel" role="table">
            <thead role="rowgroup">
              <tr role="row"><th role="columnheader">Kort label</th><th role="columnheader">Vraag</th><th role="columnheader">NDS-thema</th>{beheerder && <th role="columnheader">Acties</th>}</tr>
            </thead>
            <tbody role="rowgroup">
              {assen.map((a, ai) => {
                const vragen = a.vragen.filter((v) => !v.vervallen);
                return (
                  <Fragment key={a.id}>
                    <tr role="row" className="groep-kop" data-as={a.id}>
                      <th role="rowheader" colSpan={kolommen - (beheerder ? 1 : 0)} scope="rowgroup">
                        <span className="kleur-stip" aria-hidden="true" style={{ background: a.kleur }} />
                        <span style={{ color: a.kleur }}>As {a.naam}</span> <span className="groep-aantal">({vragen.length} {vragen.length === 1 ? 'vraag' : 'vragen'})</span>
                      </th>
                      {beheerder && (
                        <td role="cell" data-label="Acties" className="cel-acties">
                          <RijActies naam={`as ${a.naam}`} kanOmhoog={ai > 0} kanOmlaag={ai < assen.length - 1} verwijderLabel="Verwijderen"
                            onVerplaats={async (r) => onGewijzigd(await verplaats('assen', a.id, r))}
                            onWijzig={() => setBewerking({ soort: 'as', id: a.id })} onVerwijder={() => verwijderAs(a)} />
                          <button type="button" className="btn btn-outline" onClick={() => setBewerking({ soort: 'vraag', id: null, asId: a.id })}>Vraag toevoegen aan {a.naam}</button>
                        </td>
                      )}
                    </tr>
                    {bewerking?.soort === 'as' && bewerking.id === a.id && <tr role="row"><td role="cell" colSpan={kolommen} className="cel-editor">{asFormulier(a)}</td></tr>}
                    {bewerking?.soort === 'vraag' && bewerking.id === null && bewerking.asId === a.id && <tr role="row"><td role="cell" colSpan={kolommen} className="cel-editor">{vraagFormulier(null, a.id)}</td></tr>}
                    {vragen.map((v, vi) => (
                      <Fragment key={v.id}>
                        <tr role="row" data-vraag={v.id}>
                          <td role="cell" data-label="Kort label">{v.kort}</td>
                          <td role="cell" data-label="Vraag">{v.tekst}</td>
                          <td role="cell" data-label="NDS-thema">{v.nds ?? '-'}</td>
                          {beheerder && (
                            <td role="cell" data-label="Acties" className="cel-acties">
                              <RijActies naam={v.kort} kanOmhoog={vi > 0} kanOmlaag={vi < vragen.length - 1} verwijderLabel="Verwijderen"
                                onVerplaats={async (r) => onGewijzigd(await verplaats('vragen', v.id, r))}
                                onWijzig={() => setBewerking({ soort: 'vraag', id: v.id })} onVerwijder={() => verwijderVraag(v)} />
                            </td>
                          )}
                        </tr>
                        {bewerking?.soort === 'vraag' && bewerking.id === v.id && <tr role="row"><td role="cell" colSpan={kolommen} className="cel-editor">{vraagFormulier(v, v.asId)}</td></tr>}
                      </Fragment>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {beheerder && (bewerking?.soort === 'as' && bewerking.id === null
          ? asFormulier(null)
          : <button type="button" className="btn btn-primary" onClick={() => setBewerking({ soort: 'as', id: null })}>As toevoegen</button>)}
      </div>
      <VervallenLijst titel="Verwijderde assen en vragen" beheerder={beheerder}
        items={[
          ...data.assen.filter((a) => a.vervallen).map((a) => ({ id: `as:${a.id}`, naam: `as ${a.naam}`, omschrijving: `As ${a.naam}` })),
          ...data.assen.flatMap((a) => a.vragen.filter((v) => v.vervallen).map((v) => ({ id: `vraag:${v.id}`, naam: v.kort, omschrijving: `${v.kort} (as ${a.naam}): ${v.tekst}` }))),
        ]}
        onHerstel={async (sleutel) => {
          const [soort, id] = sleutel.split(':') as ['as' | 'vraag', string];
          onGewijzigd(await wijzig(soort === 'as' ? 'assen' : 'vragen', id, { vervallen: false }));
        }} />
    </>
  );
}
