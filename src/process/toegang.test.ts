import { afterEach, describe, expect, it } from 'vitest';

import { prisma } from '../data/prismaClient';
import { createMeting } from '../data/metingenRepository';
import { maakGebruiker, zetKoppelingen, type GebruikerRecord } from '../data/gebruikersRepository';
import { vereisActief, vereisPlatformSchrijfrecht, vereisRol } from './toegang';

afterEach(async () => {
  await prisma.platformInvuller.deleteMany();
  await prisma.gebruiker.deleteMany();
  await prisma.meting.deleteMany();
});

function gebruiker(overrides: Partial<GebruikerRecord> = {}): GebruikerRecord {
  return {
    id: 'g-1',
    email: 'jan@test.local',
    naam: 'Jan',
    rol: 'invuller',
    status: 'actief',
    keycloakSub: 'sub-1',
    aangemaakt: new Date(),
    laatsteLogin: null,
    ...overrides,
  };
}

describe('vereisActief', () => {
  it('401 zonder gebruiker', () => {
    expect(vereisActief(null)).toEqual({ ok: false, error: { status: 401, reden: 'geen-sessie' } });
  });

  it('geeft 403 voor een ingetrokken gebruiker met geldige sessie', () => {
    expect(vereisActief(gebruiker({ status: 'ingetrokken' }))).toEqual({
      ok: false,
      error: { status: 403, reden: 'niet-actief' },
    });
  });

  it('403 voor uitgenodigd-status', () => {
    expect(vereisActief(gebruiker({ status: 'uitgenodigd' }))).toEqual({
      ok: false,
      error: { status: 403, reden: 'niet-actief' },
    });
  });

  it('should pass an active user through unchanged', () => {
    const actief = gebruiker();
    expect(vereisActief(actief)).toEqual({ ok: true, data: actief });
  });
});

describe('vereisRol', () => {
  it('should refuse an invuller when beheerder is required', () => {
    expect(vereisRol(gebruiker(), 'beheerder')).toEqual({ ok: false, error: { status: 403, reden: 'rol' } });
  });

  it('should allow a beheerder when beheerder is required', () => {
    const beheerder = gebruiker({ rol: 'beheerder' });
    expect(vereisRol(beheerder, 'beheerder')).toEqual({ ok: true, data: beheerder });
  });
});

describe('vereisPlatformSchrijfrecht', () => {
  it('invuller zonder koppeling krijgt 403', async () => {
    const meting = await createMeting(2027);
    const invuller = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller', status: 'actief' });
    await zetKoppelingen(invuller.id, meting.id, ['ro']);

    const resultaat = await vereisPlatformSchrijfrecht(invuller, meting.id, 'belastingen');
    expect(resultaat).toEqual({ ok: false, error: { status: 403, reden: 'geen-koppeling' } });
  });

  it('invuller met koppeling mag schrijven', async () => {
    const meting = await createMeting(2027);
    const invuller = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller', status: 'actief' });
    await zetKoppelingen(invuller.id, meting.id, ['belastingen']);

    const resultaat = await vereisPlatformSchrijfrecht(invuller, meting.id, 'belastingen');
    expect(resultaat).toEqual({ ok: true, data: invuller });
  });

  it('beheerder mag elk platform schrijven', async () => {
    const meting = await createMeting(2027);
    const beheerder = await maakGebruiker({ email: 'bea@test.local', naam: 'Bea', rol: 'beheerder', status: 'actief' });

    const resultaat = await vereisPlatformSchrijfrecht(beheerder, meting.id, 'belastingen');
    expect(resultaat).toEqual({ ok: true, data: beheerder });
  });
});
