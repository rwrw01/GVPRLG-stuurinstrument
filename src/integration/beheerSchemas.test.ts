import { describe, expect, it } from 'vitest';

import {
  AuditFilterSchema,
  GebruikerWijzigenSchema,
  KoppelingenSchema,
  GebruikerToevoegenSchema,
} from './beheerSchemas';

const GELDIG = { email: 'jan@test.local', naam: 'Jan', rol: 'invuller', jaar: 2027, platformIds: ['belastingen'] };

describe('GebruikerToevoegenSchema', () => {
  it('normaliseert e-mail', () => {
    const result = GebruikerToevoegenSchema.safeParse({ ...GELDIG, email: '  Jan.Jansen@Test.LOCAL ' });
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe('jan.jansen@test.local');
  });

  it('should check the platform format only and refuse a duplicate; the year list decides existence', () => {
    expect(GebruikerToevoegenSchema.safeParse({ ...GELDIG, platformIds: ['een-nieuw-platform'] }).success).toBe(true);
    expect(GebruikerToevoegenSchema.safeParse({ ...GELDIG, platformIds: ['ro', 'ro'] }).success).toBe(false);
    expect(GebruikerToevoegenSchema.safeParse({ ...GELDIG, platformIds: [''] }).success).toBe(false);
  });

  it('accepteert een gebruiker zonder platformen', () => {
    expect(GebruikerToevoegenSchema.safeParse({ ...GELDIG, platformIds: [] }).success).toBe(true);
  });

  it('should accept rol lezer and refuse an unknown rol', () => {
    expect(GebruikerToevoegenSchema.safeParse({ ...GELDIG, rol: 'lezer', platformIds: [] }).success).toBe(true);
    expect(GebruikerToevoegenSchema.safeParse({ ...GELDIG, rol: 'kijker' }).success).toBe(false);
  });
});

describe('KoppelingenSchema', () => {
  it('should refuse a duplicate platform', () => {
    expect(KoppelingenSchema.safeParse({ jaar: 2027, platformIds: ['ro', 'ro'] }).success).toBe(false);
  });
});

describe('GebruikerWijzigenSchema', () => {
  it('accepteert een rolwijziging en weigert een onbekende actie', () => {
    expect(GebruikerWijzigenSchema.safeParse({ actie: 'rol', rol: 'beheerder' }).success).toBe(true);
    expect(GebruikerWijzigenSchema.safeParse({ actie: 'verwijderen' }).success).toBe(false);
  });

  it('should accept a role change to lezer', () => {
    expect(GebruikerWijzigenSchema.safeParse({ actie: 'rol', rol: 'lezer' }).success).toBe(true);
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
