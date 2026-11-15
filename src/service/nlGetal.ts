/**
 * Formats a score with one decimal and a Dutch decimal comma, e.g. 3.45 -> "3,5".
 * @param waarde - Score (unrounded)
 * @returns the display text
 */
export function formatScore(waarde: number): string {
  return rond1(waarde).toFixed(1).replace('.', ',');
}

/**
 * Joins names the Dutch way: "A", "A en B", "A, B en C".
 * @param namen - Names in display order
 * @returns the joined text
 */
export function noemOp(namen: string[]): string {
  if (namen.length <= 1) return namen[0] ?? '';
  return `${namen.slice(0, -1).join(', ')} en ${namen.at(-1)}`;
}

/**
 * Rounds a score to one decimal (half up), the precision the user sees. Floating-point noise is
 * removed first, so an average of averages such as (4/3 + 53/30) / 2 = 1.5499999999999998 (exactly
 * 1,55) still rounds to 1,6.
 * @param waarde - Score (unrounded)
 * @returns the rounded score
 */
export function rond1(waarde: number): number {
  return Math.round(Number((waarde * 10).toPrecision(12))) / 10;
}

/**
 * Difference between two scores as the user sees it: both rounded to one decimal first, so equal
 * displayed values give 0 and never "from 3,1 to 3,1".
 * @param nu - Current score
 * @param was - Earlier score
 * @returns the displayed difference, rounded to one decimal
 */
export function zichtbaarVerschil(nu: number, was: number): number {
  return rond1(rond1(nu) - rond1(was));
}
