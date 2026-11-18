'use client';

import { Fragment, useState } from 'react';
import { GebruikerBewerken } from './GebruikerBewerken';
import { useJaarPlatformen, type JaarPlatform } from './_jaarPlatformen';
import type { BeheerGebruiker, GebruikerWijziging } from './_beheerTypen';
import { sorteerOpNaam, type BewerkbareGebruiker, type SorteerRichting } from './_gebruikerBewerken';

interface Acties {
  onWijzig: (id: string, wijziging: GebruikerWijziging) => void;
  onOpslaan: (g: BeheerGebruiker, nieuw: BewerkbareGebruiker) => Promise<boolean>;
}

function platformNamen(platformen: JaarPlatform[], ids: string[]): string {
  const namen = ids.map((id) => platformen.find((p) => p.id === id)?.naam ?? id);
  return namen.length > 0 ? namen.join(', ') : '-';
}

/**
 * Header cell of the name column: a button that toggles the sort direction, with `aria-sort`.
 * @param props.richting - Current direction
 * @param props.onWissel - Toggles the direction
 * @returns the sortable column header
 */
function NaamKop({ richting, onWissel }: { richting: SorteerRichting; onWissel: () => void }) {
  return (
    <th role="columnheader" aria-sort={richting === 'oplopend' ? 'ascending' : 'descending'}>
      <button type="button" className="sorteer-knop" onClick={onWissel}>
        Naam <span aria-hidden="true">{richting === 'oplopend' ? '▲' : '▼'}</span>
      </button>
    </th>
  );
}

function RijActies({ g, onWijzig }: { g: BeheerGebruiker; onWijzig: Acties['onWijzig'] }) {
  function ontkoppel() {
    if (window.confirm(`Keycloak-account van ${g.naam} ontkoppelen? De volgende login koppelt opnieuw op e-mail.`)) {
      onWijzig(g.id, { actie: 'ontkoppelAccount' });
    }
  }
  return (
    <div className="btn-group beheer-acties">
      {g.status === 'ingetrokken' ? (
        <button type="button" className="btn btn-outline" onClick={() => onWijzig(g.id, { actie: 'herstellen' })}>Toegang herstellen</button>
      ) : (
        <button type="button" className="btn btn-danger" onClick={() => onWijzig(g.id, { actie: 'intrekken' })}>Toegang intrekken</button>
      )}
      {g.gekoppeld && (
        <button type="button" className="btn btn-outline" onClick={ontkoppel}>Keycloak-account ontkoppelen</button>
      )}
    </div>
  );
}

function GebruikerRij({ g, jaar, onWijzig, onBewerk }: { g: BeheerGebruiker; jaar: number; onWijzig: Acties['onWijzig']; onBewerk: () => void }) {
  const platformen = useJaarPlatformen();
  return (
    <tr role="row">
      <td role="cell" data-label="Naam">
        <button type="button" className="link-knop" aria-label={`Bewerk ${g.naam}`} onClick={onBewerk}>{g.naam}</button>
      </td>
      <td role="cell" data-label="E-mail">{g.email}</td><td role="cell" data-label="Rol">{g.rol}</td><td role="cell" data-label="Status">{g.status}</td>
      <td role="cell" data-label={`Platformen ${jaar}`}>{platformNamen(platformen, g.platformIds)}</td>
      <td role="cell" data-label="Acties" className="cel-acties"><RijActies g={g} onWijzig={onWijzig} /></td>
    </tr>
  );
}

/**
 * Table of users, sortable by name, with their platform links for one year and the access
 * actions. Clicking a name opens the edit panel for role and links below that row (one at a time).
 * @param props.gebruikers - Users from the admin API
 * @param props.jaar - Measurement year shown in the platform column
 * @param props.onWijzig - Sends a PATCH access action for a user
 * @param props.onOpslaan - Saves role and links from the edit panel; resolves to true on success
 * @returns the user table
 */
export function GebruikersTabel({ gebruikers, jaar, onWijzig, onOpslaan }: { gebruikers: BeheerGebruiker[]; jaar: number } & Acties) {
  const [richting, setRichting] = useState<SorteerRichting>('oplopend');
  const [bewerkVoor, setBewerkVoor] = useState<string | null>(null);

  async function opslaan(g: BeheerGebruiker, nieuw: BewerkbareGebruiker): Promise<boolean> {
    const gelukt = await onOpslaan(g, nieuw);
    if (gelukt) setBewerkVoor(null);
    return gelukt;
  }

  return (
    <div className="tabel-scroll">
    <table aria-label="Gebruikers" className="beheer-tabel beheer-tabel-stapel" role="table">
      <thead role="rowgroup">
        <tr role="row">
          <NaamKop richting={richting} onWissel={() => setRichting(richting === 'oplopend' ? 'aflopend' : 'oplopend')} />
          <th role="columnheader">E-mail</th><th role="columnheader">Rol</th><th role="columnheader">Status</th><th role="columnheader">Platformen {jaar}</th><th role="columnheader">Acties</th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        {sorteerOpNaam(gebruikers, richting).map((g) => (
          <Fragment key={g.id}>
            <GebruikerRij g={g} jaar={jaar} onWijzig={onWijzig} onBewerk={() => setBewerkVoor(bewerkVoor === g.id ? null : g.id)} />
            {bewerkVoor === g.id && (
              <tr role="row">
                <td role="cell" colSpan={6} className="cel-editor">
                  <GebruikerBewerken key={`${g.id}-${jaar}`} g={g} jaar={jaar} onOpslaan={(nieuw) => opslaan(g, nieuw)} onAnnuleren={() => setBewerkVoor(null)} />
                </td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
    </div>
  );
}
