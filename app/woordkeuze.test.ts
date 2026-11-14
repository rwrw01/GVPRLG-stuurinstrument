import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CONFIG } from '@/src/service/config';

// The board and the supplier read the same screens: "volwassen(heid)" reads as a judgement,
// so the word may not appear in any UI text (design 2026-11-14, section 1).
const VERBODEN = /volwassen/i;
const ROOT = process.cwd();

function tsxBestanden(map: string): string[] {
  return readdirSync(join(ROOT, map), { recursive: true, encoding: 'utf8' })
    .filter((pad) => pad.endsWith('.tsx'))
    .map((pad) => join(ROOT, map, pad));
}

function teksten(waarde: unknown): string[] {
  if (typeof waarde === 'string') return [waarde];
  if (Array.isArray(waarde)) return waarde.flatMap(teksten);
  if (typeof waarde === 'object' && waarde !== null) return Object.values(waarde).flatMap(teksten);
  return [];
}

describe('woordkeuze', () => {
  it('should not contain "volwassen" in any .tsx file under app/ or src/ui/', () => {
    const bestanden = [...tsxBestanden('app'), ...tsxBestanden(join('src', 'ui'))];
    expect(bestanden.length).toBeGreaterThan(10);
    const treffers = bestanden.filter((pad) => VERBODEN.test(readFileSync(pad, 'utf8'))).map((pad) => relative(ROOT, pad));
    expect(treffers).toEqual([]);
  });

  it('should not contain "volwassen" in any text of the configuration', () => {
    expect(teksten(CONFIG).filter((t) => VERBODEN.test(t))).toEqual([]);
  });
});
