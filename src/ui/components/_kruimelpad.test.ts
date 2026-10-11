import { describe, expect, it } from 'vitest';
import { bouwKruimelpad } from './_kruimelpad';

describe('bouwKruimelpad', () => {
  it('should return only the home crumb when on the home page', () => {
    expect(bouwKruimelpad('/')).toEqual([{ label: 'Metingen', href: '/' }]);
  });

  it('should add the measurement year when on a meting page', () => {
    expect(bouwKruimelpad('/metingen/2026')).toEqual([
      { label: 'Metingen', href: '/' },
      { label: 'Meting 2026', href: '/metingen/2026' },
    ]);
  });

  it('should use the platform name from config when on the invulformulier', () => {
    expect(bouwKruimelpad('/metingen/2026/ro')).toEqual([
      { label: 'Metingen', href: '/' },
      { label: 'Meting 2026', href: '/metingen/2026' },
      { label: 'R&O', href: '/metingen/2026/ro' },
    ]);
  });

  it('should end with the result crumb when on a result page', () => {
    const crumbs = bouwKruimelpad('/metingen/2026/belastingen/resultaat');
    expect(crumbs.map((c) => c.label)).toEqual(['Metingen', 'Meting 2026', 'Belastingen', 'Resultaat']);
    expect(crumbs[3]?.href).toBe('/metingen/2026/belastingen/resultaat');
  });

  it('should fall back to the raw segment when the platform id is unknown', () => {
    expect(bouwKruimelpad('/metingen/2026/onbekend')[2]?.label).toBe('onbekend');
  });
});
