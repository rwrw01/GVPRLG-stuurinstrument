import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../data/prismaClient';
import {
  bindKeycloakSub,
  maakGebruiker,
  vindGebruikerOpId,
  zetKoppelingen,
  type GebruikerRecord,
} from '../data/gebruikersRepository';
import { createMeting } from '../data/metingenRepository';
import { voegVoorzitterToe, wijzigGebruikerDoorBeheerder, zetKoppelingenDoorBeheerder } from './beheerWorkflow';

let beheerder: GebruikerRecord;

beforeEach(async () => {
  beheerder = await maakGebruiker({ email: 'bea@test.local', naam: 'Bea', rol: 'beheerder', status: 'actief' });
});

afterEach(async () => {
  await prisma.auditLogEntry.deleteMany();
  await prisma.platformInvuller.deleteMany();
  await prisma.meting.deleteMany();
  await prisma.gebruiker.deleteMany();
});

const INVOER = { email: 'jan@test.local', naam: 'Jan', rol: 'invuller' as const, jaar: 2027, platformIds: ['ro', 'belastingen'] };

async function tweedeBeheerder(): Promise<GebruikerRecord> {
  return maakGebruiker({ email: 'bob@test.local', naam: 'Bob', rol: 'beheerder', status: 'actief' });
}

describe('voegVoorzitterToe', () => {
  it('voegt voorzitter toe met koppelingen en audit', async () => {
    const meting = await createMeting(2027);

    const resultaat = await voegVoorzitterToe(beheerder, INVOER);

    expect(resultaat).toMatchObject({ ok: true, data: { email: 'jan@test.local', rol: 'invuller', status: 'uitgenodigd' } });
    if (!resultaat.ok) return;
    const koppelingen = await prisma.platformInvuller.findMany({ where: { metingId: meting.id, gebruiker: resultaat.data.id } });
    expect(koppelingen.map((k) => k.platformId).sort()).toEqual(['belastingen', 'ro']);
    const toegevoegd = await prisma.auditLogEntry.findMany({ where: { actie: 'gebruiker_toegevoegd' } });
    expect(toegevoegd).toHaveLength(1);
    expect(toegevoegd[0]).toMatchObject({
      actor: beheerder.id,
      doelType: 'gebruiker',
      doelId: resultaat.data.id,
      detail: 'email=jan@test.local;rol=invuller',
    });
    const koppelAudit = await prisma.auditLogEntry.findMany({ where: { actie: 'koppeling_toegevoegd' } });
    expect(koppelAudit.map((a) => a.detail).sort()).toEqual([
      'platform=belastingen;jaar=2027;gebruiker=jan@test.local',
      'platform=ro;jaar=2027;gebruiker=jan@test.local',
    ]);
  });

  it('weigert een bestaand e-mailadres (ongeacht hoofdletters)', async () => {
    await createMeting(2027);
    await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller' });

    const resultaat = await voegVoorzitterToe(beheerder, { ...INVOER, email: 'JAN@Test.local' });

    expect(resultaat).toEqual({ ok: false, error: 'bestaat-al' });
    expect(await prisma.gebruiker.count()).toBe(2);
    expect(await prisma.auditLogEntry.count()).toBe(0);
  });

  it('weigert een onbekend meetjaar', async () => {
    const resultaat = await voegVoorzitterToe(beheerder, INVOER);

    expect(resultaat).toEqual({ ok: false, error: 'meting-onbekend' });
    expect(await prisma.gebruiker.count()).toBe(1);
  });
});

describe('wijzigGebruikerDoorBeheerder', () => {
  it('weigert dat een beheerder zichzelf degradeert of intrekt', async () => {
    await tweedeBeheerder();

    expect(await wijzigGebruikerDoorBeheerder(beheerder, beheerder.id, { actie: 'rol', rol: 'invuller' })).toEqual({
      ok: false,
      error: 'zelfbescherming',
    });
    expect(await wijzigGebruikerDoorBeheerder(beheerder, beheerder.id, { actie: 'intrekken' })).toEqual({
      ok: false,
      error: 'zelfbescherming',
    });
    expect(await vindGebruikerOpId(beheerder.id)).toMatchObject({ rol: 'beheerder', status: 'actief' });
    expect(await prisma.auditLogEntry.count()).toBe(0);
  });

  it('weigert het degraderen van de laatste beheerder', async () => {
    // The acting beheerder is no longer active, so the target is the only active beheerder.
    const doel = await tweedeBeheerder();
    await prisma.gebruiker.update({ where: { id: beheerder.id }, data: { status: 'ingetrokken' } });

    const resultaat = await wijzigGebruikerDoorBeheerder(beheerder, doel.id, { actie: 'rol', rol: 'invuller' });

    expect(resultaat).toEqual({ ok: false, error: 'laatste-beheerder' });
    expect(await vindGebruikerOpId(doel.id)).toMatchObject({ rol: 'beheerder' });
  });

  it('weigert het intrekken van de laatste beheerder', async () => {
    const doel = await tweedeBeheerder();
    await prisma.gebruiker.update({ where: { id: beheerder.id }, data: { status: 'ingetrokken' } });

    const resultaat = await wijzigGebruikerDoorBeheerder(beheerder, doel.id, { actie: 'intrekken' });

    expect(resultaat).toEqual({ ok: false, error: 'laatste-beheerder' });
    expect(await vindGebruikerOpId(doel.id)).toMatchObject({ status: 'actief' });
  });

  it('wijzigt de rol van een andere beheerder met audit', async () => {
    const doel = await tweedeBeheerder();

    const resultaat = await wijzigGebruikerDoorBeheerder(beheerder, doel.id, { actie: 'rol', rol: 'invuller' });

    expect(resultaat).toMatchObject({ ok: true, data: { id: doel.id, rol: 'invuller' } });
    const audit = await prisma.auditLogEntry.findMany({ where: { actie: 'rol_gewijzigd' } });
    expect(audit[0]).toMatchObject({ actor: beheerder.id, doelId: doel.id, detail: 'van=beheerder;naar=invuller;email=bob@test.local' });
  });

  it('trekt toegang in en herstelt die met audit', async () => {
    const jan = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller' });
    await bindKeycloakSub(jan.id, 'sub-jan');

    expect(await wijzigGebruikerDoorBeheerder(beheerder, jan.id, { actie: 'intrekken' })).toMatchObject({
      ok: true,
      data: { status: 'ingetrokken' },
    });
    expect(await wijzigGebruikerDoorBeheerder(beheerder, jan.id, { actie: 'herstellen' })).toMatchObject({
      ok: true,
      data: { status: 'actief' },
    });
    expect(await prisma.auditLogEntry.count({ where: { actie: 'toegang_ingetrokken', detail: 'email=jan@test.local' } })).toBe(1);
    expect(await prisma.auditLogEntry.count({ where: { actie: 'toegang_hersteld', detail: 'email=jan@test.local' } })).toBe(1);
  });

  it('herstelt een nooit ingelogde gebruiker naar uitgenodigd', async () => {
    const jan = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller', status: 'ingetrokken' });

    const resultaat = await wijzigGebruikerDoorBeheerder(beheerder, jan.id, { actie: 'herstellen' });

    expect(resultaat).toMatchObject({ ok: true, data: { status: 'uitgenodigd' } });
  });

  it('ontkoppelt keycloakSub zodat de volgende login opnieuw bindt', async () => {
    const jan = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller' });
    await bindKeycloakSub(jan.id, 'sub-jan');

    const resultaat = await wijzigGebruikerDoorBeheerder(beheerder, jan.id, { actie: 'ontkoppelAccount' });

    expect(resultaat).toMatchObject({ ok: true, data: { keycloakSub: null, status: 'uitgenodigd' } });
    const audit = await prisma.auditLogEntry.findMany({ where: { actie: 'account_ontkoppeld' } });
    expect(audit[0]).toMatchObject({ actor: beheerder.id, doelId: jan.id, detail: 'email=jan@test.local' });
    expect(audit[0]?.detail).not.toContain('sub-jan');
  });

  it('weigert dat een beheerder zijn eigen account ontkoppelt', async () => {
    await tweedeBeheerder();
    await bindKeycloakSub(beheerder.id, 'sub-bea');

    const resultaat = await wijzigGebruikerDoorBeheerder(beheerder, beheerder.id, { actie: 'ontkoppelAccount' });

    expect(resultaat).toEqual({ ok: false, error: 'zelfbescherming' });
    expect(await vindGebruikerOpId(beheerder.id)).toMatchObject({ keycloakSub: 'sub-bea', status: 'actief' });
    expect(await prisma.auditLogEntry.count()).toBe(0);
  });

  it('weigert het ontkoppelen van de laatste beheerder', async () => {
    const doel = await tweedeBeheerder();
    await bindKeycloakSub(doel.id, 'sub-bob');
    await prisma.gebruiker.update({ where: { id: beheerder.id }, data: { status: 'ingetrokken' } });

    const resultaat = await wijzigGebruikerDoorBeheerder(beheerder, doel.id, { actie: 'ontkoppelAccount' });

    expect(resultaat).toEqual({ ok: false, error: 'laatste-beheerder' });
    expect(await vindGebruikerOpId(doel.id)).toMatchObject({ keycloakSub: 'sub-bob', status: 'actief' });
  });

  it('geeft niet-gevonden voor een onbekende gebruiker', async () => {
    expect(await wijzigGebruikerDoorBeheerder(beheerder, 'bestaat-niet', { actie: 'intrekken' })).toEqual({
      ok: false,
      error: 'niet-gevonden',
    });
  });
});

describe('zetKoppelingenDoorBeheerder', () => {
  it('zetKoppelingen schrijft audit per toegevoegd en verwijderd platform', async () => {
    const meting = await createMeting(2027);
    const jan = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller' });
    await zetKoppelingen(jan.id, meting.id, ['ro', 'belastingen']);

    const resultaat = await zetKoppelingenDoorBeheerder(beheerder, jan.id, 2027, ['ro', 'burgerzaken']);

    expect(resultaat).toEqual({ ok: true, data: { toegevoegd: ['burgerzaken'], verwijderd: ['belastingen'] } });
    const audit = await prisma.auditLogEntry.findMany({ where: { doelType: 'platform_invuller' } });
    expect(audit.map((a) => [a.actie, a.actor, a.doelId, a.detail]).sort()).toEqual([
      ['koppeling_toegevoegd', beheerder.id, jan.id, 'platform=burgerzaken;jaar=2027;gebruiker=jan@test.local'],
      ['koppeling_verwijderd', beheerder.id, jan.id, 'platform=belastingen;jaar=2027;gebruiker=jan@test.local'],
    ]);
  });

  it('geeft niet-gevonden en meting-onbekend', async () => {
    await createMeting(2027);
    const jan = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller' });

    expect(await zetKoppelingenDoorBeheerder(beheerder, 'bestaat-niet', 2027, ['ro'])).toEqual({ ok: false, error: 'niet-gevonden' });
    expect(await zetKoppelingenDoorBeheerder(beheerder, jan.id, 2030, ['ro'])).toEqual({ ok: false, error: 'meting-onbekend' });
  });
});
