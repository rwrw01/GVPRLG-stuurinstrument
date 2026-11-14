import type { JaarCijfers, OverzichtPlatform, OverzichtStatus } from './_overzichtTypen';

/** Chart size in SVG units; the right margin holds the end labels. */
export const MAAT = { breedte: 680, hoogte: 300, links: 34, rechts: 215, boven: 16, onder: 30 };
const LABEL_AFSTAND = 18;

export interface TrendPunt {
  platformId: string;
  jaar: number;
  waarde: number;
  status: OverzichtStatus;
  x: number;
  y: number;
}

export interface TrendLijn {
  platform: OverzichtPlatform;
  punten: TrendPunt[];
  eindLabelY: number | null;
}

/**
 * Vertical position of a score on the 1-5 axis.
 * @param waarde - Score
 * @returns the y coordinate (5 at the top)
 */
export function yVoor(waarde: number): number {
  const { hoogte, boven, onder } = MAAT;
  return boven + ((5 - waarde) * (hoogte - boven - onder)) / 4;
}

/**
 * Horizontal position of the i-th year.
 * @param index - Year index
 * @param aantal - Number of years
 * @returns the x coordinate
 */
export function xVoor(index: number, aantal: number): number {
  const { breedte, links, rechts } = MAAT;
  const ruimte = breedte - links - rechts;
  return aantal <= 1 ? links + ruimte / 2 : links + (index * ruimte) / (aantal - 1);
}

// Pushes end labels apart so they never overlap, keeping their order.
function spreidLabels(lijnen: TrendLijn[]): void {
  const metLabel = lijnen.filter((l) => l.eindLabelY !== null).sort((a, b) => a.eindLabelY! - b.eindLabelY!);
  for (let i = 1; i < metLabel.length; i += 1) {
    const vorige = metLabel[i - 1]!.eindLabelY!;
    if (metLabel[i]!.eindLabelY! - vorige < LABEL_AFSTAND) metLabel[i]!.eindLabelY = vorige + LABEL_AFSTAND;
  }
}

/**
 * Lines of the trend chart: one per platform with a point per year that has a total.
 * @param jaren - Years to plot, oldest first
 * @param platformen - Platforms in fixed order with their colour
 * @returns the lines with coordinates and spread end-label positions
 */
export function bouwTrend(jaren: JaarCijfers[], platformen: OverzichtPlatform[]): TrendLijn[] {
  const lijnen = platformen.map((platform) => {
    const punten: TrendPunt[] = [];
    jaren.forEach((jaar, index) => {
      const p = jaar.platformen.find((c) => c.platformId === platform.id);
      if (!p || p.totaal == null) return;
      punten.push({ platformId: platform.id, jaar: jaar.jaar, waarde: p.totaal, status: p.status, x: xVoor(index, jaren.length), y: yVoor(p.totaal) });
    });
    return { platform, punten, eindLabelY: punten.at(-1)?.y ?? null };
  });
  spreidLabels(lijnen);
  return lijnen;
}
