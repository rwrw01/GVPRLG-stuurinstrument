import { describe, expect, it } from 'vitest';
import { CONFIG, getNdsVragen } from './config';

describe('CONFIG', () => {
  it('bevat 5 platformen inclusief de gesplitste R&O', () => {
    const ids = CONFIG.platformen.map((p) => p.id);
    expect(ids).toEqual(['belastingen', 'ro', 'burgerzaken', 'sociaal-domein', 'informatievoorziening']);
  });

  it('heeft een CMMI-schaal van 1 (Initial) tot 5 (Optimizing)', () => {
    expect(CONFIG.schaal[0]).toEqual({ waarde: 1, label: 'Initial', beschrijving: 'Ad-hoc, geen gestructureerde aanpak' });
    expect(CONFIG.schaal[4]!.label).toBe('Optimizing');
  });

  it('proces-as heeft 8 vragen inclusief de twee "partner van betekenis"-vragen', () => {
    const proces = CONFIG.assen.find((a) => a.id === 'proces');
    expect(proces?.vragen).toHaveLength(8);
    expect(proces?.vragen.map((v) => v.id)).toContain('partner-productontwikkeling');
    expect(proces?.vragen.map((v) => v.id)).toContain('partner-dienstverlening');
  });
});

describe('getNdsVragen', () => {
  it('verzamelt alle vragen met een nds-tag over alle assen', () => {
    const ndsVragen = getNdsVragen();
    expect(ndsVragen.length).toBeGreaterThan(0);
    expect(ndsVragen.every((v) => typeof v.nds === 'string')).toBe(true);
  });
});
