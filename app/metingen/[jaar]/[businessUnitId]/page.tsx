'use client';

import { useParams } from 'next/navigation';

import { InvulFormulier } from '@/src/ui/components/InvulFormulier';
import { useBusinessUnit } from '@/src/ui/hooks/useBusinessUnit';
import { useIk } from '@/src/ui/hooks/useIk';

/**
 * Why the form is read-only: a lezer has read rights only, anyone else is not assigned to the platform.
 * @param rol - Role of the user, undefined when /api/ik failed
 * @returns the explanation
 */
function alleenLezenUitleg(rol: string | undefined): string {
  return rol === 'lezer'
    ? 'Je hebt alleen leesrechten. Wijzigingen opslaan is niet mogelijk.'
    : 'U bent niet gekoppeld aan dit platform; u kunt deze vragenlijst alleen bekijken.';
}

export default function InvulformulierPage() {
  const params = useParams<{ jaar: string; businessUnitId: string }>();
  const { ik, laden: ikLaden } = useIk();
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
  // UI only: `magBewerken` comes from the server by the same rule as the write check, which still
  // refuses every write that is not allowed.
  const alleenLezen = !staat.magBewerken;
  return (
    <div>
      <h2>{staat.unit.naam} — Meting {params.jaar}</h2>
      {alleenLezen && !ikLaden && <div className="alert alert-info" role="status">{alleenLezenUitleg(ik?.rol)}</div>}
      <InvulFormulier key={`${params.jaar}-${staat.unit.id}`} jaar={params.jaar} lijst={staat.lijst} unit={staat.unit} rij={staat.rij} alleenLezen={alleenLezen} />
    </div>
  );
}
