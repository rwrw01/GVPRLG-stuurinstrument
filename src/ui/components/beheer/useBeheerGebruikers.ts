'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { verstuurJson } from '../_verstuurJson';
import type { BeheerGebruiker } from './_beheerTypen';
import { haalGebruikers, maakBeheerActies } from './_beheerActies';

/**
 * State of the user administration for the chosen year. The rows are stored with their year and
 * only returned for the chosen year; the year lives in a ref as well, so every (re)load can drop
 * an answer for a year that is no longer chosen.
 * @param beginJaar - Year to open on
 * @returns the chosen year, a setter, the rows of that year, the page error and the actions
 */
export function useBeheerGebruikers(beginJaar: number) {
  const [jaar, setJaar] = useState(beginJaar);
  const jaarRef = useRef(beginJaar);
  const [rijen, setRijen] = useState<{ jaar: number; gebruikers: BeheerGebruiker[] }>({ jaar: beginJaar, gebruikers: [] });
  const [fout, setFout] = useState<string | null>(null);

  const acties = useMemo(
    () => maakBeheerActies({
      actueelJaar: () => jaarRef.current,
      haal: haalGebruikers,
      verstuur: verstuurJson,
      zetGebruikers: (j, gebruikers) => setRijen({ jaar: j, gebruikers }),
      zetFout: setFout,
    }),
    [],
  );

  useEffect(() => {
    void acties.laad(jaar);
  }, [acties, jaar]);

  function kiesJaar(j: number) {
    jaarRef.current = j;
    setFout(null);
    setJaar(j);
  }

  return { jaar, kiesJaar, gebruikers: rijen.jaar === jaar ? rijen.gebruikers : [], fout, acties };
}
