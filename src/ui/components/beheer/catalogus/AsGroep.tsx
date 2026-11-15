'use client';

import { Fragment, type ReactNode } from 'react';

import { RijActies } from './RijActies';
import { AsFormulier, VraagFormulier } from './_vragenlijstFormulieren';
import { bevestigVerwijderen, verplaats, wijzig } from './_catalogusApi';
import type { CatAs, CatMeting, CatVraag } from './_catalogusTypen';

/** Which form is open: an axis or question by id, or a new one (id null). */
export type Bewerking = { soort: 'as' | 'vraag'; id: string | null; asId?: string } | null;

/** What every row of the table needs from the page. */
export interface Bediening {
  beheerder: boolean;
  bewerking: Bewerking;
  zetBewerking: (b: Bewerking) => void;
  klaar: (fout: string | null) => string | null;
  onGewijzigd: (fout: string | null) => void;
  metingen: CatMeting[];
  assen: CatAs[];
  kolommen: number;
}

function EditorRij({ kolommen, children }: { kolommen: number; children: ReactNode }) {
  return <tr role="row"><td role="cell" colSpan={kolommen} className="cel-editor">{children}</td></tr>;
}

/**
 * One question row with its actions and, when open, its edit form.
 * @param props.vraag - The question
 * @param props.index - Position among the active questions of its axis
 * @param props.aantal - Number of active questions of its axis
 * @param props.b - Page state and handlers
 * @returns the rows
 */
function VraagRij({ vraag, index, aantal, b }: { vraag: CatVraag; index: number; aantal: number; b: Bediening }) {
  const verwijder = async () => {
    if (window.confirm(bevestigVerwijderen(`de vraag "${vraag.kort}"`, b.metingen))) b.onGewijzigd(await wijzig('vragen', vraag.id, { vervallen: true }));
  };
  return (
    <>
      <tr role="row" data-vraag={vraag.id}>
        <td role="cell" data-label="Kort label">{vraag.kort}</td>
        <td role="cell" data-label="Vraag">{vraag.tekst}</td>
        <td role="cell" data-label="NDS-thema">{vraag.nds ?? '-'}</td>
        {b.beheerder && (
          <td role="cell" data-label="Acties" className="cel-acties">
            <RijActies naam={vraag.kort} kanOmhoog={index > 0} kanOmlaag={index < aantal - 1} verwijderLabel="Verwijderen"
              onVerplaats={async (r) => b.onGewijzigd(await verplaats('vragen', vraag.id, r))}
              onWijzig={() => b.zetBewerking({ soort: 'vraag', id: vraag.id })} onVerwijder={verwijder} />
          </td>
        )}
      </tr>
      {b.bewerking?.soort === 'vraag' && b.bewerking.id === vraag.id && (
        <EditorRij kolommen={b.kolommen}><VraagFormulier vraag={vraag} asId={vraag.asId} assen={b.assen} klaar={b.klaar} onAnnuleren={() => b.zetBewerking(null)} /></EditorRij>
      )}
    </>
  );
}

/**
 * The header row of one axis with its actions.
 * @param props.as - The axis
 * @param props.index - Position among the active axes
 * @param props.aantalVragen - Number of active questions
 * @param props.b - Page state and handlers
 * @returns the row
 */
function AsKop({ as, index, aantalVragen, b }: { as: CatAs; index: number; aantalVragen: number; b: Bediening }) {
  const verwijder = async () => {
    if (window.confirm(bevestigVerwijderen(`de as "${as.naam}"`, b.metingen))) b.onGewijzigd(await wijzig('assen', as.id, { vervallen: true }));
  };
  return (
    <tr role="row" className="groep-kop" data-as={as.id}>
      <th role="rowheader" colSpan={b.kolommen - (b.beheerder ? 1 : 0)} scope="rowgroup">
        <span className="kleur-stip" aria-hidden="true" style={{ background: as.kleur }} />
        <span style={{ color: as.kleur }}>As {as.naam}</span> <span className="groep-aantal">({aantalVragen} {aantalVragen === 1 ? 'vraag' : 'vragen'})</span>
      </th>
      {b.beheerder && (
        <td role="cell" data-label="Acties" className="cel-acties">
          <RijActies naam={`as ${as.naam}`} kanOmhoog={index > 0} kanOmlaag={index < b.assen.length - 1} verwijderLabel="Verwijderen"
            onVerplaats={async (r) => b.onGewijzigd(await verplaats('assen', as.id, r))}
            onWijzig={() => b.zetBewerking({ soort: 'as', id: as.id })} onVerwijder={verwijder} />
          <button type="button" className="btn btn-outline" onClick={() => b.zetBewerking({ soort: 'vraag', id: null, asId: as.id })}>Vraag toevoegen aan {as.naam}</button>
        </td>
      )}
    </tr>
  );
}

/**
 * One axis in the questionnaire table: its header row, its open forms and its active questions.
 * @param props.as - The axis (active)
 * @param props.index - Position among the active axes
 * @param props.b - Page state and handlers
 * @returns the rows of the axis
 */
export function AsGroep({ as, index, b }: { as: CatAs; index: number; b: Bediening }) {
  const vragen = as.vragen.filter((v) => !v.vervallen);
  const open = b.bewerking;
  return (
    <Fragment>
      <AsKop as={as} index={index} aantalVragen={vragen.length} b={b} />
      {open?.soort === 'as' && open.id === as.id && <EditorRij kolommen={b.kolommen}><AsFormulier as={as} klaar={b.klaar} onAnnuleren={() => b.zetBewerking(null)} /></EditorRij>}
      {open?.soort === 'vraag' && open.id === null && open.asId === as.id && (
        <EditorRij kolommen={b.kolommen}><VraagFormulier vraag={null} asId={as.id} assen={b.assen} klaar={b.klaar} onAnnuleren={() => b.zetBewerking(null)} /></EditorRij>
      )}
      {vragen.map((v, i) => <VraagRij key={v.id} vraag={v} index={i} aantal={vragen.length} b={b} />)}
    </Fragment>
  );
}
