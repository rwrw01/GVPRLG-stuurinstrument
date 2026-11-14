import { nl } from './_formatteer';
import type { AsVergelijking } from './_overzichtTypen';
import { Verschil } from './Verschil';

const procent = (v: number) => `${((Math.min(Math.max(v, 1), 5) - 1) / 4) * 100}%`;

/**
 * One axis: bar with the current score, marker and difference only when compared.
 * @param props.as - The axis figures
 * @param props.nuJaar - Newest year with scores
 * @param props.vorigeJaar - Comparison year, or null
 * @returns the list item
 */
function AsRij({ as, nuJaar, vorigeJaar }: { as: AsVergelijking; nuJaar: number; vorigeJaar: number | null }) {
  const vorige = as.vergeleken ? as.vorige : null;
  const omschrijving = `${as.naam}: ${nl(as.nu)} in ${nuJaar}${vorige != null && vorigeJaar ? `, ${nl(vorige)} in ${vorigeJaar}` : ''}`;
  return (
    <li className="as-rij">
      <span>{as.naam}</span>
      <span className="as-baan" role="img" aria-label={omschrijving} title={omschrijving}>
        {as.nu != null && <i style={{ width: procent(as.nu) }} />}
        {vorige != null && <u style={{ left: procent(vorige) }} />}
      </span>
      <b className="getal">{nl(as.nu)}</b>
      <Verschil nu={as.nu} was={vorige} />
    </li>
  );
}

/**
 * Explains the base of the axis figures.
 * @param props.assen - Axis figures
 * @param props.nuJaar - Newest year with scores
 * @param props.vorigeJaar - Comparison year, or null
 * @returns the sentence
 */
function basis(assen: AsVergelijking[], nuJaar: number, vorigeJaar: number | null): string {
  const aantal = assen[0]?.aantal ?? 0;
  const platformen = aantal === 1 ? '1 platform' : `${aantal} platformen`;
  if (assen[0]?.vergeleken && vorigeJaar) {
    return `Gemiddeld over de ${platformen} die in ${vorigeJaar} en ${nuJaar} definitief zijn. Het streepje is de score van ${vorigeJaar}.`;
  }
  if (aantal === 0) return `In ${nuJaar} is nog geen platform definitief.`;
  const zonder = vorigeJaar ? ` Geen vergelijking met ${vorigeJaar}: geen platform is in beide jaren definitief.` : '';
  return `Gemiddeld over ${aantal === 1 ? '1 definitief platform' : `${aantal} definitieve platformen`}.${zonder}`;
}

/**
 * The three axes: a bar with the score, and when compared a marker at the comparison year and
 * the difference, all over the platforms definitief in both years.
 * @param props.assen - Axis comparison from the overview
 * @param props.nuJaar - Newest year with scores
 * @param props.vorigeJaar - Comparison year, or null
 * @returns the axis block
 */
export function AssenBlok({ assen, nuJaar, vorigeJaar }: { assen: AsVergelijking[]; nuJaar: number; vorigeJaar: number | null }) {
  return (
    <>
      <ul className="assen-lijst">
        {assen.map((as) => <AsRij key={as.id} as={as} nuJaar={nuJaar} vorigeJaar={vorigeJaar} />)}
      </ul>
      <p className="kaart-sub">Schaal 1 tot 5. {basis(assen, nuJaar, vorigeJaar)}</p>
    </>
  );
}
