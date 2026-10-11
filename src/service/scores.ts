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

/**
 * Averages each axis over several platforms (mean of the per-platform axis averages).
 * The caller decides which platforms count, e.g. only those with status definitief.
 * @param platformen scores per axis for each platform to include
 * @returns average per axis id, or null when no platform has a score on that axis
 */
export function berekenOrganisatieGemiddelde(platformen: PlatformScoresByAs[]): Record<string, number | null> {
  const perPlatform = platformen.map(berekenGemiddeldePerAs);
  const result: Record<string, number | null> = {};
  for (const as of CONFIG.assen) {
    const waarden = perPlatform.map((g) => g[as.id]).filter((v): v is number => v != null);
    result[as.id] = waarden.length > 0 ? waarden.reduce((sum, v) => sum + v, 0) / waarden.length : null;
  }
  return result;
}

/**
 * Averages every question over several platforms, the spokes of the per-question spinnenweb.
 * @param platformen scores per axis for each platform to include
 * @returns average per question id, or null when no platform scored that question
 */
export function berekenGemiddeldePerVraag(platformen: PlatformScoresByAs[]): Record<string, number | null> {
  const result: Record<string, number | null> = {};
  for (const as of CONFIG.assen) {
    for (const vraag of as.vragen) {
      const waarden = platformen.map((p) => p[as.id]?.[vraag.id]).filter((v): v is number => v != null);
      result[vraag.id] = waarden.length > 0 ? waarden.reduce((sum, v) => sum + v, 0) / waarden.length : null;
    }
  }
  return result;
}
