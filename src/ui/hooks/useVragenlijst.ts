'use client';

import { useEffect, useState } from 'react';

import type { UiVragenlijst } from '@/src/ui/components/_vragenlijstTypen';

/** Loading state of the questionnaire of one year. */
export type VragenlijstStaat =
  | { status: 'laden' }
  | { status: 'fout'; melding: string }
  | { status: 'ok'; lijst: UiVragenlijst };

/**
 * Loads the questionnaire of one year from `GET /api/metingen/{jaar}/vragenlijst` (frozen copy or
 * the current catalogue). Reloads when `jaar` or `versie` changes.
 * @param jaar - Measurement year, or null to load nothing (state stays `laden`)
 * @param versie - Bump to reload, e.g. after a catalogue change
 * @returns the loading state
 */
export function useVragenlijst(jaar: number | string | null, versie = 0): VragenlijstStaat {
  const [staat, setStaat] = useState<VragenlijstStaat>({ status: 'laden' });
  useEffect(() => {
    setStaat({ status: 'laden' });
    if (jaar === null) return;
    let actief = true;
    fetch(`/api/metingen/${jaar}/vragenlijst`)
      .then(async (response) => {
        const body: unknown = await response.json().catch(() => null);
        if (!actief) return;
        if (!response.ok) {
          const detail = typeof body === 'object' && body !== null && 'detail' in body ? String(body.detail) : null;
          setStaat({ status: 'fout', melding: detail ?? 'Kon de vragenlijst niet laden.' });
          return;
        }
        setStaat({ status: 'ok', lijst: (body as { vragenlijst: UiVragenlijst }).vragenlijst });
      })
      .catch(() => actief && setStaat({ status: 'fout', melding: 'Kon de vragenlijst niet laden.' }));
    return () => {
      actief = false;
    };
  }, [jaar, versie]);
  return staat;
}
