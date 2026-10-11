export interface RadarSchaal {
  max: number;
  straal: number;
  midden: number;
}

export interface Punt {
  x: number;
  y: number;
}

/**
 * Position of one value on a radar ("spinnenweb") chart; axis 0 points straight up, clockwise.
 * @param input axis index, number of axes, value and the chart scale
 * @returns SVG coordinates of the point
 */
export function radarPunt(input: RadarSchaal & { index: number; aantalAssen: number; waarde: number }): Punt {
  const hoek = (2 * Math.PI * input.index) / input.aantalAssen - Math.PI / 2;
  const fractie = Math.min(Math.max(input.waarde, 0), input.max) / input.max;
  return {
    x: input.midden + Math.cos(hoek) * input.straal * fractie,
    y: input.midden + Math.sin(hoek) * input.straal * fractie,
  };
}

/**
 * SVG polygon points for a series of axis values; null counts as zero.
 * @param waarden one value per axis
 * @param schaal chart scale
 * @returns space-separated "x,y" pairs for the points attribute
 */
export function radarPolygoon(waarden: Array<number | null>, schaal: RadarSchaal): string {
  return waarden
    .map((waarde, index) => radarPunt({ ...schaal, index, aantalAssen: waarden.length, waarde: waarde ?? 0 }))
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
}
