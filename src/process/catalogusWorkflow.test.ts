import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { zoekAudit } from '@/src/data/auditRepository';
import { heeftKoppeling, maakGebruiker, zetKoppelingen, type GebruikerRecord } from '@/src/data/gebruikersRepository';
import { createMeting } from '@/src/data/metingenRepository';
import { prisma } from '@/src/data/prismaClient';
import { leesVragenlijst } from '@/src/data/vragenlijstRepository';
import { herstelCatalogus } from '@/tests/support/catalogus-herstel';
import { bewaarTestScore } from '@/tests/support/score-testdata';
import { STANDAARD_VRAAG_IDS } from '@/tests/support/vragenlijst-testdata';

import { geefMetingVrij, haalCatalogus, verplaats, voegToe, wijzig } from './catalogusWorkflow';

let bea: GebruikerRecord;

beforeEach(async () => {
  bea = await maakGebruiker({ email: 'bea@test.local', naam: 'Bea', rol: 'beheerder', status: 'actief' });
});

afterEach(async () => {
  await prisma.vraagScore.deleteMany();
  await prisma.businessUnitScore.deleteMany();
  await prisma.platformInvuller.deleteMany();
  await prisma.auditLogEntry.deleteMany();
  await prisma.meting.deleteMany();
  await prisma.gebruiker.deleteMany();
  await herstelCatalogus(prisma);
});

function fout(resultaat: { ok: boolean; error?: { status: number; detail: string } }) {
  return resultaat.ok ? null : resultaat.error!;
}

async function vastgelegdJaar(jaar: number) {
  const meting = await createMeting(jaar);
  await bewaarTestScore({ metingId: meting.id, jaar, businessUnitId: 'ro', status: 'concept', algemeneToelichting: '', laatstGewijzigdDoor: 't', vraagScores: [] });
  return meting;
}

describe('catalogusWorkflow rules', () => {
  it('should refuse removing a question when fewer than three active questions would remain', async () => {
    await prisma.vraag.updateMany({ where: { id: { in: STANDAARD_VRAAG_IDS.slice(3) } }, data: { vervallen: true } });
    const resultaat = await wijzig(bea, 'vraag', STANDAARD_VRAAG_IDS[0]!, { vervallen: true });
    expect(fout(resultaat)).toEqual({ status: 409, detail: 'Er moeten minstens 3 actieve vragen overblijven; een spinnenweb heeft 3 spaken nodig.' });
  });

  it('should refuse removing an axis that still has active questions, and allow it once empty', async () => {
    expect(fout(await wijzig(bea, 'as', 'mens', { vervallen: true }))?.detail).toBe('De as Mens heeft nog actieve vragen. Verplaats of verwijder die vragen eerst.');
    const leeg = await voegToe(bea, 'as', { naam: 'Leeg' });
    expect(leeg.ok && (await wijzig(bea, 'as', leeg.data.id, { vervallen: true })).ok).toBe(true);
  });

  it('should refuse removing a platform with active business units', async () => {
    expect(fout(await wijzig(bea, 'platform', 'ro', { vervallen: true }))).toEqual({
      status: 409, detail: 'Het platform R&O heeft nog actieve businessunits. Verplaats die eerst of laat ze eerst vervallen.',
    });
  });

  it('should give new business units the next free colours and refuse when none is free, never reusing a removed one', async () => {
    const kleuren: string[] = [];
    for (const naam of ['Zes', 'Zeven', 'Acht']) {
      const r = await voegToe(bea, 'businessunit', { naam, ouderId: 'ro' });
      if (r.ok) kleuren.push(r.data.kleur!);
      if (r.ok) await wijzig(bea, 'businessunit', r.data.id, { vervallen: true });
    }
    expect(kleuren).toEqual(['#8b5cf6', '#5b6b17', '#0aa3b8']);
    expect(fout(await voegToe(bea, 'businessunit', { naam: 'Negen', ouderId: 'ro' }))).toEqual({
      status: 409, detail: 'Er is geen kleur meer vrij voor een nieuwe businessunit (maximaal 8). Het palet moet eerst in de code worden uitgebreid.',
    });
  });

  it('should refuse restoring or moving a question into a removed axis', async () => {
    const as = await voegToe(bea, 'as', { naam: 'Tijdelijk' });
    if (!as.ok) throw new Error('as');
    const vraag = await voegToe(bea, 'vraag', { naam: 'Tekst', kort: 'Kort', ouderId: as.data.id });
    if (!vraag.ok) throw new Error('vraag');
    await wijzig(bea, 'vraag', vraag.data.id, { vervallen: true });
    await wijzig(bea, 'as', as.data.id, { vervallen: true });
    const melding = { status: 409, detail: 'De as Tijdelijk is verwijderd. Maak eerst de as weer actief.' };
    expect(fout(await wijzig(bea, 'vraag', vraag.data.id, { vervallen: false }))).toEqual(melding);
    expect(fout(await wijzig(bea, 'vraag', 'cloud-data', { ouderId: as.data.id }))).toEqual(melding);
    expect(fout(await voegToe(bea, 'vraag', { naam: 'X', kort: 'X', ouderId: as.data.id }))).toEqual(melding);
    await wijzig(bea, 'as', as.data.id, { vervallen: false });
    expect((await wijzig(bea, 'vraag', vraag.data.id, { vervallen: false })).ok).toBe(true);
  });

  it('should answer 404 for an unknown item or parent', async () => {
    expect(fout(await wijzig(bea, 'vraag', 'bestaat-niet', { naam: 'x' }))).toEqual({ status: 404, detail: 'Deze vraag bestaat niet.' });
    expect(fout(await voegToe(bea, 'businessunit', { naam: 'x', ouderId: 'bestaat-niet' }))).toEqual({ status: 404, detail: 'Dit platform bestaat niet.' });
  });
});

describe('catalogusWorkflow changes', () => {
  it('should change open years at once and never a frozen year', async () => {
    await vastgelegdJaar(2026);
    await createMeting(2027);
    await wijzig(bea, 'vraag', 'cloud-data', { naam: 'Nieuwe tekst', kort: 'Nieuw kort' });
    await wijzig(bea, 'businessunit', 'burgerzaken', { ouderId: 'ro' });
    const nieuw = await voegToe(bea, 'vraag', { naam: 'Extra', kort: 'Extra', ouderId: 'mens' });

    const vast = (await leesVragenlijst(2026))!;
    const open = (await leesVragenlijst(2027))!;
    expect(vast.assen[0]!.vragen[1]).toMatchObject({ id: 'cloud-data', tekst: expect.stringContaining('SaaS'), kort: 'Cloud & data' });
    expect(vast.businessUnits.find((b) => b.id === 'burgerzaken')?.platformId).toBe('burgerzaken');
    expect(vast.assen.flatMap((a) => a.vragen)).toHaveLength(16);
    expect(open.assen[0]!.vragen[1]).toMatchObject({ tekst: 'Nieuwe tekst', kort: 'Nieuw kort' });
    expect(open.platformen.find((p) => p.id === 'ro')?.businessUnitIds).toEqual(['ro', 'burgerzaken']);
    expect(nieuw.ok && open.assen[1]!.vragen.at(-1)?.id).toBe(nieuw.ok && nieuw.data.id);
  });

  it('should audit every write with the old and the new value', async () => {
    await wijzig(bea, 'businessunit', 'ro', { naam: 'Ruimte en Omgeving' });
    await verplaats(bea, 'as', 'proces', 'omhoog');
    const regels = await prisma.auditLogEntry.findMany({ orderBy: { tijdstip: 'asc' } });
    expect(regels.map((r) => [r.actie, r.doelType, r.doelId, r.actor])).toEqual([
      ['catalogus_gewijzigd', 'businessunit', 'ro', bea.id],
      ['catalogus_verplaatst', 'as', 'proces', bea.id],
    ]);
    expect(regels[0]!.detail).toBe('soort=businessunit;oud={"naam":"R&O"};nieuw={"naam":"Ruimte en Omgeving"}');
    expect(regels[1]!.detail).toBe('soort=as;richting=omhoog;oud=2;nieuw=1');
    expect((await haalCatalogus()).assen.map((a) => a.id)).toEqual(['techniek', 'proces', 'mens']);
  });

  it('should keep links, audit filter and URLs working after renaming a platform and its business unit', async () => {
    const meting = await createMeting(2027);
    const jan = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller', status: 'actief' });
    await zetKoppelingen(jan.id, meting.id, ['belastingen']);
    await bewaarTestScore({ metingId: meting.id, jaar: 2027, businessUnitId: 'belastingen', status: 'concept', algemeneToelichting: '', laatstGewijzigdDoor: jan.id, vraagScores: [] });
    await wijzig(bea, 'platform', 'belastingen', { naam: 'Financiën' });
    await wijzig(bea, 'businessunit', 'belastingen', { naam: 'Belastingen en heffingen' });

    expect(await heeftKoppeling(jan.id, meting.id, 'belastingen')).toBe(true);
    expect((await zoekAudit({ platformIds: ['belastingen'], limiet: 10 })).map((r) => r.actie)).toContain('platform_opgeslagen_concept');
    // The frozen year keeps the old name under the same key; an open year shows the new one.
    expect((await leesVragenlijst(2027))!.businessUnits.find((b) => b.id === 'belastingen')?.naam).toBe('Belastingen');
    await createMeting(2028);
    expect((await leesVragenlijst(2028))!.businessUnits.find((b) => b.id === 'belastingen')?.naam).toBe('Belastingen en heffingen');
  });

  it('should drop the filler links of a removed platform in open years only, audited', async () => {
    const vast = await vastgelegdJaar(2026);
    const open = await createMeting(2027);
    const jan = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller', status: 'actief' });
    const leeg = await voegToe(bea, 'platform', { naam: 'Tijdelijk' });
    if (!leeg.ok) throw new Error('platform');
    await prisma.platformInvuller.createMany({ data: [vast, open].map((m) => ({ metingId: m.id, platformId: leeg.data.id, gebruiker: jan.id })) });

    expect((await wijzig(bea, 'platform', leeg.data.id, { vervallen: true })).ok).toBe(true);
    expect(await heeftKoppeling(jan.id, open.id, leeg.data.id)).toBe(false);
    expect(await heeftKoppeling(jan.id, vast.id, leeg.data.id)).toBe(true);
    const audit = await prisma.auditLogEntry.findMany({ where: { actie: 'koppeling_verwijderd' } });
    expect(audit.map((a) => [a.doelId, a.detail])).toEqual([[jan.id, `platform=${leeg.data.id};jaar=2027;reden=platform-vervallen`]]);
  });

  it('should refuse moving past the edge and a removed item', async () => {
    expect(fout(await verplaats(bea, 'as', 'techniek', 'omhoog'))?.detail).toBe('Dit staat al bovenaan.');
    expect(fout(await verplaats(bea, 'vraag', 'opleiding-continuiteit', 'omlaag'))?.detail).toBe('Dit staat al onderaan.');
    await wijzig(bea, 'vraag', 'prijsbeleid', { vervallen: true });
    expect(fout(await verplaats(bea, 'vraag', 'prijsbeleid', 'omhoog'))?.status).toBe(409);
    expect((await verplaats(bea, 'vraag', 'cloud-data', 'omhoog')).ok).toBe(true);
    expect((await haalCatalogus()).vragen.filter((v) => v.ouderId === 'techniek').map((v) => v.id).slice(0, 2)).toEqual(['cloud-data', 'common-ground-standaarden']);
  });
});

describe('geefMetingVrij', () => {
  it('should unfreeze a year with only an empty concept and audit it', async () => {
    await vastgelegdJaar(2027);
    expect((await geefMetingVrij(bea, 2027)).ok).toBe(true);
    expect((await leesVragenlijst(2027))?.vastgelegd).toBe(false);
    expect(await prisma.auditLogEntry.count({ where: { actie: 'meting_vrijgegeven', detail: 'jaar=2027' } })).toBe(1);
  });

  it('should refuse a year with a score, an open year and an unknown year', async () => {
    const meting = await createMeting(2027);
    expect(fout(await geefMetingVrij(bea, 2027))?.detail).toBe('De vragenlijst van 2027 ligt nog niet vast.');
    await bewaarTestScore({ metingId: meting.id, jaar: 2027, businessUnitId: 'ro', status: 'concept', algemeneToelichting: '', laatstGewijzigdDoor: 't', vraagScores: [{ vraagId: 'cloud-data', score: 2, toelichting: '' }] });
    expect(fout(await geefMetingVrij(bea, 2027))).toEqual({ status: 409, detail: 'De vragenlijst van 2027 blijft vastliggen: er zijn al scores, toelichtingen of aanwezigen opgeslagen.' });
    expect(fout(await geefMetingVrij(bea, 2099))?.status).toBe(404);
  });
});
