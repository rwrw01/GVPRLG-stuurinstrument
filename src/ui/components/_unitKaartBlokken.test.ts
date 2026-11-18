import { describe, expect, it } from 'vitest';

import { unitKaartBlokken } from './_unitKaartBlokken';
import type { UiVragenlijst } from './_vragenlijstTypen';

const unit = (id: string, platformId: string) => ({ id, platformId, naam: id.toUpperCase(), kleur: '#000000' });

const LIJST: UiVragenlijst = {
  jaar: 2026,
  vastgelegd: false,
  assen: [],
  platformen: [
    { id: 'ro', naam: 'R&O', businessUnitIds: ['ro'] },
    { id: 'iv', naam: 'Informatievoorziening', businessUnitIds: ['iv', 'icollect'] },
    { id: 'leeg', naam: 'Leeg', businessUnitIds: [] },
    { id: 'bel', naam: 'Belastingen', businessUnitIds: ['bel'] },
  ],
  businessUnits: [unit('ro', 'ro'), unit('iv', 'iv'), unit('icollect', 'iv'), unit('bel', 'bel')],
};

describe('unitKaartBlokken', () => {
  it('should keep the platform order when a platform has more than one business unit', () => {
    const blokken = unitKaartBlokken(LIJST);
    expect(blokken.map((b) => (b.soort === 'groep' ? `groep:${b.platform.id}` : b.unit.id))).toEqual(['ro', 'groep:iv', 'bel']);
  });

  it('should put the business units of a group in their configured order', () => {
    const groep = unitKaartBlokken(LIJST).find((b) => b.soort === 'groep');
    expect(groep?.soort === 'groep' && groep.units.map((u) => u.id)).toEqual(['iv', 'icollect']);
  });

  it('should skip a platform without business units and ids missing from the list', () => {
    const lijst = { ...LIJST, platformen: [...LIJST.platformen, { id: 'x', naam: 'X', businessUnitIds: ['onbekend'] }] };
    expect(unitKaartBlokken(lijst)).toHaveLength(3);
  });
});
