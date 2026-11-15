'use client';

import { useJaarPlatformen } from './_jaarPlatformen';

/**
 * Checkbox group with one checkbox per platform that takes part in the chosen year, with its
 * business units for information.
 * @param props.gekozen - Currently selected platform ids
 * @param props.onChange - Receives the new selection
 * @param props.idPrefix - Prefix that keeps checkbox ids unique on the page
 * @returns a fieldset with the platform checkboxes
 */
export function PlatformKeuze({ gekozen, onChange, idPrefix }: { gekozen: string[]; onChange: (ids: string[]) => void; idPrefix: string }) {
  const platformen = useJaarPlatformen();
  function wissel(id: string) {
    onChange(gekozen.includes(id) ? gekozen.filter((g) => g !== id) : [...gekozen, id]);
  }

  return (
    <fieldset className="platform-keuze">
      <legend>Platformen</legend>
      {platformen.length === 0 && <p>Er doen in dit meetjaar geen platformen mee.</p>}
      {platformen.map((p) => (
        <label key={p.id} htmlFor={`${idPrefix}-${p.id}`}>
          <input id={`${idPrefix}-${p.id}`} type="checkbox" checked={gekozen.includes(p.id)} onChange={() => wissel(p.id)} />
          {p.naam}
          {p.businessUnits.length > 0 && <span className="platform-keuze-units"> (businessunits: {p.businessUnits.join(', ')})</span>}
        </label>
      ))}
    </fieldset>
  );
}
