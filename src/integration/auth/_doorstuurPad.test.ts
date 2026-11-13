import { describe, expect, it } from 'vitest';

import { veiligDoorstuurPad } from './_doorstuurPad';

const ORIGIN = 'http://localhost:3000';

describe('veiligDoorstuurPad', () => {
  it('should keep a same-origin path with query and hash', () => {
    expect(veiligDoorstuurPad('/metingen/2026?x=1', ORIGIN)).toBe('/metingen/2026?x=1');
    expect(veiligDoorstuurPad(`${ORIGIN}/metingen#a`, ORIGIN)).toBe('/metingen#a');
  });

  it('should return / for foreign, protocol-relative and backslash targets', () => {
    expect(veiligDoorstuurPad('/\\evil.example', ORIGIN)).toBe('/');
    expect(veiligDoorstuurPad('//evil.example', ORIGIN)).toBe('/');
    expect(veiligDoorstuurPad('https://evil.example', ORIGIN)).toBe('/');
    expect(veiligDoorstuurPad(`${ORIGIN}//evil.example`, ORIGIN)).toBe('/');
    expect(veiligDoorstuurPad('javascript:alert(1)', ORIGIN)).toBe('/');
    expect(veiligDoorstuurPad(null, ORIGIN)).toBe('/');
  });
});
