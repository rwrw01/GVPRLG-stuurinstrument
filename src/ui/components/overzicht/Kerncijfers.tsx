import { kerncijferBasis } from './_basisTeksten';
import { nl } from './_formatteer';
import type { Kerncijfers as KerncijfersData, OverzichtBusinessUnit } from './_overzichtTypen';
import { Verschil } from './Verschil';

interface KerncijfersProps {
  cijfers: KerncijfersData;
  businessUnits: OverzichtBusinessUnit[];
  asNaam: (asId: string) => string;
}

/**
 * Largest riser among the business units definitief in both years.
 * @param props.cijfers - Key figures
 * @param props.naamVan - Resolves a business unit id to its name
 * @returns the dd elements
 */
function Stijger({ cijfers, naamVan }: { cijfers: KerncijfersData; naamVan: (id: string) => string }) {
  const { stijger, vorigeJaar, vergelijking } = cijfers;
  if (!stijger) {
    const reden = !vorigeJaar ? 'Nog geen vergelijkingsjaar' : vergelijking ? `Geen stijging ten opzichte van ${vorigeJaar}` : 'Geen businessunit is in beide jaren definitief';
    return <><dd>–</dd><dd className="kern-sub">{reden}</dd></>;
  }
  return (
    <>
      <dd>{naamVan(stijger.businessUnitId)}</dd>
      <dd className="kern-sub"><Verschil nu={stijger.waarde} was={stijger.vorige} /> naar {nl(stijger.waarde)}</dd>
    </>
  );
}

/**
 * Largest growth opportunity among the definitief business units.
 * @param props.cijfers - Key figures
 * @param props.naamVan - Resolves a business unit id to its name
 * @param props.asNaam - Resolves an axis id to its name
 * @returns the dd elements
 */
function Groeikans({ cijfers, naamVan, asNaam }: { cijfers: KerncijfersData; naamVan: (id: string) => string; asNaam: (id: string) => string }) {
  const { groeikans } = cijfers;
  if (!groeikans) return <><dd>–</dd><dd className="kern-sub">Nog geen definitieve businessunits</dd></>;
  return (
    <>
      <dd>{naamVan(groeikans.businessUnitId)}</dd>
      <dd className="kern-sub">
        As {asNaam(groeikans.asId)} {nl(groeikans.waarde)} <Verschil nu={groeikans.waarde} was={groeikans.vorige} />
      </dd>
    </>
  );
}

/**
 * Key figures of the newest year with scores: definitief average with its base and difference,
 * number definitief, largest riser and largest growth opportunity.
 * @param props.cijfers - Key figures from the overview
 * @param props.businessUnits - Business units, for their names
 * @param props.asNaam - Resolves an axis id to its name
 * @returns the key figure row
 */
export function Kerncijfers({ cijfers, businessUnits, asNaam }: KerncijfersProps) {
  const naamVan = (id: string) => businessUnits.find((p) => p.id === id)?.naam ?? id;
  return (
    <dl className="kerncijfers">
      <div>
        <dt>Gemiddelde {cijfers.jaar}</dt>
        <dd className="getal">
          {nl(cijfers.gemiddelde)} {cijfers.vergelijking && <Verschil nu={cijfers.vergelijking.nu} was={cijfers.vergelijking.vorige} />}
        </dd>
        <dd className="kern-sub">{kerncijferBasis(cijfers)}</dd>
      </div>
      <div>
        <dt>Definitief</dt>
        <dd className="getal">{cijfers.aantalDefinitief} van {cijfers.aantalBusinessUnits}</dd>
        <dd className="kern-sub">{cijfers.aantalConcept} in concept, {cijfers.aantalNietGestart} niet gestart</dd>
      </div>
      <div>
        <dt>Grootste stijger</dt>
        <Stijger cijfers={cijfers} naamVan={naamVan} />
      </div>
      <div>
        <dt>Grootste groeikans</dt>
        <Groeikans cijfers={cijfers} naamVan={naamVan} asNaam={asNaam} />
      </div>
    </dl>
  );
}
