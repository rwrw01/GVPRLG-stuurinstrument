'use client';

import { useCallback, useEffect, useState } from 'react';

import type { CatalogusData } from '@/src/ui/components/beheer/catalogus/_catalogusTypen';

/** Loading state of the full catalogue. */
export type CatalogusStaat =
  | { status: 'laden' }
  | { status: 'fout'; melding: string }
  | { status: 'ok'; catalogus: CatalogusData };

/**
 * Loads `GET /api/beheer/catalogus` (all items, removed ones included, and the year states).
 * @returns the loading state and `herlaad` to fetch again after a change
 */
export function useCatalogus(): { staat: CatalogusStaat; herlaad: () => void } {
  const [staat, setStaat] = useState<CatalogusStaat>({ status: 'laden' });
  const [versie, setVersie] = useState(0);
  const herlaad = useCallback(() => setVersie((v) => v + 1), []);
  useEffect(() => {
    let actief = true;
    fetch('/api/beheer/catalogus')
      .then(async (response) => {
        const body: unknown = await response.json().catch(() => null);
        if (!actief) return;
        if (!response.ok) return setStaat({ status: 'fout', melding: 'Kon de vragenlijst niet laden.' });
        setStaat({ status: 'ok', catalogus: body as CatalogusData });
      })
      .catch(() => actief && setStaat({ status: 'fout', melding: 'Kon de vragenlijst niet laden.' }));
    return () => {
      actief = false;
    };
  }, [versie]);
  return { staat, herlaad };
}
