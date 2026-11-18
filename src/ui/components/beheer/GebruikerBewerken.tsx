'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { PlatformKeuze } from './PlatformKeuze';
import { BEHEER_ROLLEN, type BeheerGebruiker, type BeheerRol } from './_beheerTypen';
import { lezerBevestiging, vraagtLezerBevestiging, type BewerkbareGebruiker } from './_gebruikerBewerken';

interface RolKeuzeProps {
  g: BeheerGebruiker;
  rol: BeheerRol;
  uitgeschakeld: boolean;
  selectRef: RefObject<HTMLSelectElement | null>;
  onKies: (rol: BeheerRol) => void;
}

function RolKeuze({ g, rol, uitgeschakeld, selectRef, onKies }: RolKeuzeProps) {
  const id = `bewerk-rol-${g.id}`;
  return (
    <div className="form-group gebruiker-bewerken-rol">
      <label htmlFor={id}>Rol</label>
      <select id={id} ref={selectRef} value={rol} disabled={uitgeschakeld} onChange={(e) => onKies(BEHEER_ROLLEN.find((r) => r === e.target.value) ?? rol)}>
        {BEHEER_ROLLEN.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
    </div>
  );
}

// Panel state: the edited role and links, the lezer confirmation, the saving flag and message.
function usePaneelStaat(g: BeheerGebruiker, onOpslaan: (nieuw: BewerkbareGebruiker) => Promise<string | null>) {
  const [rol, setRol] = useState(g.rol);
  const [platformIds, setPlatformIds] = useState<string[]>(g.platformIds);
  const [lezerBevestigd, setLezerBevestigd] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);

  function kies(nieuw: BeheerRol) {
    const nodig = vraagtLezerBevestiging(g.rol, nieuw);
    if (nodig && !window.confirm(lezerBevestiging(g.naam))) return;
    setLezerBevestigd(nodig);
    setRol(nieuw);
  }

  // Safety net: saving lezer without a confirmation from the select asks here.
  async function opslaan() {
    if (vraagtLezerBevestiging(g.rol, rol) && !lezerBevestigd && !window.confirm(lezerBevestiging(g.naam))) return;
    setBezig(true);
    setMelding(null);
    const fout = await onOpslaan({ rol, platformIds });
    setMelding(fout);
    if (fout) setBezig(false);
  }

  return { rol, kies, platformIds, setPlatformIds, bezig, melding, opslaan };
}

/**
 * Edit panel below a user row: role and the platform links of the chosen year, saved together.
 * Choosing lezer asks for confirmation right away (all links in every year are removed); saving
 * asks again if that was not confirmed. A lezer gets no platform choice. While saving every
 * control is disabled; a failure is shown in the panel, which then stays open.
 * @param props.g - The user being edited
 * @param props.jaar - Measurement year of the links
 * @param props.id - Element id of the panel (target of the name button's aria-controls)
 * @param props.onOpslaan - Saves the edited role and links; resolves to null or a Dutch message
 * @param props.onAnnuleren - Closes the panel without saving
 * @returns the edit panel
 */
export function GebruikerBewerken(props: { g: BeheerGebruiker; jaar: number; id: string; onOpslaan: (nieuw: BewerkbareGebruiker) => Promise<string | null>; onAnnuleren: () => void }) {
  const { g } = props;
  const staat = usePaneelStaat(g, props.onOpslaan);
  const selectRef = useRef<HTMLSelectElement>(null);
  useEffect(() => selectRef.current?.focus(), []);

  return (
    <div id={props.id} className="koppelingen-editor gebruiker-bewerken" role="group" aria-label={`Rol en platformen van ${g.naam}`}>
      {staat.melding && <div className="alert alert-warning" role="alert">{staat.melding}</div>}
      <RolKeuze g={g} rol={staat.rol} uitgeschakeld={staat.bezig} selectRef={selectRef} onKies={staat.kies} />
      {staat.rol === 'lezer' ? (
        <p className="gebruiker-bewerken-noot">Een lezer heeft geen platformkoppelingen; bestaande koppelingen worden verwijderd.</p>
      ) : (
        <>
          <p className="gebruiker-bewerken-noot">Platformkoppelingen voor meetjaar {props.jaar}:</p>
          <PlatformKeuze gekozen={staat.platformIds} onChange={staat.setPlatformIds} idPrefix={`bewerk-${g.id}`} uitgeschakeld={staat.bezig} />
        </>
      )}
      <div className="btn-group">
        <button type="button" className="btn btn-primary" disabled={staat.bezig} onClick={() => void staat.opslaan()}>Opslaan</button>
        <button type="button" className="btn btn-outline" disabled={staat.bezig} onClick={props.onAnnuleren}>Annuleren</button>
      </div>
    </div>
  );
}
