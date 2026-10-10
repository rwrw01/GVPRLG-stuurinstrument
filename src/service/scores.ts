import { CONFIG } from './config';

export type VraagScoreMap = Record<string, number | null>;
export type PlatformScoresByAs = Record<string, VraagScoreMap>;

export function berekenGemiddeldePerAs(platformData: PlatformScoresByAs): Record<string, number | null> {
  const result: Record<string, number | null> = {};
  for (const as of CONFIG.assen) {
    const asData = platformData[as.id];
    if (!asData) {
      result[as.id] = null;
      continue;
    }
    const scores = as.vragen
      .map((v) => asData[v.id])
      .filter((s): s is number => s != null);
    result[as.id] = scores.length > 0
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : null;
  }
  return result;
}

export function berekenTotaalGemiddelde(platformData: PlatformScoresByAs): number | null {
  const asGemiddelden = berekenGemiddeldePerAs(platformData);
  const waarden = Object.values(asGemiddelden).filter((v): v is number => v != null);
  return waarden.length > 0
    ? waarden.reduce((sum, v) => sum + v, 0) / waarden.length
    : null;
}
