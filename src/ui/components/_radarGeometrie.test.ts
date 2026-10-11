import { describe, expect, it } from 'vitest';
import { radarPunt, radarPolygoon } from './_radarGeometrie';

describe('radarPunt', () => {
  it('should place the first axis straight up when the value is the maximum', () => {
    const p = radarPunt({ index: 0, aantalAssen: 3, waarde: 5, max: 5, straal: 100, midden: 150 });
    expect(p.x).toBeCloseTo(150);
    expect(p.y).toBeCloseTo(50);
  });

  it('should place a zero value in the centre', () => {
    const p = radarPunt({ index: 1, aantalAssen: 3, waarde: 0, max: 5, straal: 100, midden: 150 });
    expect(p.x).toBeCloseTo(150);
    expect(p.y).toBeCloseTo(150);
  });

  it('should clamp values above the maximum to the outer ring', () => {
    const p = radarPunt({ index: 0, aantalAssen: 4, waarde: 9, max: 5, straal: 100, midden: 150 });
    expect(p.y).toBeCloseTo(50);
  });
});

describe('radarPolygoon', () => {
  it('should produce one x,y pair per axis and treat null as zero', () => {
    const points = radarPolygoon([5, null, 5], { max: 5, straal: 100, midden: 150 });
    expect(points.split(' ')).toHaveLength(3);
    expect(points.split(' ')[1]).toBe('150.0,150.0');
  });
});
