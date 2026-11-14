'use client';

import { useState } from 'react';

import { nl } from './_formatteer';
import type { JaarCijfers, OverzichtPlatform } from './_overzichtTypen';
import { bouwTrend, MAAT, xVoor, yVoor, type TrendLijn, type TrendPunt } from './_trendGeometrie';

function puntTekst(punt: TrendPunt, naam: string): string {
  return `${naam}, ${punt.jaar}: ${nl(punt.waarde)}${punt.status === 'concept' ? ' (concept)' : ''}`;
}

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

function Lijn({ lijn }: { lijn: TrendLijn }) {
  const { kleur } = lijn.platform;
  return (
    <g aria-hidden="true">
      {lijn.punten.slice(1).map((p, i) => {
        const van = lijn.punten[i]!;
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

function EindLabel({ lijn }: { lijn: TrendLijn }) {
  const laatste = lijn.punten.at(-1);
  if (!laatste || lijn.eindLabelY === null) return null;
  const x = MAAT.breedte - MAAT.rechts + 8;
  return (
    <g aria-hidden="true">
      <line x1={laatste.x + 7} y1={laatste.y} x2={x} y2={lijn.eindLabelY} stroke={lijn.platform.kleur} strokeOpacity={0.5} />
      <text x={x + 5} y={lijn.eindLabelY + 4} fontSize="14" fill="#16242b">
        {lijn.platform.naam} <tspan fontWeight="700">{nl(laatste.waarde)}</tspan>
      </text>
    </g>
  );
}

function Tooltip({ punt, tekst }: { punt: TrendPunt; tekst: string }) {
  const breedte = tekst.length * 7.2 + 16;
  const x = Math.min(Math.max(punt.x - breedte / 2, 2), MAAT.breedte - breedte - 2);
  const y = punt.y - 36 < 2 ? punt.y + 12 : punt.y - 36;
  return (
    <g className="trend-tooltip" pointerEvents="none" aria-hidden="true">
      <rect x={x} y={y} width={breedte} height={26} rx={5} fill="#101c22" />
      <text x={x + 8} y={y + 17} fontSize="13" fill="#fff">{tekst}</text>
    </g>
  );
}

interface TrendGrafiekProps {
  jaren: JaarCijfers[];
  platformen: OverzichtPlatform[];
  titel: string;
}

/**
 * Line chart of the platform totals per year (y axis 1-5) with an end label per line and a
 * tooltip per point on hover and keyboard focus. A concept is an open dot with a dashed line.
 * @param props.jaren - Years with scores, oldest first
 * @param props.platformen - Platforms with their fixed colour
 * @param props.titel - Accessible name of the chart
 * @returns the chart
 */
export function TrendGrafiek({ jaren, platformen, titel }: TrendGrafiekProps) {
  const [actief, setActief] = useState<TrendPunt | null>(null);
  const lijnen = bouwTrend(jaren, platformen);
  const naamVan = (id: string) => platformen.find((p) => p.id === id)?.naam ?? id;
  return (
    <div className="trend-vak">
      <svg className="trend-svg" viewBox={`0 0 ${MAAT.breedte} ${MAAT.hoogte}`} role="group" aria-label={titel}
        onMouseLeave={() => setActief(null)}>
        <Raster jaren={jaren.map((j) => j.jaar)} />
        {lijnen.map((l) => <Lijn key={l.platform.id} lijn={l} />)}
        {lijnen.map((l) => <EindLabel key={l.platform.id} lijn={l} />)}
        {lijnen.flatMap((l) => l.punten).map((p) => (
          <circle key={`${p.platformId}-${p.jaar}`} className="trend-punt" cx={p.x} cy={p.y} r={12} fill="transparent"
            tabIndex={0} role="img" aria-label={puntTekst(p, naamVan(p.platformId))}
            onMouseEnter={() => setActief(p)} onFocus={() => setActief(p)} onBlur={() => setActief(null)} />
        ))}
        {actief && <Tooltip punt={actief} tekst={puntTekst(actief, naamVan(actief.platformId))} />}
      </svg>
    </div>
  );
}
