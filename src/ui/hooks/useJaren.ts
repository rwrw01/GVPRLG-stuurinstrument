'use client';

import { useEffect, useState } from 'react';

/**
 * Loads the measurement years once from `GET /api/metingen`.
 * @returns the years, oldest first (empty on error), or null while loading
 */
export function useJaren(): number[] | null {
  const [jaren, setJaren] = useState<number[] | null>(null);
  useEffect(() => {
    let actief = true;
    fetch('/api/metingen')
      .then((r) => (r.ok ? r.json() : { metingen: [] }))
      .then((data: { metingen: { jaar: number }[] }) => data.metingen.map((m) => m.jaar).sort((a, b) => a - b))
      .catch(() => [])
      .then((lijst) => {
        if (actief) setJaren(lijst);
      });
    return () => {
      actief = false;
    };
  }, []);
  return jaren;
}
