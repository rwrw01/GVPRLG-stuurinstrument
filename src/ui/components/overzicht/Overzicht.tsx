'use client';

import type { ReactNode } from 'react';

import { AssenBlok } from './AssenBlok';
import { Gespreksonderwerpen } from './Gespreksonderwerpen';
import { JarenTabel } from './JarenTabel';
import { Kerncijfers } from './Kerncijfers';
import { TrendGrafiek } from './TrendGrafiek';
import type { Overzicht as OverzichtData, OverzichtPlatform } from './_overzichtTypen';

function Kaart({ titel, sub, children }: { titel: string; sub?: string; children: ReactNode }) {
  return (
    <section className="card kaart" aria-label={titel}>
      <h3>{titel}</h3>
      {sub && <p className="kaart-sub">{sub}</p>}
      {children}
    </section>
  );
}

function Legenda({ platformen }: { platformen: OverzichtPlatform[] }) {
  return (
    <ul className="trend-legenda">
      {platformen.map((p) => (
        <li key={p.id}><i aria-hidden="true" style={{ background: p.kleur }} />{p.naam}</li>
      ))}
      <li>Open stip en stippellijn: concept</li>
    </ul>
  );
}

function Trend({ data }: { data: OverzichtData }) {
  const metScores = data.jaren.filter((j) => j.platformen.some((p) => p.totaal !== null));
  return (
    <Kaart titel="Trend per platform" sub="Gemiddelde score per jaar, schaal 1 tot 5.">
      {metScores.length < 2 && <p className="trend-leeg">Een trend verschijnt zodra er twee jaren met scores zijn.</p>}
      {metScores.length >= 2 && (
        <>
          <Legenda platformen={data.platformen} />
          <TrendGrafiek jaren={metScores} platformen={data.platformen}
            titel={`Gemiddelde score per platform, ${metScores[0]!.jaar} tot en met ${metScores.at(-1)!.jaar}`} />
        </>
      )}
    </Kaart>
  );
}

function Kopregel({ data }: { data: OverzichtData }) {
  const nu = data.jaren.find((j) => j.jaar === data.nuJaar);
  return (
    <div className="overzicht-kop">
      <h2>Overzicht</h2>
      <p>
        {nu ? `Stand van de meting ${nu.jaar}: ${nu.aantalDefinitief} van ${nu.platformen.length} platformen definitief.` : 'Nog geen meting met scores.'}
      </p>
    </div>
  );
}

/**
 * Start screen for the board: opening sentence, key figures, trend per platform, talking points,
 * all years side by side and the three axes. Shows what there is when data is missing.
 * @param props.data - Response of GET /api/overzicht
 * @returns the start screen
 */
export function Overzicht({ data }: { data: OverzichtData }) {
  const asNaam = (id: string) => data.assen.find((a) => a.id === id)?.naam ?? id;
  return (
    <div className="overzicht">
      <Kopregel data={data} />
      <p className="openingszin">{data.openingszin}</p>
      {data.kerncijfers && <Kerncijfers cijfers={data.kerncijfers} platformen={data.platformen} asNaam={asNaam} />}
      <div className="raster">
        <Trend data={data} />
        <Kaart titel="Gespreksonderwerpen" sub={data.nuJaar ? `Afgeleid uit de cijfers van ${data.nuJaar}.` : undefined}>
          <Gespreksonderwerpen onderwerpen={data.gespreksonderwerpen} />
        </Kaart>
      </div>
      <div className="raster">
        <Kaart titel="Alle jaren naast elkaar" sub="Donkerder is verder ontwikkeld. Kies een platform voor het resultaat van het nieuwste jaar.">
          {data.jaren.length === 0 ? <p>Er zijn nog geen metingen.</p> : <JarenTabel jaren={data.jaren} platformen={data.platformen} nuJaar={data.nuJaar} />}
        </Kaart>
        <Kaart titel={data.nuJaar ? `De drie assen in ${data.nuJaar}` : 'De drie assen'} sub="Gemiddeld over alle platformen.">
          {data.nuJaar ? <AssenBlok assen={data.assen} nuJaar={data.nuJaar} vorigeJaar={data.vorigeJaar} /> : <p>Nog geen scores.</p>}
        </Kaart>
      </div>
    </div>
  );
}
