import { describe, expect, it } from 'vitest';

import { bevestigPlatformVervallen, bevestigVerwijderen } from './_catalogusApi';

const METINGEN = [
  { jaar: 2025, vastgelegd: true, heeftInhoud: true },
  { jaar: 2026, vastgelegd: false, heeftInhoud: false },
  { jaar: 2027, vastgelegd: false, heeftInhoud: false },
];

describe('bevestigVerwijderen', () => {
  it('should say frozen years stay unchanged and open years follow', () => {
    expect(bevestigVerwijderen('de vraag "AI"', METINGEN)).toBe(
      'Weet je zeker dat je de vraag "AI" wilt verwijderen? Eerdere, vastgelegde meetjaren (2025) blijven ongewijzigd. De open meetjaren (2026, 2027) nemen dit direct over.',
    );
  });
});

describe('bevestigPlatformVervallen', () => {
  it('should add that the filler links in the open years lapse too', () => {
    expect(bevestigPlatformVervallen('R&O', METINGEN)).toContain(
      'De koppelingen van invullers aan dit platform in de open meetjaren (2026, 2027) vervallen ook.',
    );
  });

  it('should not mention links when no year is open', () => {
    expect(bevestigPlatformVervallen('R&O', [METINGEN[0]!])).not.toContain('koppelingen');
  });
});
