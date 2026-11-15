'use client';

import { useEffect, useState } from 'react';

import type { UiVragenlijst } from '@/src/ui/components/_vragenlijstTypen';
import { useJaren } from '@/src/ui/hooks/useJaren';

/** The measurement year before the current one, with its stored business unit rows and its list. */
export interface VorigeMeting {
  jaar: number;
  lijst: UiVragenlijst;
  businessUnits: Record<string, { status: string; scoresPerAs: Record<string, Record<string, number | null>> }>;
}

/**
 * Loads the previous measurement year (the nearest existing year before `jaar`), used to draw it
 * as a grey dashed line in the spinnenweb.
 * @param jaar - The year being shown
 * @returns the previous meting, or null while loading, on error or when there is none
 */
export function useVorigeMeting(jaar: number): VorigeMeting | null {
  const jaren = useJaren();
  const vorig = jaren?.filter((j) => j < jaar).at(-1) ?? null;
  const [meting, setMeting] = useState<VorigeMeting | null>(null);

  useEffect(() => {
    setMeting(null);
    if (vorig === null) return;
    let actief = true;
    const json = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : null));
    Promise.all([json(`/api/metingen/${vorig}`), json(`/api/metingen/${vorig}/vragenlijst`)])
      .then(([body, lijst]: [{ meting: VorigeMeting } | null, { vragenlijst: UiVragenlijst } | null]) => {
        if (actief && body && lijst) setMeting({ jaar: body.meting.jaar, lijst: lijst.vragenlijst, businessUnits: body.meting.businessUnits });
      })
      .catch(() => undefined);
    return () => {
      actief = false;
    };
  }, [vorig]);

  return meting;
}
