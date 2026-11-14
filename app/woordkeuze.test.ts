import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CONFIG } from '@/src/service/config';
import { kiesGespreksonderwerpen } from '@/src/service/gespreksonderwerpen';
import { maakOpeningszin } from '@/src/service/openingszin';
import { berekenJaarCijfers, type MetingInvoer } from '@/src/service/overzichtCijfers';
import { gelijk, meting, rij } from '@/tests/support/overzicht-testdata';

// The board and the supplier read the same screens: "volwassen(heid)" reads as a judgement,
// so the word may not appear in any UI text (design 2026-11-14, section 1). "voorzitter" is gone
// too: access is per user with the roles invuller and lezer (decision 2026-11-14).
const VERBODEN = /volwassen|voorzitter/i;
const ROOT = process.cwd();

function bestanden(map: string, extensie: '.tsx' | '.ts'): string[] {
  return readdirSync(join(ROOT, map), { recursive: true, encoding: 'utf8' })
    .filter((pad) => pad.endsWith(extensie) && !pad.endsWith('.test.ts') && !pad.endsWith('.d.ts'))
    .map((pad) => join(ROOT, map, pad));
}

function teksten(waarde: unknown): string[] {
  if (typeof waarde === 'string') return [waarde];
  if (Array.isArray(waarde)) return waarde.flatMap(teksten);
  if (typeof waarde === 'object' && waarde !== null) return Object.values(waarde).flatMap(teksten);
  return [];
}

function metVerboden(paden: string[]): string[] {
  return paden.filter((pad) => VERBODEN.test(readFileSync(pad, 'utf8'))).map((pad) => relative(ROOT, pad));
}

// One scenario per branch of the opening sentence and the talking points.
const SCENARIOS: Record<string, MetingInvoer[]> = {
  leeg: [],
  zonderAntwoorden: [meting(2026, { ro: rij('concept', {}) })],
  alleenConcept: [meting(2026, { ro: gelijk('concept', 3) })],
  zonderVergelijking: [meting(2026, { ro: gelijk('definitief', 3), belastingen: gelijk('concept', 2) })],
  geenGemeenschappelijk: [meting(2025, { ro: gelijk('definitief', 2) }), meting(2026, { belastingen: gelijk('definitief', 4) })],
  stijgingEnDaling: [
    meting(2024, { belastingen: gelijk('definitief', 2.5), ro: gelijk('definitief', 2.5) }),
    meting(2025, { belastingen: gelijk('definitief', 3), ro: gelijk('definitief', 2.5) }),
    meting(2026, { belastingen: gelijk('definitief', 3.5), ro: rij('definitief', { techniek: 2.5, mens: 2, proces: 2.5 }), burgerzaken: gelijk('concept', 3), 'sociaal-domein': rij('concept', { mens: 1 }) }),
  ],
  alleenStijging: [meting(2025, { ro: gelijk('definitief', 2) }), meting(2026, { ro: gelijk('definitief', 2.5) })],
  alleenDaling: [meting(2025, { ro: gelijk('definitief', 3) }), meting(2026, { ro: rij('definitief', { techniek: 3, mens: 2, proces: 3 }) })],
  vergelijkbaar: [meting(2025, { ro: gelijk('definitief', 3) }), meting(2026, { ro: gelijk('definitief', 3) })],
  vergelijkbaarEenBasis: [meting(2025, { ro: gelijk('definitief', 3) }), meting(2026, { ro: gelijk('definitief', 3), belastingen: gelijk('definitief', 4) })],
  vergelijkbaarMeerBasis: [
    meting(2025, { ro: gelijk('definitief', 3), burgerzaken: gelijk('definitief', 3) }),
    meting(2026, { ro: gelijk('definitief', 3), burgerzaken: gelijk('definitief', 3), belastingen: gelijk('definitief', 4.5) }),
  ],
};

describe('woordkeuze', () => {
  it('should not contain "volwassen" or "voorzitter" in any .tsx file under app/ or src/ui/', () => {
    const paden = [...bestanden('app', '.tsx'), ...bestanden(join('src', 'ui'), '.tsx')];
    expect(paden.length).toBeGreaterThan(10);
    expect(metVerboden(paden)).toEqual([]);
  });

  it('should not contain "volwassen" or "voorzitter" in any non-test .ts file that produces UI or API text', () => {
    const mappen = [join('src', 'service'), join('src', 'ui'), join('src', 'integration'), join('src', 'process'), join('app', 'api')];
    const paden = mappen.flatMap((map) => bestanden(map, '.ts'));
    expect(paden.length).toBeGreaterThan(20);
    expect(metVerboden(paden)).toEqual([]);
  });

  it('should not contain "volwassen" or "voorzitter" in any text of the configuration', () => {
    expect(teksten(CONFIG).filter((t) => VERBODEN.test(t))).toEqual([]);
  });

  it('should not produce "volwassen" or "voorzitter" in any generated sentence or talking point', () => {
    const uitvoer = Object.values(SCENARIOS).flatMap((metingen) => {
      const jaren = metingen.map(berekenJaarCijfers);
      return [maakOpeningszin(jaren), ...kiesGespreksonderwerpen(jaren).flatMap((o) => [o.titel, o.toelichting])];
    });
    const soorten = new Set(Object.values(SCENARIOS).flatMap((m) => kiesGespreksonderwerpen(m.map(berekenJaarCijfers)).map((o) => o.soort)));
    expect([...soorten].sort()).toEqual(['concept', 'daling', 'niet-gestart', 'stijging']);
    // Every scenario reaches a different sentence, except the two without any answered question.
    const zinnen = new Set(Object.values(SCENARIOS).map((m) => maakOpeningszin(m.map(berekenJaarCijfers))));
    expect(zinnen.size).toBe(Object.keys(SCENARIOS).length - 1);
    expect(uitvoer.filter((t) => VERBODEN.test(t))).toEqual([]);
  });
});
