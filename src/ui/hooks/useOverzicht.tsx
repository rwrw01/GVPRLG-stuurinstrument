'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import type { Overzicht } from '@/src/ui/components/overzicht/_overzichtTypen';

/** Loading state of the overview shared by the side menu and the start screen. */
export type OverzichtStaat =
  | { status: 'laden' }
  | { status: 'fout'; melding: string }
  | { status: 'ok'; overzicht: Overzicht };

interface OverzichtContextWaarde {
  staat: OverzichtStaat;
  herlaad: () => void;
}

const OverzichtContext = createContext<OverzichtContextWaarde>({ staat: { status: 'laden' }, herlaad: () => undefined });

async function laadOverzicht(): Promise<OverzichtStaat> {
  try {
    const response = await fetch('/api/overzicht');
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = typeof body === 'object' && body !== null && 'detail' in body ? String(body.detail) : null;
      return { status: 'fout', melding: detail ?? 'Kon het overzicht niet laden.' };
    }
    return { status: 'ok', overzicht: body as Overzicht };
  } catch {
    return { status: 'fout', melding: 'Kon het overzicht niet laden.' };
  }
}

/**
 * Provides `GET /api/overzicht` to the side menu and the start screen; reloads whenever `sleutel`
 * changes (the shell passes the path, so progress labels follow navigation) or on `herlaad()`.
 * @param props.sleutel - Value whose change triggers a reload
 * @param props.actief - False on pages without a session, where nothing is fetched
 * @param props.children - The app
 * @returns the provider
 */
export function OverzichtProvider({ sleutel, actief, children }: { sleutel: string; actief: boolean; children: ReactNode }) {
  const [staat, setStaat] = useState<OverzichtStaat>({ status: 'laden' });
  const [versie, setVersie] = useState(0);
  const herlaad = useCallback(() => setVersie((v) => v + 1), []);

  useEffect(() => {
    if (!actief) return;
    let geldig = true;
    void laadOverzicht().then((nieuw) => {
      if (geldig) setStaat(nieuw);
    });
    return () => {
      geldig = false;
    };
  }, [sleutel, actief, versie]);

  return <OverzichtContext.Provider value={{ staat, herlaad }}>{children}</OverzichtContext.Provider>;
}

/**
 * The shared overview and a function to reload it (e.g. after creating a meting).
 * @returns the loading state and `herlaad`
 */
export function useOverzicht(): OverzichtContextWaarde {
  return useContext(OverzichtContext);
}
