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
