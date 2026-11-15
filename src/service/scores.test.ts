import { describe, expect, it } from 'vitest';

import { standaardLijst } from '@/tests/support/vragenlijst-testdata';

import { beantwoordeScores, berekenGemiddeldePerAs, berekenGemiddeldePerVraag, berekenOrganisatieGemiddelde, berekenTotaalGemiddelde, type ScoresPerAs } from './scores';

const LIJST = standaardLijst();

describe('berekenGemiddeldePerAs', () => {
  it('berekent het gemiddelde per as, negeert null-scores', () => {
    const data: ScoresPerAs = {
      techniek: { 'common-ground-standaarden': 4, 'cloud-data': 2, 'ai-integratie': null, 'digitale-weerbaarheid': null },
      mens: { 'capaciteit-kennis': 3, 'digitaal-vakmanschap': 3, 'klantbetrokkenheid': 3, 'opleiding-continuiteit': 3 },
      proces: {},
    };
    const result = berekenGemiddeldePerAs(LIJST, data);
    expect(result.techniek).toBe(3);
    expect(result.mens).toBe(3);
  });

  it('geeft null voor een as zonder enige score', () => {
    const result = berekenGemiddeldePerAs(LIJST, { techniek: {}, mens: {}, proces: {} });
    expect(result.techniek).toBeNull();
  });
});

describe('berekenTotaalGemiddelde', () => {
  it('should take the mean over all answered questions when the axes have 4/4/8 questions', () => {
    const data: ScoresPerAs = {
      techniek: Object.fromEntries(LIJST.assen[0]!.vragen.map((v) => [v.id, 4])),
      mens: Object.fromEntries(LIJST.assen[1]!.vragen.map((v) => [v.id, 4])),
      proces: Object.fromEntries(LIJST.assen[2]!.vragen.map((v) => [v.id, 1])),
    };
    expect(LIJST.assen.map((a) => a.vragen.length)).toEqual([4, 4, 8]);
    const asGemiddelden = Object.values(berekenGemiddeldePerAs(LIJST, data)) as number[];
    // The former result page method (mean of the axis means) gives (4 + 4 + 1) / 3 = 3.
    expect(asGemiddelden.reduce((som, v) => som + v, 0) / asGemiddelden.length).toBe(3);
    // The one rule: (4 x 4 + 4 x 4 + 8 x 1) / 16 = 2.5.
    expect(berekenTotaalGemiddelde(LIJST, data)).toBe(2.5);
  });

  it('should leave unanswered questions out of the total', () => {
    const data: ScoresPerAs = {
      techniek: { 'common-ground-standaarden': 4, 'cloud-data': 4, 'ai-integratie': null },
      mens: { 'capaciteit-kennis': 1 },
      proces: {},
    };
    expect(berekenTotaalGemiddelde(LIJST, data)).toBe(3);
    expect(beantwoordeScores(LIJST, data)).toEqual([4, 4, 1]);
  });

  it('geeft null als geen enkele as een score heeft', () => {
    expect(berekenTotaalGemiddelde(LIJST, { techniek: {}, mens: {}, proces: {} })).toBeNull();
  });
});

describe('berekenOrganisatieGemiddelde', () => {
  it('should average each axis over the given platforms when several platforms have scores', () => {
    const a: ScoresPerAs = { techniek: { 'common-ground-standaarden': 4 }, mens: { 'capaciteit-kennis': 2 }, proces: {} };
    const b: ScoresPerAs = { techniek: { 'common-ground-standaarden': 2 }, mens: { 'capaciteit-kennis': 4 }, proces: {} };
    const result = berekenOrganisatieGemiddelde(LIJST, [a, b]);
    expect(result.techniek).toBe(3);
    expect(result.mens).toBe(3);
    expect(result.proces).toBeNull();
  });

  it('should return null for every axis when no platforms are given', () => {
    const result = berekenOrganisatieGemiddelde(LIJST, []);
    expect(result).toEqual({ techniek: null, mens: null, proces: null });
  });
});

describe('berekenGemiddeldePerVraag', () => {
  it('should average each question over the platforms and ignore missing scores', () => {
    const a: ScoresPerAs = { techniek: { 'cloud-data': 4, 'ai-integratie': null }, mens: {}, proces: {} };
    const b: ScoresPerAs = { techniek: { 'cloud-data': 2 }, mens: {}, proces: {} };
    const result = berekenGemiddeldePerVraag(LIJST, [a, b]);
    expect(result['cloud-data']).toBe(3);
    expect(result['ai-integratie']).toBeNull();
    expect(Object.keys(result)).toHaveLength(16);
  });

  it('should only give the questions of the year list and leave out a question of another year', () => {
    const lijst = standaardLijst();
    lijst.assen[0]!.vragen = lijst.assen[0]!.vragen.filter((v) => v.id !== 'cloud-data');
    const result = berekenGemiddeldePerVraag(lijst, [{ techniek: { 'cloud-data': 4, 'ai-integratie': 2 } }]);
    expect(result).not.toHaveProperty('cloud-data');
    expect(result['ai-integratie']).toBe(2);
  });
});
