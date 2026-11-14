'use client';

import { Overzicht } from '@/src/ui/components/overzicht/Overzicht';
import { useOverzicht } from '@/src/ui/hooks/useOverzicht';

export default function HomePage() {
  const { staat } = useOverzicht();
  if (staat.status === 'laden') return <p>Laden...</p>;
  if (staat.status === 'fout') return <div className="alert alert-warning" role="alert">{staat.melding}</div>;
  return <Overzicht data={staat.overzicht} />;
}
