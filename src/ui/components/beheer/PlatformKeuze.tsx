'use client';

import { CONFIG } from '@/src/service/config';

/**
 * Checkbox group with one checkbox per platform.
 * @param props.gekozen - Currently selected platform ids
 * @param props.onChange - Receives the new selection
 * @param props.idPrefix - Prefix that keeps checkbox ids unique on the page
 * @returns a fieldset with the platform checkboxes
 */
export function PlatformKeuze({ gekozen, onChange, idPrefix }: { gekozen: string[]; onChange: (ids: string[]) => void; idPrefix: string }) {
  function wissel(id: string) {
    onChange(gekozen.includes(id) ? gekozen.filter((g) => g !== id) : [...gekozen, id]);
  }

  return (
    <fieldset className="platform-keuze">
      <legend>Platformen</legend>
      {CONFIG.platformen.map((p) => (
        <label key={p.id} htmlFor={`${idPrefix}-${p.id}`}>
          <input id={`${idPrefix}-${p.id}`} type="checkbox" checked={gekozen.includes(p.id)} onChange={() => wissel(p.id)} />
          {p.naam}
        </label>
      ))}
    </fieldset>
  );
}
