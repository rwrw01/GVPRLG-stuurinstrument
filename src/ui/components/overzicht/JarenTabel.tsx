import Link from 'next/link';

import { celKleur } from './_kleurschaal';
import { nl } from './_formatteer';
import type { BusinessUnitCijfers, JaarCijfers, OverzichtBusinessUnit } from './_overzichtTypen';

/**
 * One table cell: the score on the blue ramp, a concept outlined, no scores hatched.
 * @param props.cijfers - Business unit figures of the year, if any
 * @param props.jaar - Year
 * @param props.naam - Business unit name
 * @returns the cell
 */
function Cel({ cijfers, jaar, naam }: { cijfers: BusinessUnitCijfers | undefined; jaar: number; naam: string }) {
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

/**
 * Newest year with scores in which the business unit took part, the target of its link.
 * @param jaren - All years, oldest first
 * @param id - Business unit id
 * @returns the year, or null when it has no scores in any year
 */
function laatsteJaar(jaren: JaarCijfers[], id: string): number | null {
  return [...jaren].reverse().find((j) => j.businessUnits.some((b) => b.businessUnitId === id && b.totaal !== null))?.jaar ?? null;
}

interface JarenTabelProps {
  jaren: JaarCijfers[];
  businessUnits: OverzichtBusinessUnit[];
  nuJaar: number | null;
}

/**
 * Business unit x year table with one blue colour ramp (darker is further developed), the number in
 * every cell, a concept outlined and a business unit without scores hatched. Also the table view of the
 * trend chart. The name links to its result in the newest year in which it has scores.
 * @param props.jaren - All years, oldest first
 * @param props.businessUnits - Business units of all years
 * @param props.nuJaar - Newest year with scores
 * @returns the table with its scale legend
 */
export function JarenTabel({ jaren, businessUnits, nuJaar }: JarenTabelProps) {
  return (
    <>
      <div className="tabel-scroll" id="jaren-tabel" tabIndex={-1}>
        <table className="jaren-tabel" aria-label="Gemiddelde score per businessunit en jaar">
          <thead>
            <tr>
              <th scope="col">Businessunit</th>
              {jaren.map((j) => <th scope="col" key={j.jaar} className="jaren-kolom">{j.jaar}</th>)}
            </tr>
          </thead>
          <tbody>
            {businessUnits.map((p) => (
              <tr key={p.id}>
                <th scope="row">
                  {laatsteJaar(jaren, p.id) ? <Link href={`/metingen/${laatsteJaar(jaren, p.id)}/${p.id}/resultaat`}>{p.naam}</Link> : p.naam}
                </th>
                {jaren.map((j) => (
                  <Cel key={j.jaar} jaar={j.jaar} naam={p.naam} cijfers={j.businessUnits.find((c) => c.businessUnitId === p.id)} />
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
