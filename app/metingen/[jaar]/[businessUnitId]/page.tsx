'use client';

import { useParams } from 'next/navigation';

import { InvulFormulier } from '@/src/ui/components/InvulFormulier';
import type { UiAlleenLezenReden } from '@/src/ui/components/_vragenlijstTypen';
import { useBusinessUnit } from '@/src/ui/hooks/useBusinessUnit';

/** Explanation per read-only reason the server gives. */
const ALLEEN_LEZEN_UITLEG: Record<UiAlleenLezenReden, string> = {
  'rol-lezer': 'U heeft alleen leesrechten; u kunt deze vragenlijst bekijken maar niet wijzigen.',
  'geen-koppeling': 'U bent niet gekoppeld aan dit platform; u kunt deze vragenlijst alleen bekijken.',
};

export default function InvulformulierPage() {
  const params = useParams<{ jaar: string; businessUnitId: string }>();
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
  // UI only: `magBewerken` and its reason come from the server by the same rule as the write check,
  // which still refuses every write that is not allowed.
  const alleenLezen = !staat.magBewerken;
  const uitleg = staat.alleenLezenReden && ALLEEN_LEZEN_UITLEG[staat.alleenLezenReden];
  return (
    <div>
      <h2>{staat.unit.naam} — Meting {params.jaar}</h2>
      {alleenLezen && uitleg && <div className="alert alert-info" role="status">{uitleg}</div>}
      <InvulFormulier key={`${params.jaar}-${staat.unit.id}`} jaar={params.jaar} lijst={staat.lijst} unit={staat.unit} rij={staat.rij} alleenLezen={alleenLezen} />
    </div>
  );
}
