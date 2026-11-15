import { describe, expect, it } from 'vitest';
import { bouwKruimelpad, type NaamVan } from './_kruimelpad';

const NAMEN: Record<string, string> = { ro: 'R&O', belastingen: 'Belastingen' };
const naamVan: NaamVan = (jaar, id) => (jaar === 2026 ? NAMEN[id] : undefined);

describe('bouwKruimelpad', () => {
  it('should return only the home crumb when on the home page', () => {
    expect(bouwKruimelpad('/')).toEqual([{ label: 'Overzicht', href: '/' }]);
  });

  it('should add the measurement year when on a meting page', () => {
    expect(bouwKruimelpad('/metingen/2026')).toEqual([
      { label: 'Overzicht', href: '/' },
      { label: 'Meting 2026', href: '/metingen/2026' },
    ]);
  });

  it('should use the business unit name of that year when on the invulformulier', () => {
    expect(bouwKruimelpad('/metingen/2026/ro', naamVan)).toEqual([
      { label: 'Overzicht', href: '/' },
      { label: 'Meting 2026', href: '/metingen/2026' },
      { label: 'R&O', href: '/metingen/2026/ro' },
    ]);
  });

  it('should end with the result crumb when on a result page', () => {
    const crumbs = bouwKruimelpad('/metingen/2026/belastingen/resultaat', naamVan);
    expect(crumbs.map((c) => c.label)).toEqual(['Overzicht', 'Meting 2026', 'Belastingen', 'Resultaat']);
    expect(crumbs[3]?.href).toBe('/metingen/2026/belastingen/resultaat');
  });

  it('should fall back to the raw segment when the business unit is unknown in that year', () => {
    expect(bouwKruimelpad('/metingen/2026/onbekend', naamVan)[2]?.label).toBe('onbekend');
    expect(bouwKruimelpad('/metingen/2025/ro', naamVan)[2]?.label).toBe('ro');
  });

  it('should add the beheer crumb when on the administration page', () => {
    expect(bouwKruimelpad('/beheer')).toEqual([
      { label: 'Overzicht', href: '/' },
      { label: 'Beheer', href: '/beheer' },
    ]);
  });

  it('should end with the audit crumb when on the audit page', () => {
    expect(bouwKruimelpad('/beheer/audit')).toEqual([
      { label: 'Overzicht', href: '/' },
      { label: 'Beheer', href: '/beheer' },
      { label: 'Audit', href: '/beheer/audit' },
    ]);
  });

  it('should name the new beheer pages', () => {
    expect(bouwKruimelpad('/beheer/vragenlijst').map((c) => c.label)).toEqual(['Overzicht', 'Beheer', 'Vragenlijst']);
    expect(bouwKruimelpad('/beheer/businessunits').at(-1)).toEqual({ label: 'Businessunits', href: '/beheer/businessunits' });
  });
});
