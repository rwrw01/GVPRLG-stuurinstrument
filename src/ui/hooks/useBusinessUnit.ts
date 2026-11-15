'use client';

import { useEffect, useState } from 'react';

import type { UiBusinessUnit, UiBusinessUnitRij, UiVragenlijst } from '@/src/ui/components/_vragenlijstTypen';

/** Loading state of one business unit of a year with the year's list. */
export type BusinessUnitStaat =
  | { status: 'laden' }
  | { status: 'fout'; melding: string }
  | { status: 'ok'; lijst: UiVragenlijst; unit: UiBusinessUnit; rij: UiBusinessUnitRij | null };

async function haal<T>(url: string): Promise<{ ok: true; body: T } | { ok: false; melding: string }> {
  const response = await fetch(url);
  const body: unknown = await response.json().catch(() => null);
  if (response.ok) return { ok: true, body: body as T };
  const detail = typeof body === 'object' && body !== null && 'detail' in body ? String(body.detail) : null;
  return { ok: false, melding: detail ?? 'Onbekende fout bij het laden van deze businessunit.' };
}

/**
 * Loads the row of one business unit and the questionnaire of its year. Responses of a superseded
 * run (StrictMode double effect, fast navigation) are ignored.
 * @param jaar - Year from the URL
 * @param businessUnitId - Business unit id from the URL
 * @param versie - Bump to reload (e.g. after reopening)
 * @returns the loading state
 */
export function useBusinessUnit(jaar: string, businessUnitId: string, versie = 0): BusinessUnitStaat {
  const [staat, setStaat] = useState<BusinessUnitStaat>({ status: 'laden' });
  useEffect(() => {
    let actief = true;
    setStaat({ status: 'laden' });
    Promise.all([
      haal<{ businessUnit: UiBusinessUnitRij | null; unit: UiBusinessUnit }>(`/api/metingen/${jaar}/businessunits/${businessUnitId}`),
      haal<{ vragenlijst: UiVragenlijst }>(`/api/metingen/${jaar}/vragenlijst`),
    ])
      .then(([rij, lijst]) => {
        if (!actief) return;
        if (!rij.ok) return setStaat({ status: 'fout', melding: rij.melding });
        if (!lijst.ok) return setStaat({ status: 'fout', melding: lijst.melding });
        setStaat({ status: 'ok', lijst: lijst.body.vragenlijst, unit: rij.body.unit, rij: rij.body.businessUnit });
      })
      .catch(() => actief && setStaat({ status: 'fout', melding: 'Kon deze businessunit niet laden.' }));
    return () => {
      actief = false;
    };
  }, [jaar, businessUnitId, versie]);
  return staat;
}
