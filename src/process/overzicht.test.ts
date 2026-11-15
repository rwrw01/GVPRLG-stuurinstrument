import { describe, expect, it } from 'vitest';

import type { Vragenlijst } from '@/src/data/vragenlijstRepository';
import { gelijk, meting, rij } from '@/tests/support/overzicht-testdata';
import { standaardLijst } from '@/tests/support/vragenlijst-testdata';

import { bouwOverzicht } from './overzicht';

function lijsten(...jaren: Vragenlijst[]): Map<number, Vragenlijst> {
  return new Map(jaren.map((l) => [l.jaar, l]));
}

describe('bouwOverzicht', () => {
  it('should compose years oldest first with the derived sentence, key figures and axis comparison', () => {
    const overzicht = bouwOverzicht(lijsten(standaardLijst(2025, true), standaardLijst(2026, true), standaardLijst(2027)), [
      meting(2026, { belastingen: gelijk('definitief', 3.4), ro: rij('definitief', { techniek: 2.6, mens: 2, proces: 2.5 }), burgerzaken: gelijk('concept', 1) }),
      meting(2025, { belastingen: gelijk('definitief', 3), ro: gelijk('definitief', 2.5) }),
      meting(2027),
    ]);
    expect(overzicht.jaren.map((j) => [j.jaar, j.voortgang])).toEqual([[2025, '2/5'], [2026, '2/5'], [2027, '0/5']]);
    expect(overzicht.nuJaar).toBe(2026);
    expect(overzicht.vorigeJaar).toBe(2025);
    expect(overzicht.openingszin).toBe('In 2026 groeit Belastingen door naar 3,4; bij R&O ligt de grootste groeikans op de as Mens.');
    expect(overzicht.kerncijfers?.stijger?.businessUnitId).toBe('belastingen');
    expect(overzicht.kerncijfers?.vergelijking?.aantal).toBe(2);
    expect(overzicht.gespreksonderwerpen[0]?.soort).toBe('daling');
    // The concept (burgerzaken, score 1) does not pull the axes down.
    const mens = overzicht.assen.find((a) => a.id === 'mens');
    expect(mens).toMatchObject({ id: 'mens', naam: 'Mens', vorige: 2.75, aantal: 2, vergeleken: true });
    expect(mens?.nu).toBeCloseTo(2.7);
    expect(overzicht.businessUnits[0]).toEqual({ id: 'belastingen', naam: 'Belastingen', kleur: '#2a78d6', platformNaam: 'Belastingen' });
  });

  it('should have no key figures and the empty sentence when nothing is scored', () => {
    const overzicht = bouwOverzicht(lijsten(standaardLijst(2026)), [meting(2026)]);
    expect(overzicht.kerncijfers).toBeNull();
    expect(overzicht.nuJaar).toBeNull();
    expect(overzicht.openingszin).toBe('Er zijn nog geen scores ingevuld.');
    expect(overzicht.assen.every((a) => a.nu === null && a.vorige === null)).toBe(true);
  });

  it('should keep a removed business unit with its old name and colour in frozen years and leave it out of open years', () => {
    const vast = standaardLijst(2025, true);
    vast.businessUnits = vast.businessUnits.map((b) => (b.id === 'ro' ? { ...b, naam: 'R&O oud' } : b));
    const open = standaardLijst(2026);
    open.businessUnits = open.businessUnits.filter((b) => b.id !== 'ro');
    open.platformen = open.platformen.filter((p) => p.id !== 'ro');

    const overzicht = bouwOverzicht(lijsten(vast, open), [meting(2025, { ro: gelijk('definitief', 3) }), meting(2026)]);
    expect(overzicht.jaren[0]?.businessUnits.find((b) => b.businessUnitId === 'ro')).toMatchObject({ naam: 'R&O oud', kleur: '#eb6834', totaal: 3 });
    expect(overzicht.jaren[1]?.businessUnits.map((b) => b.businessUnitId)).not.toContain('ro');
    expect(overzicht.jaren[1]?.voortgang).toBe('0/4');
    expect(overzicht.businessUnits.find((b) => b.id === 'ro')).toEqual({ id: 'ro', naam: 'R&O oud', kleur: '#eb6834', platformNaam: 'R&O' });
    expect(overzicht.businessUnits.at(-1)?.id).toBe('ro');
  });

  it('should compare axes by id, questions only when in both years and business units only when in both years', () => {
    const vorigeLijst = standaardLijst(2025, true);
    const nuLijst = standaardLijst(2026, true);
    // 2026: the axis Mens is renamed, one Techniek question is new, and business unit "nieuw" is added.
    nuLijst.assen[1]!.naam = 'Mensen';
    nuLijst.assen[0]!.vragen[0] = { id: 'nieuwe-vraag', asId: 'techniek', kort: 'Nieuw', tekst: 'Nieuw' };
    nuLijst.businessUnits.push({ id: 'nieuw', platformId: 'ro', naam: 'Nieuw', kleur: '#8b5cf6' });
    nuLijst.platformen[1]!.businessUnitIds.push('nieuw');
    const nuRij = gelijk('definitief', 4);
    nuRij.scoresPerAs.techniek = { 'nieuwe-vraag': 1, 'cloud-data': 4, 'ai-integratie': 4, 'digitale-weerbaarheid': 4, 'common-ground-standaarden': 5 };

    const overzicht = bouwOverzicht(lijsten(vorigeLijst, nuLijst), [
      meting(2025, { belastingen: gelijk('definitief', 3) }),
      meting(2026, { belastingen: nuRij, nieuw: gelijk('definitief', 1) }),
    ]);
    const techniek2026 = overzicht.jaren[1]!.businessUnits[0]!.perAs.techniek;
    // The stray score for the 2025-only question does not count in 2026; the new question does.
    expect(techniek2026).toBeCloseTo((1 + 4 + 4 + 4) / 4);
    const mens = overzicht.assen.find((a) => a.id === 'mens');
    expect(mens).toMatchObject({ naam: 'Mensen', nu: 4, vorige: 3, aantal: 1, vergeleken: true });
    expect(overzicht.kerncijfers?.vergelijking?.aantal).toBe(1);
    expect(overzicht.jaren[1]?.businessUnits.find((b) => b.businessUnitId === 'nieuw')?.platformNaam).toBe('R&O');
  });
});
