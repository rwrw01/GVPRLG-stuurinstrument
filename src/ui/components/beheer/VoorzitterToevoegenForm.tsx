'use client';

import { useState, type FormEvent } from 'react';
import { verstuurJson } from '../_verstuurJson';
import { PlatformKeuze } from './PlatformKeuze';
import { BEHEER_ROLLEN, type BeheerRol } from './_beheerTypen';

/**
 * Narrows a select value to a known role.
 * @param waarde - Value of the role select
 * @returns The matching role, or `invuller` for an unknown value
 */
function naarRol(waarde: string): BeheerRol {
  return BEHEER_ROLLEN.find((r) => r === waarde) ?? 'invuller';
}

/**
 * Form "Voorzitter toevoegen": registers a user in the app with platform links for the chosen year.
 * Only an invuller gets platform links; for any other role the form sends `platformIds: []`.
 * @param props.jaar - Measurement year the platform links apply to
 * @param props.onToegevoegd - Called after a successful registration
 * @returns the form card
 */
export function VoorzitterToevoegenForm({ jaar, onToegevoegd }: { jaar: number; onToegevoegd: () => void }) {
  const [email, setEmail] = useState('');
  const [naam, setNaam] = useState('');
  const [rol, setRol] = useState<BeheerRol>('invuller');
  const [platformIds, setPlatformIds] = useState<string[]>([]);
  const [fout, setFout] = useState<string | null>(null);

  async function verstuur(event: FormEvent) {
    event.preventDefault();
    setFout(null);
    const gekozen = rol === 'invuller' ? platformIds : [];
    const melding = await verstuurJson('/api/beheer/gebruikers', 'POST', { email, naam, rol, jaar, platformIds: gekozen });
    if (melding) return setFout(melding);
    setEmail('');
    setNaam('');
    setRol('invuller');
    setPlatformIds([]);
    onToegevoegd();
  }

  return (
    <form className="card" onSubmit={verstuur} aria-label="Voorzitter toevoegen">
      <h3>Voorzitter toevoegen (meetjaar {jaar})</h3>
      <div className="form-group">
        <label htmlFor="nieuw-email">E-mail</label>
        <input id="nieuw-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="form-group">
        <label htmlFor="nieuw-naam">Naam</label>
        <input id="nieuw-naam" required value={naam} onChange={(e) => setNaam(e.target.value)} />
      </div>
      <div className="form-group">
        <label htmlFor="nieuw-rol">Rol</label>
        <select id="nieuw-rol" value={rol} onChange={(e) => setRol(naarRol(e.target.value))}>
          {BEHEER_ROLLEN.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>
      {rol === 'invuller' && <PlatformKeuze gekozen={platformIds} onChange={setPlatformIds} idPrefix="nieuw-platform" />}
      <button type="submit" className="btn btn-primary">Voorzitter toevoegen</button>
      {fout && <div className="alert alert-warning" role="alert">{fout}</div>}
    </form>
  );
}
