'use client';

import { CatalogusPagina } from '@/src/ui/components/beheer/catalogus/CatalogusPagina';
import { VragenlijstBeheer } from '@/src/ui/components/beheer/catalogus/VragenlijstBeheer';

export default function VragenlijstPagina() {
  return (
    <CatalogusPagina titel="Vragenlijst" uitleg="De assen met hun vragen. De volgorde bepaalt de spaken van het spinnenweb.">
      {(data, beheerder, onGewijzigd) => <VragenlijstBeheer data={data} beheerder={beheerder} onGewijzigd={onGewijzigd} />}
    </CatalogusPagina>
  );
}
