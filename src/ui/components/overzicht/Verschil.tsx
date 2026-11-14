import { verschil } from './_formatteer';

/**
 * Difference with icon and text (▲ +0,2 / ▼ −0,4 / = 0,0), so colour is never the only cue.
 * @param props.nu - Current score
 * @param props.was - Earlier score
 * @returns the difference, or nothing when one of the scores is missing
 */
export function Verschil({ nu, was }: { nu: number | null | undefined; was: number | null | undefined }) {
  const v = verschil(nu, was);
  if (!v) return null;
  return (
    <span className={`verschil verschil-${v.richting}`}>
      <span aria-hidden="true">{v.icoon} </span>
      {v.tekst}
    </span>
  );
}
