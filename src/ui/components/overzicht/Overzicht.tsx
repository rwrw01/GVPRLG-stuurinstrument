'use client';

import type { ReactNode } from 'react';

import { AssenBlok } from './AssenBlok';
import { Gespreksonderwerpen } from './Gespreksonderwerpen';
import { JarenTabel } from './JarenTabel';
import { Kerncijfers } from './Kerncijfers';
import { TrendGrafiek } from './TrendGrafiek';
import type { Overzicht as OverzichtData, OverzichtBusinessUnit } from './_overzichtTypen';

/**
 * Card with a heading and an optional sub line.
 * @param props.titel - Heading, also the region name
 * @param props.sub - Sub line
 * @param props.children - Card content
 * @returns the card
 */
function Kaart({ titel, sub, children }: { titel: string; sub?: string; children: ReactNode }) {
  return (
    <section className="card kaart" aria-label={titel}>
      <h3>{titel}</h3>
      {sub && <p className="kaart-sub">{sub}</p>}
      {children}
    </section>
  );
}

/**
 * Legend of the trend chart: business unit colours and the concept marking.
 * @param props.businessUnits - Business units with their colour
 * @returns the legend
 */
function Legenda({ businessUnits }: { businessUnits: OverzichtBusinessUnit[] }) {
  return (
    <ul className="trend-legenda">
      {businessUnits.map((p) => (
        <li key={p.id}><i aria-hidden="true" style={{ background: p.kleur }} />{p.naam}</li>
      ))}
      <li>Open stip en stippellijn: concept</li>
    </ul>
  );
}

/**
 * Trend card: the chart from two years with scores on, otherwise the empty-state sentence.
 * @param props.data - The overview
 * @returns the card
 */
function Trend({ data }: { data: OverzichtData }) {
  const metScores = data.jaren.filter((j) => j.businessUnits.some((p) => p.totaal !== null));
  return (
    <Kaart titel="Trend per businessunit" sub="Gemiddelde score per jaar, schaal 1 tot 5.">
      {metScores.length < 2 && <p className="trend-leeg">Een trend verschijnt zodra er twee jaren met scores zijn.</p>}
      {metScores.length >= 2 && (
        <>
          <a className="naar-tabel" href="#jaren-tabel">Naar de tabel met alle jaren</a>
          <Legenda businessUnits={data.businessUnits} />
          <TrendGrafiek jaren={metScores} businessUnits={data.businessUnits}
            titel={`Gemiddelde score per businessunit, ${metScores[0]!.jaar} tot en met ${metScores.at(-1)!.jaar}`} />
        </>
      )}
    </Kaart>
  );
}

/**
 * Page heading with the state of the newest year with scores.
 * @param props.data - The overview
 * @returns the heading block
 */
function Kopregel({ data }: { data: OverzichtData }) {
  const nu = data.jaren.find((j) => j.jaar === data.nuJaar);
  return (
    <div className="overzicht-kop">
      <h2>Overzicht</h2>
      <p>
        {nu ? `Stand van de meting ${nu.jaar}: ${nu.aantalDefinitief} van ${nu.businessUnits.length} businessunits definitief.` : 'Nog geen meting met scores.'}
      </p>
    </div>
  );
}

/**
 * Start screen for the board: opening sentence, key figures, trend per business unit, talking points,
 * all years side by side and the axes. Shows what there is when data is missing.
 * @param props.data - Response of GET /api/overzicht
 * @returns the start screen
 */
export function Overzicht({ data }: { data: OverzichtData }) {
  const asNaam = (id: string) => data.assen.find((a) => a.id === id)?.naam ?? id;
  return (
    <div className="overzicht">
      <Kopregel data={data} />
      <p className="openingszin">{data.openingszin}</p>
      {data.kerncijfers && <Kerncijfers cijfers={data.kerncijfers} businessUnits={data.businessUnits} asNaam={asNaam} />}
      <div className="raster">
        <Trend data={data} />
        <Kaart titel="Gespreksonderwerpen" sub={data.nuJaar ? `Afgeleid uit de cijfers van ${data.nuJaar}.` : undefined}>
          <Gespreksonderwerpen onderwerpen={data.gespreksonderwerpen} />
        </Kaart>
      </div>
      <div className="raster">
        <Kaart titel="Alle jaren naast elkaar" sub="Donkerder is verder ontwikkeld. Kies een businessunit voor haar nieuwste resultaat.">
          {data.jaren.length === 0 ? <p>Er zijn nog geen metingen.</p> : <JarenTabel jaren={data.jaren} businessUnits={data.businessUnits} nuJaar={data.nuJaar} />}
        </Kaart>
        <Kaart titel={data.nuJaar ? `De assen in ${data.nuJaar}` : 'De assen'}>
          {data.nuJaar ? <AssenBlok assen={data.assen} nuJaar={data.nuJaar} vorigeJaar={data.vorigeJaar} /> : <p>Nog geen scores.</p>}
        </Kaart>
      </div>
    </div>
  );
}
