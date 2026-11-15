import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';

describe('CONFIG', () => {
  it('heeft een CMMI-schaal van 1 (Initial) tot 5 (Optimizing)', () => {
    expect(CONFIG.schaal[0]).toEqual({ waarde: 1, label: 'Initial', naam: 'Ad hoc', beschrijving: 'Ad-hoc, geen gestructureerde aanpak' });
    expect(CONFIG.schaal[4]!.label).toBe('Optimizing');
  });

  it('should give every level a Dutch name next to the CMMI name', () => {
    expect(CONFIG.schaal.map((s) => s.naam)).toEqual(['Ad hoc', 'Herhaalbaar', 'Vastgelegd', 'Gemeten', 'Lerend']);
  });

  it('should keep only the NDS themes and the scale in code (the lists are managed in the app)', () => {
    expect(Object.keys(CONFIG).sort()).toEqual(['ndsThemas', 'schaal']);
    expect(CONFIG.ndsThemas.map((t) => t.id)).toContain('Digitaal vakmanschap');
  });
});
