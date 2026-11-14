'use client';

import { useState } from 'react';

import { GebruikersBeheer } from '@/src/ui/components/beheer/GebruikersBeheer';
import { NieuweMetingForm } from '@/src/ui/components/beheer/NieuweMetingForm';
import { useIk } from '@/src/ui/hooks/useIk';
import { useOverzicht } from '@/src/ui/hooks/useOverzicht';

export default function BeheerPage() {
  const { ik, laden } = useIk();
  const { herlaad } = useOverzicht();
  // Bumped after a new meting so the year choice of the user table includes it.
  const [versie, setVersie] = useState(0);
  if (laden) return <p>Laden...</p>;
  // Only a friendlier message; /api/beheer/* and POST /api/metingen answer 403 to non-beheerders anyway.
  if (ik?.rol !== 'beheerder') {
    return <div className="alert alert-warning" role="alert">Alleen beheerders kunnen deze pagina gebruiken.</div>;
  }
  return (
    <>
      <GebruikersBeheer key={versie} />
      <NieuweMetingForm
        onAangemaakt={() => {
          herlaad();
          setVersie((v) => v + 1);
        }}
      />
    </>
  );
}
