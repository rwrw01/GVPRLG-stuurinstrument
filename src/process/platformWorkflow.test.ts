import { afterEach, describe, expect, it } from 'vitest';

import { createMeting, getMetingByJaar } from '@/src/data/metingenRepository';
import { prisma } from '@/src/data/prismaClient';
import { leesVragenlijst } from '@/src/data/vragenlijstRepository';
import { herstelCatalogus } from '@/tests/support/catalogus-herstel';
import { standaardLijst, STANDAARD_VRAAG_IDS } from '@/tests/support/vragenlijst-testdata';

import { controleerOpslag, slaBusinessUnitOp, valideerVoorAfronden, type BusinessUnitInvoer } from './platformWorkflow';

const LIJST = standaardLijst(2027, true);
const RO = LIJST.businessUnits.find((b) => b.id === 'ro')!;

function invoer(overrides: Partial<BusinessUnitInvoer> = {}): BusinessUnitInvoer {
  return { status: 'concept', algemeneToelichting: '', aanwezigen: '', vraagScores: [], ...overrides };
}

describe('valideerVoorAfronden', () => {
  it('geeft null als alle vragen een score hebben', () => {
    expect(valideerVoorAfronden(LIJST, STANDAARD_VRAAG_IDS.map((id) => ({ vraagId: id, score: 3 })))).toBeNull();
  });

  it('geeft een foutmelding met de ontbrekende vraag-id als er scores missen', () => {
    const fout = valideerVoorAfronden(LIJST, STANDAARD_VRAAG_IDS.slice(1).map((id) => ({ vraagId: id, score: 3 })));
    expect(fout).toContain(STANDAARD_VRAAG_IDS[0]);
    expect(fout).toContain('Vul alle vragen in');
  });

  it('behandelt een null-score als niet ingevuld', () => {
    const fout = valideerVoorAfronden(LIJST, STANDAARD_VRAAG_IDS.map((id) => ({ vraagId: id, score: id === STANDAARD_VRAAG_IDS[0] ? null : 3 })));
    expect(fout).toContain(STANDAARD_VRAAG_IDS[0]);
  });

  it('should only require the questions of the year list', () => {
    const lijst = standaardLijst();
    lijst.assen = lijst.assen.slice(0, 1);
    expect(valideerVoorAfronden(lijst, lijst.assen[0]!.vragen.map((v) => ({ vraagId: v.id, score: 2 })))).toBeNull();
  });
});

describe('controleerOpslag', () => {
  it('should refuse with a Dutch 400 a question that is not in the list of the year', () => {
    const fout = controleerOpslag(RO, invoer({ vraagScores: [{ vraagId: 'nieuwe-vraag', score: 3, toelichting: '' }] }), { lijst: LIJST, huidigeStatus: null });
    expect(fout).toEqual({ status: 400, titel: 'Ongeldige invoer', detail: 'Deze vraag hoort niet bij de vragenlijst van 2027.' });
  });

  it('should refuse with 409 a row that is already definitief', () => {
    expect(controleerOpslag(RO, invoer(), { lijst: LIJST, huidigeStatus: 'definitief' })?.status).toBe(409);
  });

  it('should refuse with 409 when the unit left the list or moved to another platform since the access check', () => {
    const verplaatst = { ...RO, platformId: 'belastingen' };
    expect(controleerOpslag(verplaatst, invoer(), { lijst: LIJST, huidigeStatus: null })?.detail).toContain('net gewijzigd');
    expect(controleerOpslag({ ...RO, id: 'weg' }, invoer(), { lijst: LIJST, huidigeStatus: null })?.status).toBe(409);
  });

  it('should refuse with 422 finalising an incomplete row and pass a complete one', () => {
    expect(controleerOpslag(RO, invoer({ status: 'definitief' }), { lijst: LIJST, huidigeStatus: 'concept' })?.status).toBe(422);
    const volledig = STANDAARD_VRAAG_IDS.map((id) => ({ vraagId: id, score: 4, toelichting: '' }));
    expect(controleerOpslag(RO, invoer({ status: 'definitief', vraagScores: volledig }), { lijst: LIJST, huidigeStatus: 'concept' })).toBeNull();
  });
});

describe('slaBusinessUnitOp', () => {
  const gebruiker = { id: 'g-1', email: 'jan@test.local' };

  afterEach(async () => {
    await prisma.vraagScore.deleteMany();
    await prisma.businessUnitScore.deleteMany();
    await prisma.auditLogEntry.deleteMany();
    await prisma.meting.deleteMany();
    await herstelCatalogus(prisma);
  });

  it('should make exactly one copy and land both saves when two first saves of an open year run at once', async () => {
    const meting = await createMeting(2027);
    const lijst = (await leesVragenlijst(2027))!;
    const unit = (id: string) => lijst.businessUnits.find((b) => b.id === id)!;
    const score = (vraagId: string) => invoer({ vraagScores: [{ vraagId, score: 3, toelichting: '' }] });
    const resultaten = await Promise.all([
      slaBusinessUnitOp(gebruiker, meting, unit('ro'), score('cloud-data')),
      slaBusinessUnitOp(gebruiker, meting, unit('belastingen'), score('prijsbeleid')),
    ]);
    expect(resultaten.every((r) => r.ok)).toBe(true);
    expect(await prisma.metingVraag.count({ where: { metingId: meting.id } })).toBe(16);
    expect(await prisma.metingBusinessUnit.count({ where: { metingId: meting.id } })).toBe(5);
    const opgeslagen = await getMetingByJaar(2027);
    expect(Object.keys(opgeslagen!.businessUnits).sort()).toEqual(['belastingen', 'ro']);
  });

  it('should use the list at save time: a question added after the form loaded saves, a removed one gets a Dutch 400', async () => {
    const meting = await createMeting(2027);
    const geladen = (await leesVragenlijst(2027))!;
    const ro = geladen.businessUnits.find((b) => b.id === 'ro')!;
    // While the form is open, a beheerder removes one question and adds another.
    await prisma.vraag.update({ where: { id: 'cloud-data' }, data: { vervallen: true } });
    const nieuw = await prisma.vraag.create({ data: { asId: 'mens', kort: 'Nieuw', tekst: 'Nieuwe vraag', volgorde: 9 } });

    const oud = await slaBusinessUnitOp(gebruiker, meting, ro, invoer({ vraagScores: [{ vraagId: 'cloud-data', score: 3, toelichting: '' }] }));
    expect(oud).toEqual({ ok: false, error: { status: 400, titel: 'Ongeldige invoer', detail: 'Deze vraag hoort niet bij de vragenlijst van 2027.' } });
    expect((await getMetingByJaar(2027))?.vastgelegd).toBe(false);

    const goed = await slaBusinessUnitOp(gebruiker, meting, ro, invoer({ vraagScores: [{ vraagId: nieuw.id, score: 4, toelichting: '' }] }));
    expect(goed.ok).toBe(true);
    const vast = (await leesVragenlijst(2027))!;
    expect(vast.vastgelegd).toBe(true);
    expect(vast.assen.flatMap((a) => a.vragen.map((v) => v.id))).toContain(nieuw.id);
    expect(vast.assen.flatMap((a) => a.vragen.map((v) => v.id))).not.toContain('cloud-data');
  });

  it('should freeze the year on a concept without scores and store aanwezigen', async () => {
    const meting = await createMeting(2027);
    const ro = (await leesVragenlijst(2027))!.businessUnits.find((b) => b.id === 'ro')!;
    expect((await slaBusinessUnitOp(gebruiker, meting, ro, invoer({ aanwezigen: 'Jan en Piet' }))).ok).toBe(true);
    const opgeslagen = await getMetingByJaar(2027);
    expect(opgeslagen?.vastgelegd).toBe(true);
    expect(opgeslagen?.businessUnits.ro?.aanwezigen).toBe('Jan en Piet');
  });

  it('should refuse with 409 to freeze a year below three active questions', async () => {
    await prisma.vraag.updateMany({ where: { id: { in: STANDAARD_VRAAG_IDS.slice(2) } }, data: { vervallen: true } });
    const meting = await createMeting(2027);
    const resultaat = await slaBusinessUnitOp(gebruiker, meting, RO, invoer());
    expect(resultaat.ok === false && resultaat.error.status).toBe(409);
  });
});
