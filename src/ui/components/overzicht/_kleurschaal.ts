// One blue ramp, light (1) to dark (5): darker is further developed.
const RAMP = ['#e3eff4', '#b9d7e3', '#86b9cd', '#4f97b3', '#2c7fa0', '#1f5f7a', '#17475c'];

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function luminantie([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Background and text colour of a table cell for a score on the 1-5 scale. The text colour is
 * black or white, whichever contrasts most (always at least 4.5:1).
 * @param score - Score between 1 and 5
 * @returns CSS colours for background and text
 */
export function celKleur(score: number): { achtergrond: string; tekst: string } {
  const t = (Math.max(0, Math.min(1, (score - 1) / 4))) * (RAMP.length - 1);
  const i = Math.floor(t);
  const a = rgb(RAMP[i]!);
  const b = rgb(RAMP[Math.min(i + 1, RAMP.length - 1)]!);
  const mix = a.map((v, k) => Math.round(v + (b[k]! - v) * (t - i))) as [number, number, number];
  const l = luminantie(mix);
  const tekst = 1.05 / (l + 0.05) >= (l + 0.05) / 0.05 ? '#ffffff' : '#000000';
  return { achtergrond: `rgb(${mix.join(',')})`, tekst };
}

/**
 * Contrast ratio between two rgb() / hex colours (WCAG formula), used by the tests.
 * @param kleur1 - Colour as `rgb(r,g,b)` or `#rrggbb`
 * @param kleur2 - Colour as `rgb(r,g,b)` or `#rrggbb`
 * @returns the contrast ratio, at least 1
 */
export function contrast(kleur1: string, kleur2: string): number {
  const lees = (k: string) => (k.startsWith('#') ? rgb(k) : (k.match(/\d+/g)!.map(Number) as [number, number, number]));
  const [l1, l2] = [luminantie(lees(kleur1)), luminantie(lees(kleur2))].sort((x, y) => y - x);
  return (l1! + 0.05) / (l2! + 0.05);
}
