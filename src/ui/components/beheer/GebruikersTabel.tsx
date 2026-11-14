'use client';

import { Fragment, useState } from 'react';
import { CONFIG } from '@/src/service/config';
import { KoppelingenEditor } from './KoppelingenEditor';
import type { BeheerGebruiker, GebruikerWijziging } from './_beheerTypen';

interface Acties {
  onWijzig: (id: string, wijziging: GebruikerWijziging) => void;
  onKoppelingen: (id: string, platformIds: string[]) => void;
}

function platformNamen(ids: string[]): string {
  const namen = ids.map((id) => CONFIG.platformen.find((p) => p.id === id)?.naam ?? id);
  return namen.length > 0 ? namen.join(', ') : '-';
}

function RijActies({ g, acties, onKoppelingen }: { g: BeheerGebruiker; acties: Acties; onKoppelingen: () => void }) {
  const andereRol = g.rol === 'beheerder' ? 'invuller' : 'beheerder';
  function ontkoppel() {
    if (window.confirm(`Keycloak-account van ${g.naam} ontkoppelen? De volgende login koppelt opnieuw op e-mail.`)) {
      acties.onWijzig(g.id, { actie: 'ontkoppelAccount' });
    }
  }
  return (
    <div className="btn-group beheer-acties">
      <button type="button" className="btn btn-outline" onClick={onKoppelingen}>Koppelingen</button>
      <button type="button" className="btn btn-outline" onClick={() => acties.onWijzig(g.id, { actie: 'rol', rol: andereRol })}>
        Rol wijzigen naar {andereRol}
      </button>
      {g.status === 'ingetrokken' ? (
        <button type="button" className="btn btn-outline" onClick={() => acties.onWijzig(g.id, { actie: 'herstellen' })}>Toegang herstellen</button>
      ) : (
        <button type="button" className="btn btn-danger" onClick={() => acties.onWijzig(g.id, { actie: 'intrekken' })}>Toegang intrekken</button>
      )}
      {g.gekoppeld && (
        <button type="button" className="btn btn-outline" onClick={ontkoppel}>Keycloak-account ontkoppelen</button>
      )}
    </div>
  );
}

/**
 * Table of users with their platform links for one year and the per-row admin actions.
 * @param props.gebruikers - Users from the admin API
 * @param props.jaar - Measurement year shown in the platform column
 * @param props.onWijzig - Sends a PATCH action for a user
 * @param props.onKoppelingen - Replaces a user's platform links for the year
 * @returns the user table
 */
export function GebruikersTabel({ gebruikers, jaar, ...acties }: { gebruikers: BeheerGebruiker[]; jaar: number } & Acties) {
  const [editorVoor, setEditorVoor] = useState<string | null>(null);

  function opslaan(id: string, platformIds: string[]) {
    setEditorVoor(null);
    acties.onKoppelingen(id, platformIds);
  }

  return (
    <div className="tabel-scroll">
    <table aria-label="Gebruikers" className="beheer-tabel beheer-tabel-stapel" role="table">
      <thead role="rowgroup">
        <tr role="row">
          <th role="columnheader">Naam</th><th role="columnheader">E-mail</th><th role="columnheader">Rol</th><th role="columnheader">Status</th><th role="columnheader">Platformen {jaar}</th><th role="columnheader">Acties</th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        {gebruikers.map((g) => (
          <Fragment key={g.id}>
            <tr role="row">
              <td role="cell" data-label="Naam">{g.naam}</td><td role="cell" data-label="E-mail">{g.email}</td><td role="cell" data-label="Rol">{g.rol}</td><td role="cell" data-label="Status">{g.status}</td><td role="cell" data-label={`Platformen ${jaar}`}>{platformNamen(g.platformIds)}</td>
              <td role="cell" data-label="Acties" className="cel-acties"><RijActies g={g} acties={acties} onKoppelingen={() => setEditorVoor(g.id)} /></td>
            </tr>
            {editorVoor === g.id && (
              <tr role="row">
                <td role="cell" colSpan={6} className="cel-editor">
                  <KoppelingenEditor gebruikerId={g.id} huidig={g.platformIds} onOpslaan={(ids) => opslaan(g.id, ids)} onAnnuleren={() => setEditorVoor(null)} />
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
