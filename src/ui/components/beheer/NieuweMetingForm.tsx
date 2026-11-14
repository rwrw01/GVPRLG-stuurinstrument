'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';

import { verstuurJson } from '../_verstuurJson';

/**
 * Form "Nieuwe meting" on the admin page: creates the meting for a year (POST /api/metingen,
 * which enforces the beheerder role itself).
 * @param props.onAangemaakt - Called with the year after a successful creation
 * @returns the form card
 */
export function NieuweMetingForm({ onAangemaakt }: { onAangemaakt: (jaar: number) => void }) {
  const [nieuwJaar, setNieuwJaar] = useState('');
  const [fout, setFout] = useState<string | null>(null);
  const [aangemaakt, setAangemaakt] = useState<number | null>(null);

  async function verstuur(event: FormEvent) {
    event.preventDefault();
    setFout(null);
    setAangemaakt(null);
    const jaar = Number(nieuwJaar);
    const melding = await verstuurJson('/api/metingen', 'POST', { jaar });
    if (melding) return setFout(melding);
    setNieuwJaar('');
    setAangemaakt(jaar);
    onAangemaakt(jaar);
  }

  return (
    <form id="nieuwe-meting" className="card" onSubmit={verstuur} aria-label="Nieuwe meting">
      <h3>Nieuwe meting</h3>
      <div className="form-group nieuwe-meting-jaar">
        <label htmlFor="nieuw-jaar">Nieuwe meting (jaar)</label>
        <input id="nieuw-jaar" type="number" inputMode="numeric" value={nieuwJaar} onChange={(e) => setNieuwJaar(e.target.value)} />
      </div>
      <button type="submit" className="btn btn-primary">Meting aanmaken</button>
      {fout && <div className="alert alert-warning" role="alert">{fout}</div>}
      {aangemaakt !== null && (
        <p className="nieuwe-meting-klaar" role="status">
          Meting {aangemaakt} is aangemaakt. <Link href={`/metingen/${aangemaakt}`}>Openen</Link>
        </p>
      )}
    </form>
  );
}
