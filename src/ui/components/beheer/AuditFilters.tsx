'use client';

import { useState, type FormEvent } from 'react';
import { useCatalogus } from '@/src/ui/hooks/useCatalogus';
import { AUDIT_ACTIES } from './_beheerTypen';

/** Filter values as typed; empty strings mean "no filter". */
export interface AuditFilterWaarden {
  jaar: string;
  platformId: string;
  actor: string;
  actie: string;
  limiet: string;
}

/** Initial filter: everything, at most 200 rows (the API default). */
export const LEEG_FILTER: AuditFilterWaarden = { jaar: '', platformId: '', actor: '', actie: '', limiet: '200' };

function Keuze(props: { id: string; label: string; waarde: string; opties: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="form-group">
      <label htmlFor={props.id}>{props.label}</label>
      <select id={props.id} value={props.waarde} onChange={(e) => props.onChange(e.target.value)}>
        <option value="">Alle</option>
        {props.opties.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

/**
 * Filter form for the audit log.
 * @param props.jaren - Measurement years to offer
 * @param props.onZoek - Receives the filter values on submit
 * @returns the filter form
 */
export function AuditFilters({ jaren, onZoek }: { jaren: number[]; onZoek: (filter: AuditFilterWaarden) => void }) {
  const [f, setF] = useState<AuditFilterWaarden>(LEEG_FILTER);
  // Every platform that ever existed, removed ones included, so old rows stay findable.
  const { staat } = useCatalogus();
  const platformen = staat.status === 'ok' ? staat.catalogus.platformen : [];
  const zet = (veld: keyof AuditFilterWaarden) => (waarde: string) => setF((oud) => ({ ...oud, [veld]: waarde }));

  function verstuur(event: FormEvent) {
    event.preventDefault();
    onZoek(f);
  }

  return (
    <form className="card audit-filters" onSubmit={verstuur} aria-label="Auditfilters">
      <Keuze id="audit-jaar" label="Meetjaar" waarde={f.jaar} onChange={zet('jaar')} opties={jaren.map((j) => ({ value: String(j), label: String(j) }))} />
      <Keuze id="audit-platform" label="Platform" waarde={f.platformId} onChange={zet('platformId')} opties={platformen.map((p) => ({ value: p.id, label: p.vervallen ? `${p.naam} (vervallen)` : p.naam }))} />
      <div className="form-group">
        <label htmlFor="audit-actor">Actor</label>
        <input id="audit-actor" maxLength={64} value={f.actor} onChange={(e) => zet('actor')(e.target.value)} />
      </div>
      <Keuze id="audit-actie" label="Actie" waarde={f.actie} onChange={zet('actie')} opties={AUDIT_ACTIES.map((a) => ({ value: a, label: a }))} />
      <div className="form-group">
        <label htmlFor="audit-limiet">Limiet</label>
        <input id="audit-limiet" type="number" min={1} max={500} value={f.limiet} onChange={(e) => zet('limiet')(e.target.value)} />
      </div>
      <button type="submit" className="btn btn-primary">Zoeken</button>
    </form>
  );
}
