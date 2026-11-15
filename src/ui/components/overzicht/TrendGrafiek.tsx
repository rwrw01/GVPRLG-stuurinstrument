'use client';

import { useState, type KeyboardEvent } from 'react';

import { nl } from './_formatteer';
import type { JaarCijfers, OverzichtBusinessUnit } from './_overzichtTypen';
import { bouwTrend, MAAT, verbonden, xVoor, yVoor, type TrendLijn, type TrendPunt } from './_trendGeometrie';

/**
 * Accessible and tooltip text of a point.
 * @param punt - The point
 * @param naam - Business unit name
 * @returns e.g. "Belastingen, 2025: 3,3 (concept)"
 */
function puntTekst(punt: TrendPunt, naam: string): string {
  return `${naam}, ${punt.jaar}: ${nl(punt.waarde)}${punt.status === 'concept' ? ' (concept)' : ''}`;
}

/**
 * Grid lines, the 1-5 axis and the year labels.
 * @param props.jaren - Plotted years
 * @returns the grid group
 */
function Raster({ jaren }: { jaren: number[] }) {
  const { breedte, rechts, links, hoogte } = MAAT;
  return (
    <g aria-hidden="true">
      {[1, 2, 3, 4, 5].map((v) => (
        <g key={v}>
          <line x1={links} x2={breedte - rechts} y1={yVoor(v)} y2={yVoor(v)} stroke="#e4eaec" />
          <text x={links - 8} y={yVoor(v) + 4} textAnchor="end" fontSize="13" fill="#4d5f68">{v}</text>
        </g>
      ))}
      {jaren.map((j, i) => (
        <text key={j} x={xVoor(i, jaren.length)} y={hoogte - 8} textAnchor="middle" fontSize="13" fill="#4d5f68">{j}</text>
      ))}
    </g>
  );
}

/**
 * One business unit line: segments only between adjacent years, dashed into a concept, open dot for a concept.
 * @param props.lijn - The line
 * @returns the line group
 */
function Lijn({ lijn }: { lijn: TrendLijn }) {
  const { kleur } = lijn.unit;
  return (
    <g aria-hidden="true">
      {lijn.punten.slice(1).map((p, i) => {
        const van = lijn.punten[i]!;
        if (!verbonden(van, p)) return null;
        return (
          <line key={p.jaar} x1={van.x} y1={van.y} x2={p.x} y2={p.y} stroke={kleur} strokeWidth={2}
            strokeLinecap="round" strokeDasharray={p.status === 'concept' ? '5 5' : undefined} />
        );
      })}
      {lijn.punten.map((p) => {
        const concept = p.status === 'concept';
        return <circle key={p.jaar} cx={p.x} cy={p.y} r={4.5} fill={concept ? '#fff' : kleur} stroke={concept ? kleur : '#fff'} strokeWidth={2} />;
      })}
    </g>
  );
}

/**
 * End label with the latest value; names the year when the line stops before the last plotted year.
 * @param props.lijn - The line
 * @param props.laatsteJaar - Last plotted year
 * @returns the label group, or null for a line without points
 */
function EindLabel({ lijn, laatsteJaar }: { lijn: TrendLijn; laatsteJaar: number }) {
  const laatste = lijn.punten.at(-1);
  if (!laatste || lijn.eindLabelY === null) return null;
  const x = MAAT.breedte - MAAT.rechts + 8;
  return (
    <g aria-hidden="true">
      <line x1={laatste.x + 7} y1={laatste.y} x2={x} y2={lijn.eindLabelY} stroke={lijn.unit.kleur} strokeOpacity={0.5} />
      <text x={x + 5} y={lijn.eindLabelY + 4} fontSize="14" fill="#16242b">
        {laatste.jaar === laatsteJaar ? lijn.unit.naam : `${lijn.unit.naam} ${laatste.jaar}:`}{' '}
        <tspan fontWeight="700">{nl(laatste.waarde)}</tspan>
      </text>
    </g>
  );
}

/**
 * Tooltip of the active point, kept inside the chart.
 * @param props.punt - The point
 * @param props.tekst - Text to show
 * @returns the tooltip group
 */
function Tooltip({ punt, tekst }: { punt: TrendPunt; tekst: string }) {
  const breedte = tekst.length * 7.2 + 16;
  const x = Math.min(Math.max(punt.x - breedte / 2, 2), MAAT.breedte - breedte - 2);
  const y = punt.y - 36 < 2 ? punt.y + 12 : punt.y - 36;
  return (
    <g pointerEvents="none" aria-hidden="true" data-testid="trend-tooltip">
      <rect x={x} y={y} width={breedte} height={26} rx={5} fill="#101c22" />
      <text x={x + 8} y={y + 17} fontSize="13" fill="#fff">{tekst}</text>
    </g>
  );
}

interface TrendGrafiekProps {
  jaren: JaarCijfers[];
  businessUnits: OverzichtBusinessUnit[];
  titel: string;
}

/**
 * Line chart of the business unit totals per year (y axis 1-5) with an end label per line and a
 * tooltip per point on hover and keyboard focus (Escape hides it). A concept is an open dot with a
 * dashed line; a year without a score breaks the line.
 * @param props.jaren - Years with scores, oldest first
 * @param props.businessUnits - Business units with their fixed colour
 * @param props.titel - Accessible name of the chart
 * @returns the chart
 */
export function TrendGrafiek({ jaren, businessUnits, titel }: TrendGrafiekProps) {
  // Hover and focus are tracked apart: leaving with the mouse keeps the tooltip of the focused point.
  const [gehoverd, setGehoverd] = useState<TrendPunt | null>(null);
  const [gefocust, setGefocust] = useState<TrendPunt | null>(null);
  const actief = gehoverd ?? gefocust;
  const lijnen = bouwTrend(jaren, businessUnits);
  const laatsteJaar = jaren.at(-1)?.jaar ?? 0;
  const naamVan = (id: string) => businessUnits.find((p) => p.id === id)?.naam ?? id;
  function verberg(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    setGehoverd(null);
    setGefocust(null);
  }
  return (
    <div className="trend-vak">
      <svg className="trend-svg" viewBox={`0 0 ${MAAT.breedte} ${MAAT.hoogte}`} role="group" aria-label={titel}
        onMouseLeave={() => setGehoverd(null)} onKeyDown={verberg}>
        <Raster jaren={jaren.map((j) => j.jaar)} />
        {lijnen.map((l) => <Lijn key={l.unit.id} lijn={l} />)}
        {lijnen.map((l) => <EindLabel key={l.unit.id} lijn={l} laatsteJaar={laatsteJaar} />)}
        {lijnen.flatMap((l) => l.punten).map((p) => (
          <circle key={`${p.businessUnitId}-${p.jaar}`} className="trend-punt" cx={p.x} cy={p.y} r={12} fill="transparent"
            tabIndex={0} role="img" aria-label={puntTekst(p, naamVan(p.businessUnitId))}
            onMouseEnter={() => setGehoverd(p)} onMouseLeave={() => setGehoverd(null)}
            onFocus={() => setGefocust(p)} onBlur={() => setGefocust(null)} />
        ))}
        {actief && <Tooltip punt={actief} tekst={puntTekst(actief, naamVan(actief.businessUnitId))} />}
      </svg>
    </div>
  );
}
