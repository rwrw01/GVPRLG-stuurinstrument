'use client';

import { useState } from 'react';
import { PlatformKeuze } from './PlatformKeuze';
import { BEHEER_ROLLEN, type BeheerGebruiker } from './_beheerTypen';
import { lezerBevestiging, vraagtLezerBevestiging, type BewerkbareGebruiker } from './_gebruikerBewerken';

/**
 * Edit panel below a user row: role and the platform links of the chosen year, saved together.
 * A lezer cannot hold links, so the platform choice is hidden for that role and becoming lezer is
 * confirmed first (all links in every year are removed). The panel stays open when saving fails.
 * @param props.g - The user being edited
 * @param props.jaar - Measurement year of the links
 * @param props.onOpslaan - Saves the edited role and links; resolves to true on full success
 * @param props.onAnnuleren - Closes the panel without saving
 * @returns the edit panel
 */
export function GebruikerBewerken(props: {
  g: BeheerGebruiker;
  jaar: number;
  onOpslaan: (nieuw: BewerkbareGebruiker) => Promise<boolean>;
  onAnnuleren: () => void;
}) {
  const { g } = props;
  const [rol, setRol] = useState(g.rol);
  const [platformIds, setPlatformIds] = useState<string[]>(g.platformIds);
  const [bezig, setBezig] = useState(false);
  const rolId = `bewerk-rol-${g.id}`;

  async function opslaan() {
    if (vraagtLezerBevestiging(g.rol, rol) && !window.confirm(lezerBevestiging(g.naam))) return;
    setBezig(true);
    const gelukt = await props.onOpslaan({ rol, platformIds });
    if (!gelukt) setBezig(false);
  }

  return (
    <div className="koppelingen-editor gebruiker-bewerken" role="group" aria-label={`Rol en platformen van ${g.naam}`}>
      <div className="form-group gebruiker-bewerken-rol">
        <label htmlFor={rolId}>Rol</label>
        <select id={rolId} value={rol} onChange={(e) => setRol(BEHEER_ROLLEN.find((r) => r === e.target.value) ?? g.rol)}>
          {BEHEER_ROLLEN.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      {rol === 'lezer' ? (
        <p className="gebruiker-bewerken-noot">Een lezer heeft geen platformkoppelingen; bestaande koppelingen worden verwijderd.</p>
      ) : (
        <>
          <p className="gebruiker-bewerken-noot">Platformkoppelingen voor meetjaar {props.jaar}:</p>
          <PlatformKeuze gekozen={platformIds} onChange={setPlatformIds} idPrefix={`bewerk-${g.id}`} />
        </>
      )}
      <div className="btn-group">
        <button type="button" className="btn btn-primary" disabled={bezig} onClick={() => void opslaan()}>Opslaan</button>
        <button type="button" className="btn btn-outline" onClick={props.onAnnuleren}>Annuleren</button>
      </div>
    </div>
  );
}
