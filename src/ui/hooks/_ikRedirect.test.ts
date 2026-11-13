import { describe, expect, it } from 'vitest';

import { bepaalRedirect } from './_ikRedirect';

describe('bepaalRedirect', () => {
  it('should send a 401 to the login page with the current path as callbackUrl', () => {
    expect(bepaalRedirect(401, '/metingen/2026', '?tab=2')).toBe('/inloggen?callbackUrl=%2Fmetingen%2F2026%3Ftab%3D2');
    expect(bepaalRedirect(401, '/', '')).toBe('/inloggen?callbackUrl=%2F');
  });

  it('should send a 403 to /geen-toegang', () => {
    expect(bepaalRedirect(403, '/', '')).toBe('/geen-toegang');
    expect(bepaalRedirect(403, '/beheer', '?x=1')).toBe('/geen-toegang');
  });

  it('should not redirect on success or other errors', () => {
    expect(bepaalRedirect(200, '/', '')).toBeNull();
    expect(bepaalRedirect(500, '/', '')).toBeNull();
  });

  it('should never redirect from the login and geen-toegang pages', () => {
    expect(bepaalRedirect(401, '/inloggen', '?callbackUrl=%2F')).toBeNull();
    expect(bepaalRedirect(401, '/inloggen/doorsturen', '?naar=%2F')).toBeNull();
    expect(bepaalRedirect(403, '/geen-toegang', '')).toBeNull();
    expect(bepaalRedirect(401, '/geen-toegang', '')).toBeNull();
  });
});
