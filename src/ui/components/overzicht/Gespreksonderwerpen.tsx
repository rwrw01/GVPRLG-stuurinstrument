import type { Gespreksonderwerp } from './_overzichtTypen';

const ICOON: Record<Gespreksonderwerp['soort'], { teken: string; klasse: string }> = {
  daling: { teken: '▼', klasse: 'verschil-neer' },
  concept: { teken: '◐', klasse: 'verschil-gelijk' },
  'niet-gestart': { teken: '○', klasse: 'verschil-gelijk' },
  stijging: { teken: '▲', klasse: 'verschil-op' },
};

/**
 * Up to four talking points derived from the figures, each with an icon and text.
 * @param props.onderwerpen - Talking points from the overview
 * @returns the list, or a short sentence when there is nothing to discuss
 */
export function Gespreksonderwerpen({ onderwerpen }: { onderwerpen: Gespreksonderwerp[] }) {
  if (onderwerpen.length === 0) return <p>Er zijn nu geen gespreksonderwerpen uit de cijfers.</p>;
  return (
    <ul className="onderwerpen">
      {onderwerpen.map((o) => (
        <li key={o.soort}>
          <span className={`onderwerp-icoon ${ICOON[o.soort].klasse}`} aria-hidden="true">{ICOON[o.soort].teken}</span>
          <div>
            <strong>{o.titel}</strong>
            <span>{o.toelichting}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
