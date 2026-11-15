'use client';

import { Fragment, type ReactNode } from 'react';

import { RijActies } from './RijActies';
import { PlatformFormulier, UnitFormulier } from './_businessUnitFormulieren';
import { bevestigPlatformVervallen, bevestigVerwijderen, verplaats, wijzig } from './_catalogusApi';
import type { CatBusinessUnit, CatMeting, CatPlatform } from './_catalogusTypen';

/** Which form is open: a platform or business unit by id, or a new one (id null). */
export type UnitBewerking = { soort: 'platform' | 'unit'; id: string | null; platformId?: string } | null;

/** What every row of the table needs from the page. */
export interface UnitBediening {
  beheerder: boolean;
  bewerking: UnitBewerking;
  zetBewerking: (b: UnitBewerking) => void;
  klaar: (fout: string | null) => string | null;
  onGewijzigd: (fout: string | null) => void;
  metingen: CatMeting[];
  platformen: CatPlatform[];
  kolommen: number;
}

function EditorRij({ kolommen, children }: { kolommen: number; children: ReactNode }) {
  return <tr role="row"><td role="cell" colSpan={kolommen} className="cel-editor">{children}</td></tr>;
}

/**
 * One business unit row with its colour, actions and, when open, its edit form.
 * @param props.unit - The business unit
 * @param props.index - Position among the active business units of its platform
 * @param props.aantal - Number of active business units of its platform
 * @param props.b - Page state and handlers
 * @returns the rows
 */
function UnitRij({ unit, index, aantal, b }: { unit: CatBusinessUnit; index: number; aantal: number; b: UnitBediening }) {
  const laatVervallen = async () => {
    if (window.confirm(bevestigVerwijderen(`de businessunit "${unit.naam}"`, b.metingen))) b.onGewijzigd(await wijzig('businessunits', unit.id, { vervallen: true }));
  };
  return (
    <>
      <tr role="row" data-businessunit={unit.id}>
        <td role="cell" data-label="Businessunit">{unit.naam}</td>
        <td role="cell" data-label="Kleur"><span className="kleur-stip" aria-hidden="true" style={{ background: unit.kleur }} /> <span className="visueel-verborgen">eigen lijnkleur</span></td>
        {b.beheerder && (
          <td role="cell" data-label="Acties" className="cel-acties">
            <RijActies naam={unit.naam} kanOmhoog={index > 0} kanOmlaag={index < aantal - 1} verwijderLabel="Laten vervallen"
              onVerplaats={async (r) => b.onGewijzigd(await verplaats('businessunits', unit.id, r))}
              onWijzig={() => b.zetBewerking({ soort: 'unit', id: unit.id })} onVerwijder={laatVervallen} />
          </td>
        )}
      </tr>
      {b.bewerking?.soort === 'unit' && b.bewerking.id === unit.id && (
        <EditorRij kolommen={b.kolommen}><UnitFormulier unit={unit} platformId={unit.platformId} platformen={b.platformen} klaar={b.klaar} onAnnuleren={() => b.zetBewerking(null)} /></EditorRij>
      )}
    </>
  );
}

/**
 * The header row of one platform with its actions.
 * @param props.platform - The platform
 * @param props.index - Position among the active platforms
 * @param props.aantalUnits - Number of active business units
 * @param props.b - Page state and handlers
 * @returns the row
 */
function PlatformKop({ platform, index, aantalUnits, b }: { platform: CatPlatform; index: number; aantalUnits: number; b: UnitBediening }) {
  const laatVervallen = async () => {
    if (window.confirm(bevestigPlatformVervallen(platform.naam, b.metingen))) b.onGewijzigd(await wijzig('platformen', platform.id, { vervallen: true }));
  };
  return (
    <tr role="row" className="groep-kop" data-platform-rij={platform.id}>
      <th role="rowheader" colSpan={b.kolommen - (b.beheerder ? 1 : 0)} scope="rowgroup">
        Platform {platform.naam} <span className="groep-aantal">({aantalUnits} {aantalUnits === 1 ? 'businessunit' : 'businessunits'})</span>
      </th>
      {b.beheerder && (
        <td role="cell" data-label="Acties" className="cel-acties">
          <RijActies naam={`platform ${platform.naam}`} kanOmhoog={index > 0} kanOmlaag={index < b.platformen.length - 1} verwijderLabel="Laten vervallen"
            onVerplaats={async (r) => b.onGewijzigd(await verplaats('platformen', platform.id, r))}
            onWijzig={() => b.zetBewerking({ soort: 'platform', id: platform.id })} onVerwijder={laatVervallen} />
          <button type="button" className="btn btn-outline" onClick={() => b.zetBewerking({ soort: 'unit', id: null, platformId: platform.id })}>Businessunit toevoegen aan {platform.naam}</button>
        </td>
      )}
    </tr>
  );
}

/**
 * One platform in the table: its header row, its open forms and its active business units.
 * @param props.platform - The platform (active)
 * @param props.index - Position among the active platforms
 * @param props.b - Page state and handlers
 * @returns the rows of the platform
 */
export function PlatformGroep({ platform, index, b }: { platform: CatPlatform; index: number; b: UnitBediening }) {
  const units = platform.businessUnits.filter((u) => !u.vervallen);
  const open = b.bewerking;
  return (
    <Fragment>
      <PlatformKop platform={platform} index={index} aantalUnits={units.length} b={b} />
      {open?.soort === 'platform' && open.id === platform.id && (
        <EditorRij kolommen={b.kolommen}><PlatformFormulier platform={platform} klaar={b.klaar} onAnnuleren={() => b.zetBewerking(null)} /></EditorRij>
      )}
      {open?.soort === 'unit' && open.id === null && open.platformId === platform.id && (
        <EditorRij kolommen={b.kolommen}><UnitFormulier unit={null} platformId={platform.id} platformen={b.platformen} klaar={b.klaar} onAnnuleren={() => b.zetBewerking(null)} /></EditorRij>
      )}
      {units.map((u, i) => <UnitRij key={u.id} unit={u} index={i} aantal={units.length} b={b} />)}
    </Fragment>
  );
}
