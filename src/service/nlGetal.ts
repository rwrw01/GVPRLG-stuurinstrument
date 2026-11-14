/**
 * Formats a score with one decimal and a Dutch decimal comma, e.g. 3.45 -> "3,5".
 * @param waarde - Score (unrounded)
 * @returns the display text
 */
export function formatScore(waarde: number): string {
  return (Math.round(waarde * 10) / 10).toFixed(1).replace('.', ',');
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
 * Rounds a score to one decimal, the precision the user sees.
 * @param waarde - Score (unrounded)
 * @returns the rounded score
 */
export function rond1(waarde: number): number {
  return Math.round(waarde * 10) / 10;
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
