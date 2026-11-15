import { afterEach, describe, expect, it } from 'vitest';

import { herstelCatalogus } from '@/tests/support/catalogus-herstel';

import { prisma } from './prismaClient';
import {
  bewaarBusinessUnitScore,
  createMeting,
  getMetingByJaar,
  heropenBusinessUnit,
  listMetingen,
  listMetingenMetScores,
  type BusinessUnitOpslag,
} from './metingenRepository';

afterEach(async () => {
  await prisma.vraagScore.deleteMany();
  await prisma.businessUnitScore.deleteMany();
  await prisma.auditLogEntry.deleteMany();
  await prisma.meting.deleteMany();
  await herstelCatalogus(prisma);
});

const geenControle = () => null;

function opslag(metingId: string, overrides: Partial<BusinessUnitOpslag> = {}): BusinessUnitOpslag {
  return {
    metingId, jaar: 2027, businessUnitId: 'belastingen', status: 'concept', algemeneToelichting: '', aanwezigen: '',
    laatstGewijzigdDoor: 'test-user@lokaal', vraagScores: [], ...overrides,
  };
}

describe('metingenRepository', () => {
  it('maakt een meting aan en vindt die terug op jaar', async () => {
    await createMeting(2027);
    const meting = await getMetingByJaar(2027);
    expect(meting?.jaar).toBe(2027);
    expect(meting?.vastgelegd).toBe(false);
    expect(meting?.businessUnits).toEqual({});
  });

  it('lijst alle metingen, oudste eerst', async () => {
    await createMeting(2027);
    await createMeting(2026);
    const metingen = await listMetingen();
    expect(metingen.map((m) => m.jaar)).toEqual([2026, 2027]);
  });

  it('should list every meting with its business unit rows, oldest year first', async () => {
    const later = await createMeting(2028);
    await createMeting(2027);
    await bewaarBusinessUnitScore(opslag(later.id, {
      jaar: 2028, businessUnitId: 'ro', status: 'definitief', vraagScores: [{ vraagId: 'capaciteit-kennis', score: 4, toelichting: '' }],
    }), geenControle);
    const metingen = await listMetingenMetScores();
    expect(metingen.map((m) => m.jaar)).toEqual([2027, 2028]);
    expect(metingen[0]?.businessUnits).toEqual({});
    expect(metingen[1]?.businessUnits.ro?.status).toBe('definitief');
    expect(metingen[1]?.businessUnits.ro?.scoresPerAs.mens?.['capaciteit-kennis']).toBe(4);
  });

  it('should save a row with scores, comments and aanwezigen and freeze the year', async () => {
    const meting = await createMeting(2027);
    const resultaat = await bewaarBusinessUnitScore(opslag(meting.id, {
      algemeneToelichting: 'testopmerking', aanwezigen: 'Jan, Piet',
      vraagScores: [{ vraagId: 'common-ground-standaarden', score: 4, toelichting: 'onderbouwing' }],
    }), geenControle);
    expect(resultaat).toEqual({ ok: true });
    const result = await getMetingByJaar(2027);
    const rij = result?.businessUnits.belastingen;
    expect(result?.vastgelegd).toBe(true);
    expect(rij?.status).toBe('concept');
    expect(rij?.algemeneToelichting).toBe('testopmerking');
    expect(rij?.aanwezigen).toBe('Jan, Piet');
    expect(rij?.scoresPerAs.techniek!['common-ground-standaarden']).toBe(4);
    expect(rij?.toelichtingen['common-ground-standaarden']).toBe('onderbouwing');
  });

  it('should save aanwezigen with a definitief row and read it back', async () => {
    const meting = await createMeting(2027);
    await bewaarBusinessUnitScore(opslag(meting.id, { status: 'definitief', aanwezigen: 'Jan, Piet en Klaas' }), geenControle);
    const rij = (await getMetingByJaar(2027))?.businessUnits.belastingen;
    expect(rij).toMatchObject({ status: 'definitief', aanwezigen: 'Jan, Piet en Klaas' });
  });

  it('should freeze the year on a concept without any score', async () => {
    const meting = await createMeting(2027);
    await bewaarBusinessUnitScore(opslag(meting.id, { aanwezigen: 'Alleen aanwezigen' }), geenControle);
    expect((await getMetingByJaar(2027))?.vastgelegd).toBe(true);
    expect(await prisma.metingVraag.count({ where: { metingId: meting.id } })).toBe(16);
  });

  it('overschrijft een bestaande score bij een tweede keer opslaan (upsert, geen duplicaat)', async () => {
    const meting = await createMeting(2027);
    await bewaarBusinessUnitScore(opslag(meting.id, { vraagScores: [{ vraagId: 'common-ground-standaarden', score: 2, toelichting: '' }] }), geenControle);
    await bewaarBusinessUnitScore(opslag(meting.id, { vraagScores: [{ vraagId: 'common-ground-standaarden', score: 5, toelichting: '' }] }), geenControle);
    const result = await getMetingByJaar(2027);
    expect(result?.businessUnits.belastingen!.scoresPerAs.techniek!['common-ground-standaarden']).toBe(5);
    expect(await prisma.vraagScore.count()).toBe(1);
  });

  it('should roll back the save and the freeze when the check refuses', async () => {
    const meting = await createMeting(2027);
    let gezien: unknown = null;
    const resultaat = await bewaarBusinessUnitScore(opslag(meting.id), (context) => {
      gezien = context;
      return 'nee' as const;
    });
    expect(resultaat).toEqual({ ok: false, fout: 'nee' });
    expect(gezien).toMatchObject({ huidigeStatus: null, lijst: { jaar: 2027, vastgelegd: true } });
    expect(await prisma.businessUnitScore.count()).toBe(0);
    expect((await getMetingByJaar(2027))?.vastgelegd).toBe(false);
    expect(await prisma.metingVraag.count()).toBe(0);
  });

  it('schrijft een audit-log-regel bij elke save, met platform en businessunit', async () => {
    const meting = await createMeting(2027);
    await bewaarBusinessUnitScore(opslag(meting.id, { status: 'definitief' }), geenControle);
    const logs = await prisma.auditLogEntry.findMany();
    expect(logs).toHaveLength(1);
    expect(logs[0]!.actie).toBe('platform_afgerond');
    expect(logs[0]!.actor).toBe('test-user@lokaal');
    expect(logs[0]!.detail).toBe('platform=belastingen;businessunit=belastingen;jaar=2027');
  });

  it('should append the actor e-mail to the audit detail when actorEmail is given', async () => {
    const meting = await createMeting(2027);
    await bewaarBusinessUnitScore(opslag(meting.id, { laatstGewijzigdDoor: 'g-1', actorEmail: 'jan@test.local' }), geenControle);
    const logs = await prisma.auditLogEntry.findMany();
    expect(logs[0]!.detail).toBe('platform=belastingen;businessunit=belastingen;jaar=2027;email=jan@test.local');
  });

  it('heropenBusinessUnit zet definitief terug naar concept en schrijft audit', async () => {
    const meting = await createMeting(2027);
    await bewaarBusinessUnitScore(opslag(meting.id, { businessUnitId: 'ro', status: 'definitief', laatstGewijzigdDoor: 'invuller@test.local' }), geenControle);
    expect(await heropenBusinessUnit({ metingId: meting.id, businessUnitId: 'ro', actor: 'beheerder@test.local' })).toBe('heropend');

    const score = await prisma.businessUnitScore.findUniqueOrThrow({
      where: { metingId_businessUnitId: { metingId: meting.id, businessUnitId: 'ro' } },
    });
    expect(score.status).toBe('concept');
    expect(score.laatstGewijzigdDoor).toBe('beheerder@test.local');
    const audit = await prisma.auditLogEntry.findMany({ where: { actie: 'platform_heropend' } });
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ actor: 'beheerder@test.local', doelType: 'platform_score', doelId: score.id, detail: 'platform=ro;businessunit=ro;jaar=2027' });
  });

  it('heropenBusinessUnit geeft niet-definitief voor een concept en niet-gevonden zonder rij', async () => {
    const meting = await createMeting(2027);
    await bewaarBusinessUnitScore(opslag(meting.id, { businessUnitId: 'ro' }), geenControle);
    expect(await heropenBusinessUnit({ metingId: meting.id, businessUnitId: 'ro', actor: 'b' })).toBe('niet-definitief');
    expect(await heropenBusinessUnit({ metingId: meting.id, businessUnitId: 'onbekend', actor: 'b' })).toBe('niet-gevonden');
    expect(await prisma.auditLogEntry.count({ where: { actie: 'platform_heropend' } })).toBe(0);
  });
});
