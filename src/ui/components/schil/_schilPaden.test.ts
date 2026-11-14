import { describe, expect, it } from 'vitest';

import { huidigeStand, zonderMenu } from './_schilPaden';

describe('zonderMenu', () => {
  it('should hide the menu on the pages without a session', () => {
    expect(zonderMenu('/inloggen')).toBe(true);
    expect(zonderMenu('/inloggen/doorsturen')).toBe(true);
    expect(zonderMenu('/geen-toegang/')).toBe(true);
  });

  it('should show the menu on every app page', () => {
    expect(zonderMenu('/')).toBe(false);
    expect(zonderMenu('/metingen/2026')).toBe(false);
    expect(zonderMenu('/beheer/audit')).toBe(false);
  });
});

describe('huidigeStand', () => {
  it('should mark the page itself and, when asked, the pages below it', () => {
    expect(huidigeStand('/metingen/2026', '/metingen/2026', true)).toBe('page');
    expect(huidigeStand('/metingen/2026/ro', '/metingen/2026', true)).toBe('location');
    expect(huidigeStand('/metingen/2026/ro', '/metingen/2026')).toBeUndefined();
    expect(huidigeStand('/metingen/20261', '/metingen/2026', true)).toBeUndefined();
    expect(huidigeStand('/beheer', '/')).toBeUndefined();
  });
});
