'use client';

import { useEffect, useState } from 'react';

/** The logged-in user as returned by `GET /api/ik`. */
export interface Ik {
  id: string;
  naam: string;
  email: string;
  rol: 'invuller' | 'beheerder';
}

/**
 * Fetches the logged-in user once. Only used to show or hide UI; the server enforces access.
 * @returns `ik` (null when not logged in or on error) and `laden` while the request runs
 */
export function useIk(): { ik: Ik | null; laden: boolean } {
  const [ik, setIk] = useState<Ik | null>(null);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    let actief = true;
    fetch('/api/ik')
      .then(async (response) => (response.ok ? ((await response.json()) as Ik) : null))
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
