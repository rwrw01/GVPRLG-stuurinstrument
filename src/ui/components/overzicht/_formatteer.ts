/**
 * Formats a score for display: one decimal, Dutch comma; a dash when there is no score.
 * @param waarde - Score, or null
 * @returns the display text
 */
export function nl(waarde: number | null | undefined): string {
  return waarde == null ? '–' : (Math.round(waarde * 10) / 10).toFixed(1).replace('.', ',');
}

export type Richting = 'op' | 'neer' | 'gelijk';

/**
 * Difference between two scores as icon plus text, rounded to one decimal for display.
 * @param nu - Current score
 * @param was - Earlier score
 * @returns direction, icon and signed text (e.g. "+0,2", "−0,4", "0,0"), or null when one is missing
 */
export function verschil(nu: number | null | undefined, was: number | null | undefined): { richting: Richting; icoon: string; tekst: string } | null {
  if (nu == null || was == null) return null;
  const d = Math.round((nu - was) * 10) / 10;
  if (d > 0) return { richting: 'op', icoon: '▲', tekst: `+${nl(d)}` };
  if (d < 0) return { richting: 'neer', icoon: '▼', tekst: `−${nl(-d)}` };
  return { richting: 'gelijk', icoon: '=', tekst: '0,0' };
}
