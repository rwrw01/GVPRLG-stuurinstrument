import { afterEach, describe, expect, it } from 'vitest';

import { herstelCatalogus } from '@/tests/support/catalogus-herstel';
import { standaardLijst, STANDAARD_VRAAG_IDS } from '@/tests/support/vragenlijst-testdata';

import { createMeting } from './metingenRepository';
import { prisma } from './prismaClient';
import { geefVrij, legVast, leesVragenlijst, leesVragenlijsten, vergrendelCatalogus } from './vragenlijstRepository';

afterEach(async () => {
  await prisma.vraagScore.deleteMany();
  await prisma.businessUnitScore.deleteMany();
  await prisma.auditLogEntry.deleteMany();
  await prisma.meting.deleteMany();
  await herstelCatalogus(prisma);
});

async function vastgelegdeMeting(jaar: number) {
  const meting = await createMeting(jaar);
  await prisma.$transaction((tx) => legVast(tx, meting.id));
  return meting;
}

describe('vragenlijstRepository', () => {
  it('should hold exactly the former config list (3 axes, 16 questions, 5 platforms, 5 business units) after migration', async () => {
    await createMeting(2027);
    const lijst = await leesVragenlijst(2027);
    expect(lijst).toEqual(standaardLijst(2027, false));
    expect(lijst?.assen).toHaveLength(3);
    expect(lijst?.assen.flatMap((a) => a.vragen)).toHaveLength(16);
    expect(lijst?.platformen).toHaveLength(5);
    expect(lijst?.businessUnits).toHaveLength(5);
  });

  it('should return null for a year without meting', async () => {
    expect(await leesVragenlijst(2099)).toBeNull();
  });

  it('should return the frozen copy for a frozen year and the catalogue for an open year', async () => {
    await vastgelegdeMeting(2027);
    await createMeting(2028);
    await prisma.vraag.update({ where: { id: 'cloud-data' }, data: { tekst: 'Nieuwe tekst' } });
    await prisma.businessUnit.update({ where: { id: 'ro' }, data: { vervallen: true } });

    const vast = await leesVragenlijst(2027);
    const open = await leesVragenlijst(2028);
    expect(vast).toEqual(standaardLijst(2027, true));
    expect(open?.vastgelegd).toBe(false);
    expect(open?.assen[0]?.vragen[1]?.tekst).toBe('Nieuwe tekst');
    expect(open?.businessUnits.map((b) => b.id)).not.toContain('ro');
    const alle = await leesVragenlijsten();
    expect(alle.get(2027)).toEqual(vast);
    expect(alle.get(2028)).toEqual(open);
  });

  it('should leave an axis without active questions out of the list', async () => {
    const as = await prisma.as.create({ data: { naam: 'Leeg', kleur: '#8B4FD8', volgorde: 9 } });
    await createMeting(2027);
    expect((await leesVragenlijst(2027))?.assen.map((a) => a.id)).not.toContain(as.id);
  });

  it('should make exactly one copy when two first saves freeze the same year at the same moment', async () => {
    const meting = await createMeting(2027);
    const resultaten = await Promise.all([
      prisma.$transaction((tx) => legVast(tx, meting.id)),
      prisma.$transaction((tx) => legVast(tx, meting.id)),
    ]);
    expect(resultaten).toEqual(['vastgelegd', 'vastgelegd']);
    expect(await prisma.metingVraag.count({ where: { metingId: meting.id } })).toBe(16);
    expect(await prisma.metingBusinessUnit.count({ where: { metingId: meting.id } })).toBe(5);
    expect(await prisma.metingAs.count({ where: { metingId: meting.id } })).toBe(3);
  });

  it('should refuse to freeze below three active questions and copy nothing', async () => {
    await prisma.vraag.updateMany({ where: { id: { in: STANDAARD_VRAAG_IDS.slice(2) } }, data: { vervallen: true } });
    const meting = await createMeting(2027);
    expect(await prisma.$transaction((tx) => legVast(tx, meting.id))).toBe('te-weinig-vragen');
    expect(await prisma.metingVraag.count()).toBe(0);
    expect((await prisma.meting.findUnique({ where: { id: meting.id } }))?.vastgelegdOp).toBeNull();
  });

  it('should let the database refuse a score for a question or business unit not in the year copy', async () => {
    const meting = await vastgelegdeMeting(2027);
    const later = await prisma.vraag.create({ data: { asId: 'mens', kort: 'Later', tekst: 'Later toegevoegd', volgorde: 9 } });
    const nieuweUnit = await prisma.businessUnit.create({ data: { platformId: 'ro', naam: 'Nieuw', kleur: '#8b5cf6', volgorde: 1 } });
    const rij = await prisma.businessUnitScore.create({ data: { metingId: meting.id, businessUnitId: 'ro', laatstGewijzigdDoor: 't' } });

    await expect(prisma.vraagScore.create({ data: { businessUnitScoreId: rij.id, metingId: meting.id, vraagId: later.id, score: 3 } })).rejects.toThrow();
    await expect(prisma.businessUnitScore.create({ data: { metingId: meting.id, businessUnitId: nieuweUnit.id, laatstGewijzigdDoor: 't' } })).rejects.toThrow();
    await prisma.vraagScore.create({ data: { businessUnitScoreId: rij.id, metingId: meting.id, vraagId: 'cloud-data', score: 3 } });
    expect(await prisma.vraagScore.count()).toBe(1);
  });

  it('should refuse a score row of one year that points at the copy of another year', async () => {
    const eerste = await vastgelegdeMeting(2026);
    const tweede = await vastgelegdeMeting(2027);
    const rij = await prisma.businessUnitScore.create({ data: { metingId: eerste.id, businessUnitId: 'ro', laatstGewijzigdDoor: 't' } });
    await expect(prisma.vraagScore.create({ data: { businessUnitScoreId: rij.id, metingId: tweede.id, vraagId: 'cloud-data', score: 3 } })).rejects.toThrow();
  });

  it('should refuse to unfreeze a year whose only content is a comment on one question', async () => {
    const meting = await vastgelegdeMeting(2027);
    const rij = await prisma.businessUnitScore.create({ data: { metingId: meting.id, businessUnitId: 'ro', laatstGewijzigdDoor: 't' } });
    await prisma.vraagScore.create({ data: { businessUnitScoreId: rij.id, metingId: meting.id, vraagId: 'cloud-data', score: null, toelichting: 'Alleen een opmerking' } });
    expect(await geefVrij(meting.id, async () => undefined)).toBe('heeft-inhoud');
    expect((await leesVragenlijst(2027))?.vastgelegd).toBe(true);
    expect(await prisma.vraagScore.count()).toBe(1);
  });

  it('should wait for a running catalogue write before unfreezing (shared catalogue lock)', async () => {
    const meting = await vastgelegdeMeting(2027);
    const volgorde: string[] = [];
    let losLaten = () => undefined as void;
    const vastgehouden = new Promise<void>((klaar) => {
      losLaten = klaar;
    });
    let vergrendeld = () => undefined as void;
    const isVergrendeld = new Promise<void>((klaar) => {
      vergrendeld = klaar;
    });
    const schrijver = prisma.$transaction(async (tx) => {
      await vergrendelCatalogus(tx, 'exclusief');
      vergrendeld();
      await vastgehouden;
      volgorde.push('schrijver klaar');
    });
    await isVergrendeld;
    const vrijgave = geefVrij(meting.id, async () => {
      volgorde.push('vrijgave');
    });
    await new Promise((r) => setTimeout(r, 300));
    expect(volgorde).toEqual([]);
    losLaten();
    await schrijver;
    expect(await vrijgave).toBe('vrijgegeven');
    expect(volgorde).toEqual(['schrijver klaar', 'vrijgave']);
  });

  it('should unfreeze a year whose rows are empty and refuse a year with any content', async () => {
    const meting = await vastgelegdeMeting(2027);
    const rij = await prisma.businessUnitScore.create({ data: { metingId: meting.id, businessUnitId: 'ro', laatstGewijzigdDoor: 't' } });
    await prisma.vraagScore.create({ data: { businessUnitScoreId: rij.id, metingId: meting.id, vraagId: 'cloud-data', score: null } });
    let geaudit = 0;
    const audit = async () => {
      geaudit += 1;
    };

    await prisma.businessUnitScore.update({ where: { id: rij.id }, data: { aanwezigen: 'Jan' } });
    expect(await geefVrij(meting.id, audit)).toBe('heeft-inhoud');
    await prisma.businessUnitScore.update({ where: { id: rij.id }, data: { aanwezigen: '' } });

    expect(await geefVrij(meting.id, audit)).toBe('vrijgegeven');
    expect(geaudit).toBe(1);
    expect(await prisma.metingVraag.count()).toBe(0);
    expect(await prisma.businessUnitScore.count()).toBe(0);
    expect(await geefVrij(meting.id, audit)).toBe('niet-vastgelegd');
    expect((await leesVragenlijst(2027))?.vastgelegd).toBe(false);
  });
});
