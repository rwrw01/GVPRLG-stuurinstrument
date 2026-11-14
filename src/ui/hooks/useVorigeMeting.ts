'use client';

import { useEffect, useState } from 'react';

import type { PlatformScoresByAs } from '@/src/service/scores';
import { useJaren } from '@/src/ui/hooks/useJaren';

/** The measurement year before the current one, with its stored platform rows. */
export interface VorigeMeting {
  jaar: number;
  platformen: Record<string, { status: string; scoresPerAs: PlatformScoresByAs }>;
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
    fetch(`/api/metingen/${vorig}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { meting: VorigeMeting } | null) => {
        if (actief && body) setMeting({ jaar: body.meting.jaar, platformen: body.meting.platformen });
      })
      .catch(() => undefined);
    return () => {
      actief = false;
    };
  }, [vorig]);

  return meting;
}
