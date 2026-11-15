'use client';

import { useState, type ReactNode } from 'react';

import { useCatalogus } from '@/src/ui/hooks/useCatalogus';
import { useIk } from '@/src/ui/hooks/useIk';
import { useOverzicht } from '@/src/ui/hooks/useOverzicht';

import type { CatalogusData } from './_catalogusTypen';

interface Props {
  titel: string;
  uitleg: string;
  children: (data: CatalogusData, beheerder: boolean, onGewijzigd: (fout: string | null) => void) => ReactNode;
}

/**
 * Frame of a beheer page on the catalogue: heading, the server message after a refused change,
 * and a reload (also of the side menu) after every change. Every active user can read it.
 * @param props.titel - Page heading
 * @param props.uitleg - Short explanation under the heading
 * @param props.children - Renders the table with the data, the beheerder flag and the change handler
 * @returns the page
 */
export function CatalogusPagina({ titel, uitleg, children }: Props) {
  const { ik } = useIk();
  const { staat, herlaad } = useCatalogus();
  const { herlaad: herlaadOverzicht } = useOverzicht();
  const [fout, setFout] = useState<string | null>(null);
  const beheerder = ik?.rol === 'beheerder';
  const onGewijzigd = (melding: string | null) => {
    setFout(melding);
    herlaad();
    herlaadOverzicht();
  };
  return (
    <div>
      <h2>{titel}</h2>
      <p>{uitleg}{beheerder ? '' : ' Alleen een beheerder kan wijzigen.'}</p>
      {fout && <div className="alert alert-warning" role="alert">{fout}</div>}
      {staat.status === 'laden' && <p>Laden...</p>}
      {staat.status === 'fout' && <div className="alert alert-warning" role="alert">{staat.melding}</div>}
      {staat.status === 'ok' && children(staat.catalogus, beheerder, onGewijzigd)}
    </div>
  );
}
