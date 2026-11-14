import { radarPolygoon, radarPunt } from './_radarGeometrie';

export interface SpinnenwebSerie {
  label: string;
  waarden: Array<number | null>;
  kleur: string;
  gestippeld?: boolean;
  /** False draws only the outline (e.g. the previous year); default true. */
  vulling?: boolean;
}

export interface Spaak {
  label: string;
  kleur: string;
}

interface SpinnenwebProps {
  spaken: Spaak[];
  series: SpinnenwebSerie[];
  titel: string;
  grootte?: number;
  toonLabels?: boolean;
  groepen?: Spaak[];
}

const MAX = 5;

function Legenda({ items, swatch }: { items: Spaak[]; swatch: boolean }) {
  return (
    <figcaption className="spinnenweb-legenda">
      {items.map((s) => (
        <span key={s.label} style={swatch ? undefined : { color: s.kleur, fontWeight: 600 }}>
          {swatch && <span className="spinnenweb-swatch" style={{ background: s.kleur }} aria-hidden="true" />}
          {s.label}
        </span>
      ))}
    </figcaption>
  );
}

/**
 * Radar ("spinnenweb") chart as inline SVG, scale 0-5, one polygon per series.
 * @param props spokes, series to draw, accessible title, size, label and legend options
 * @returns the chart as a figure with optional legends
 */
export function Spinnenweb({ spaken, series, titel, grootte = 320, toonLabels = true, groepen }: SpinnenwebProps) {
  const midden = grootte / 2;
  const straal = grootte / 2 - 8;
  const schaal = { max: MAX, straal, midden };
  const padX = toonLabels ? 150 : 8;
  const padY = toonLabels ? 28 : 8;
  const samenvatting = series
    .map((s) => `${s.label}: ${spaken.map((a, i) => `${a.label} ${s.waarden[i]?.toFixed(1) ?? 'geen score'}`).join(', ')}`)
    .join('; ');

  return (
    <figure className="spinnenweb" style={{ maxWidth: grootte + 2 * padX }}>
      <svg viewBox={`${-padX} ${-padY} ${grootte + 2 * padX} ${grootte + 2 * padY}`} role="img" aria-label={`${titel}. ${samenvatting}`}>
        <title>{titel}</title>
        {[1, 2, 3, 4, 5].map((ring) => (
          <polygon key={ring} className="spinnenweb-ring" points={radarPolygoon(spaken.map(() => ring), schaal)} />
        ))}
        {spaken.map((spaak, index) => {
          const buiten = radarPunt({ ...schaal, index, aantalAssen: spaken.length, waarde: MAX });
          const label = radarPunt({ ...schaal, straal: straal + 12, index, aantalAssen: spaken.length, waarde: MAX });
          const anker = Math.abs(label.x - midden) < 2 ? 'middle' : label.x > midden ? 'start' : 'end';
          return (
            <g key={spaak.label}>
              <line x1={midden} y1={midden} x2={buiten.x} y2={buiten.y} stroke={spaak.kleur} strokeOpacity={0.35} />
              {toonLabels && (
                <text className="spinnenweb-label" x={label.x} y={label.y} textAnchor={anker} dominantBaseline="middle" fill={spaak.kleur}>{spaak.label}</text>
              )}
            </g>
          );
        })}
        {toonLabels && [1, 2, 3, 4].map((ring) => (
          <text key={ring} className="spinnenweb-tick" x={midden + 3} y={midden - (straal * ring) / MAX - 2}>{ring}</text>
        ))}
        {series.map((s) => (
          <polygon key={s.label} points={radarPolygoon(s.waarden, schaal)} fill={s.vulling === false ? 'none' : s.kleur}
            fillOpacity={0.18} stroke={s.kleur} strokeWidth={s.vulling === false ? 1.5 : 2} strokeLinejoin="round"
            strokeDasharray={s.gestippeld ? '5 4' : undefined} />
        ))}
      </svg>
      {groepen && <Legenda items={groepen} swatch={false} />}
      {series.length > 1 && <Legenda items={series} swatch />}
    </figure>
  );
}
