'use client';

import { BusinessUnitsBeheer } from '@/src/ui/components/beheer/catalogus/BusinessUnitsBeheer';
import { CatalogusPagina } from '@/src/ui/components/beheer/catalogus/CatalogusPagina';

export default function BusinessUnitsPagina() {
  return (
    <CatalogusPagina titel="Businessunits" uitleg="De gebruikersplatformen met de businessunits die zij beoordelen. Elke businessunit krijgt per meetjaar een eigen vragenlijst.">
      {(data, beheerder, onGewijzigd) => <BusinessUnitsBeheer data={data} beheerder={beheerder} onGewijzigd={onGewijzigd} />}
    </CatalogusPagina>
  );
}
