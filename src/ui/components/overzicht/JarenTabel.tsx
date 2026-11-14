import Link from 'next/link';

import { celKleur } from './_kleurschaal';
import { nl } from './_formatteer';
import type { JaarCijfers, OverzichtPlatform, PlatformCijfers } from './_overzichtTypen';

function Cel({ cijfers, jaar, naam }: { cijfers: PlatformCijfers | undefined; jaar: number; naam: string }) {
  if (!cijfers || cijfers.totaal === null) {
    const tekst = cijfers?.status === 'concept' ? 'concept, nog geen scores' : 'niet gestart';
    return (
      <td className="jaren-cel jaren-cel-leeg" title={`${naam} ${jaar}: ${tekst}`}>
        <span aria-hidden="true">–</span>
        <span className="visueel-verborgen">{tekst}</span>
      </td>
    );
  }
  const kleur = celKleur(cijfers.totaal);
  const concept = cijfers.status === 'concept';
  return (
    <td className={`jaren-cel${concept ? ' jaren-cel-concept' : ''}`} style={{ background: kleur.achtergrond, color: kleur.tekst }}
      title={`${naam} ${jaar}: ${nl(cijfers.totaal)}${concept ? ' (concept)' : ''}`}>
      {nl(cijfers.totaal)}
      {concept && <span className="visueel-verborgen"> (concept)</span>}
    </td>
  );
}

interface JarenTabelProps {
  jaren: JaarCijfers[];
  platformen: OverzichtPlatform[];
  nuJaar: number | null;
}

/**
 * Platform x year table with one blue colour ramp (darker is further developed), the number in
 * every cell, a concept outlined and a platform without scores hatched. Also the table view of the
 * trend chart. The platform name links to its result in the newest year with scores.
 * @param props.jaren - All years, oldest first
 * @param props.platformen - Platforms in fixed order
 * @param props.nuJaar - Newest year with scores, the target of the platform links
 * @returns the table with its scale legend
 */
export function JarenTabel({ jaren, platformen, nuJaar }: JarenTabelProps) {
  return (
    <>
      <div className="tabel-scroll">
        <table className="jaren-tabel" aria-label="Gemiddelde score per platform en jaar">
          <thead>
            <tr>
              <th scope="col">Platform</th>
              {jaren.map((j) => <th scope="col" key={j.jaar} className="jaren-kolom">{j.jaar}</th>)}
            </tr>
          </thead>
          <tbody>
            {platformen.map((p) => (
              <tr key={p.id}>
                <th scope="row">
                  {nuJaar ? <Link href={`/metingen/${nuJaar}/${p.id}/resultaat`}>{p.naam}</Link> : p.naam}
                </th>
                {jaren.map((j) => (
                  <Cel key={j.jaar} jaar={j.jaar} naam={p.naam} cijfers={j.platformen.find((c) => c.platformId === p.id)} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="jaren-schaal">
        <span>1</span><i aria-hidden="true" /><span>5</span>
        <span>Een omrand vakje is een concept, een gearceerd vakje heeft nog geen scores.</span>
      </div>
    </>
  );
}
