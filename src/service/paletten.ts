// Fixed palettes for new business units and axes. A colour is never reused, also not after the
// item is removed, so two lines in one chart never share a colour. Extending a palette is a code
// change; the app refuses a new item when every colour is taken.

/**
 * Business unit line colours (trend chart, legend); the first five are the former platform colours.
 * Checked with the dataviz palette validator (light mode): all checks pass; the chart relies on
 * end labels and the year table as relief for the colours below 3:1 against the surface.
 */
export const BUSINESS_UNIT_PALET = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#8b5cf6', '#5b6b17', '#0aa3b8'] as const;

/**
 * Axis colours, also used as text colour on white, so each reaches WCAG AA (at least 4.5:1).
 * The first three are the former Techniek, Mens and Proces colours.
 */
export const AS_PALET = ['#1F6FB8', '#15803D', '#C2410C', '#8B4FD8', '#C0266D', '#6B6B00'] as const;

/**
 * The first palette colour no existing item (removed ones included) uses.
 * @param palet - The palette, in order of preference
 * @param gebruikt - Colours of every existing item
 * @returns the colour, or null when every colour is taken
 */
export function volgendeVrijeKleur(palet: readonly string[], gebruikt: Array<string | null>): string | null {
  const bezet = new Set(gebruikt.filter((k): k is string => k !== null).map((k) => k.toLowerCase()));
  return palet.find((k) => !bezet.has(k.toLowerCase())) ?? null;
}
