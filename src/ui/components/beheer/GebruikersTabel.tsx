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
    <table aria-label="Gebruikers" className="beheer-tabel">
      <thead>
        <tr>
          <th>Naam</th><th>E-mail</th><th>Rol</th><th>Status</th><th>Platformen {jaar}</th><th>Acties</th>
        </tr>
      </thead>
      <tbody>
        {gebruikers.map((g) => (
          <Fragment key={g.id}>
            <tr>
              <td>{g.naam}</td><td>{g.email}</td><td>{g.rol}</td><td>{g.status}</td><td>{platformNamen(g.platformIds)}</td>
              <td><RijActies g={g} acties={acties} onKoppelingen={() => setEditorVoor(g.id)} /></td>
            </tr>
            {editorVoor === g.id && (
              <tr>
                <td colSpan={6}>
                  <KoppelingenEditor gebruikerId={g.id} huidig={g.platformIds} onOpslaan={(ids) => opslaan(g.id, ids)} onAnnuleren={() => setEditorVoor(null)} />
                </td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
