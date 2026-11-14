'use client';

import { useEffect, useState } from 'react';

import { bepaalRedirect } from './_ikRedirect';

/** The logged-in user as returned by `GET /api/ik`. */
export interface Ik {
  id: string;
  naam: string;
  email: string;
  rol: 'invuller' | 'beheerder' | 'lezer';
}

/**
 * Fetches the logged-in user once. Only used to show or hide UI; the server enforces access.
 * On 401 it navigates to the login page and on 403 to `/geen-toegang` (not from those pages).
 * @returns `ik` (null when not logged in or on error) and `laden` while the request runs
 */
export function useIk(): { ik: Ik | null; laden: boolean } {
  const [ik, setIk] = useState<Ik | null>(null);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    let actief = true;
    fetch('/api/ik')
      .then(async (response) => {
        // A cookie that no longer grants access (revoked user, rotated secret): leave the page.
        const doel = bepaalRedirect(response.status, window.location.pathname, window.location.search);
        if (doel !== null) window.location.assign(doel);
        return response.ok ? ((await response.json()) as Ik) : null;
      })
      .catch(() => null)
      .then((data) => {
        if (!actief) return;
        setIk(data);
        setLaden(false);
      });
    return () => {
      actief = false;
    };
  }, []);

  return { ik, laden };
}
