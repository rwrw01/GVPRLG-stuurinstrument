'use client';

import { GebruikersBeheer } from '@/src/ui/components/beheer/GebruikersBeheer';
import { useIk } from '@/src/ui/hooks/useIk';

export default function BeheerPage() {
  const { ik, laden } = useIk();
  if (laden) return <p>Laden...</p>;
  // Only a friendlier message; /api/beheer/* answers 403 to non-beheerders anyway.
  if (ik?.rol !== 'beheerder') {
    return <div className="alert alert-warning" role="alert">Alleen beheerders kunnen deze pagina gebruiken.</div>;
  }
  return <GebruikersBeheer />;
}
