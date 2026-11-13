import { describe, expect, it } from 'vitest';

import {
  AuditFilterSchema,
  GebruikerWijzigenSchema,
  KoppelingenSchema,
  VoorzitterToevoegenSchema,
} from './beheerSchemas';

const GELDIG = { email: 'jan@test.local', naam: 'Jan', rol: 'invuller', jaar: 2027, platformIds: ['belastingen'] };

describe('VoorzitterToevoegenSchema', () => {
  it('normaliseert e-mail', () => {
    const result = VoorzitterToevoegenSchema.safeParse({ ...GELDIG, email: '  Jan.Jansen@Test.LOCAL ' });
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe('jan.jansen@test.local');
  });

  it('weigert onbekend platform', () => {
    expect(VoorzitterToevoegenSchema.safeParse({ ...GELDIG, platformIds: ['bestaat-niet'] }).success).toBe(false);
  });

  it('accepteert een gebruiker zonder platformen', () => {
    expect(VoorzitterToevoegenSchema.safeParse({ ...GELDIG, platformIds: [] }).success).toBe(true);
  });
});

describe('KoppelingenSchema', () => {
  it('weigert onbekend platform', () => {
    expect(KoppelingenSchema.safeParse({ jaar: 2027, platformIds: ['ro', 'onbekend'] }).success).toBe(false);
  });
});

describe('GebruikerWijzigenSchema', () => {
  it('accepteert een rolwijziging en weigert een onbekende actie', () => {
    expect(GebruikerWijzigenSchema.safeParse({ actie: 'rol', rol: 'beheerder' }).success).toBe(true);
    expect(GebruikerWijzigenSchema.safeParse({ actie: 'verwijderen' }).success).toBe(false);
  });
});

describe('AuditFilterSchema', () => {
  it('weigert limiet 0 en 501', () => {
    expect(AuditFilterSchema.safeParse({ limiet: '0' }).success).toBe(false);
    expect(AuditFilterSchema.safeParse({ limiet: '501' }).success).toBe(false);
  });

  it('zet limiet standaard op 200 en zet querystrings om naar getallen', () => {
    const result = AuditFilterSchema.safeParse({ jaar: '2027' });
    expect(result.data).toEqual({ jaar: 2027, limiet: 200 });
  });
});
