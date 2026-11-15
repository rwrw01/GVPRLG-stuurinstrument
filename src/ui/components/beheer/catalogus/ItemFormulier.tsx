'use client';

import { useState, type FormEvent } from 'react';

/** One field of the add/edit form. */
export interface Veld {
  sleutel: string;
  label: string;
  soort: 'tekst' | 'lang' | 'keuze';
  opties?: Array<{ value: string; label: string }>;
  maxLength?: number;
  hint?: string;
  verplicht?: boolean;
}

interface ItemFormulierProps {
  titel: string;
  idPrefix: string;
  velden: Veld[];
  begin: Record<string, string>;
  knop: string;
  onOpslaan: (waarden: Record<string, string>) => Promise<string | null>;
  onAnnuleren: () => void;
}

function Invoer({ veld, id, waarde, onChange }: { veld: Veld; id: string; waarde: string; onChange: (v: string) => void }) {
  const gemeen = { id, value: waarde, required: veld.verplicht, 'aria-describedby': veld.hint ? `${id}-hint` : undefined };
  if (veld.soort === 'keuze') {
    return (
      <select {...gemeen} onChange={(e) => onChange(e.target.value)}>
        {veld.opties?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  if (veld.soort === 'lang') return <textarea {...gemeen} maxLength={veld.maxLength} onChange={(e) => onChange(e.target.value)} />;
  return <input {...gemeen} maxLength={veld.maxLength} onChange={(e) => onChange(e.target.value)} />;
}

/**
 * Inline form to add or change one catalogue item; the server's Dutch message is shown on refusal.
 * @param props.titel - Heading and accessible name of the form
 * @param props.idPrefix - Keeps field ids unique on the page
 * @param props.velden - The fields
 * @param props.begin - Initial values per field
 * @param props.knop - Text of the submit button
 * @param props.onOpslaan - Sends the values; resolves to an error message or null on success
 * @param props.onAnnuleren - Closes the form
 * @returns the form
 */
export function ItemFormulier({ titel, idPrefix, velden, begin, knop, onOpslaan, onAnnuleren }: ItemFormulierProps) {
  const [waarden, setWaarden] = useState(begin);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  async function verstuur(event: FormEvent) {
    event.preventDefault();
    setBezig(true);
    const melding = await onOpslaan(waarden);
    setBezig(false);
    setFout(melding);
  }

  return (
    <form className="catalogus-formulier" aria-label={titel} onSubmit={verstuur}>
      <h4>{titel}</h4>
      {velden.map((v) => (
        <div className="form-group" key={v.sleutel}>
          <label htmlFor={`${idPrefix}-${v.sleutel}`}>{v.label}</label>
          {v.hint && <p className="veld-hint" id={`${idPrefix}-${v.sleutel}-hint`}>{v.hint}</p>}
          <Invoer veld={v} id={`${idPrefix}-${v.sleutel}`} waarde={waarden[v.sleutel] ?? ''} onChange={(w) => setWaarden((oud) => ({ ...oud, [v.sleutel]: w }))} />
        </div>
      ))}
      {fout && <div className="alert alert-warning" role="alert">{fout}</div>}
      <div className="btn-group">
        <button type="submit" className="btn btn-primary" disabled={bezig}>{knop}</button>
        <button type="button" className="btn btn-outline" onClick={onAnnuleren}>Annuleren</button>
      </div>
    </form>
  );
}
