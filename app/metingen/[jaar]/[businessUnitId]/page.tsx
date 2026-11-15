'use client';

import { useParams } from 'next/navigation';

import { InvulFormulier } from '@/src/ui/components/InvulFormulier';
import { useBusinessUnit } from '@/src/ui/hooks/useBusinessUnit';
import { useIk } from '@/src/ui/hooks/useIk';

export default function InvulformulierPage() {
  const params = useParams<{ jaar: string; businessUnitId: string }>();
  const { ik, laden: ikLaden } = useIk();
  // UI only (the server refuses every write of a lezer with 403 alleen-lezen): the form stays
  // read-only until the role is known, and for a lezer or when /api/ik failed.
  const alleenLezen = ikLaden || ik === null || ik.rol === 'lezer';
  const staat = useBusinessUnit(params.jaar, params.businessUnitId);

  if (staat.status === 'laden') return <p>Laden...</p>;
  if (staat.status === 'fout') {
    return (
      <div>
        <h2>Meting {params.jaar}</h2>
        <div className="alert alert-warning" role="alert">{staat.melding}</div>
      </div>
    );
  }
  return (
    <div>
      <h2>{staat.unit.naam} — Meting {params.jaar}</h2>
      {ik?.rol === 'lezer' && <div className="alert alert-info" role="status">Je hebt alleen leesrechten. Wijzigingen opslaan is niet mogelijk.</div>}
      <InvulFormulier key={`${params.jaar}-${staat.unit.id}`} jaar={params.jaar} lijst={staat.lijst} unit={staat.unit} rij={staat.rij} alleenLezen={alleenLezen} />
    </div>
  );
}
