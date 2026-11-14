import { nl } from './_formatteer';
import type { AsVergelijking } from './_overzichtTypen';
import { Verschil } from './Verschil';

const procent = (v: number) => `${((Math.min(Math.max(v, 1), 5) - 1) / 4) * 100}%`;

function AsRij({ as, nuJaar, vorigeJaar }: { as: AsVergelijking; nuJaar: number; vorigeJaar: number | null }) {
  const omschrijving = `${as.naam}: ${nl(as.nu)} in ${nuJaar}${as.vorige != null && vorigeJaar ? `, ${nl(as.vorige)} in ${vorigeJaar}` : ''}`;
  return (
    <li className="as-rij">
      <span>{as.naam}</span>
      <span className="as-baan" role="img" aria-label={omschrijving} title={omschrijving}>
        {as.nu != null && <i style={{ width: procent(as.nu) }} />}
        {as.vorige != null && <u style={{ left: procent(as.vorige) }} />}
      </span>
      <b className="getal">{nl(as.nu)}</b>
      <Verschil nu={as.nu} was={as.vorige} />
    </li>
  );
}

/**
 * The three axes averaged over all platforms: a bar with the current score, a marker at the
 * comparison year and the difference.
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
      <p className="kaart-sub">
        Schaal 1 tot 5.{vorigeJaar ? ` Het streepje is de score van ${vorigeJaar}.` : ' Er is nog geen vergelijkingsjaar.'}
      </p>
    </>
  );
}
