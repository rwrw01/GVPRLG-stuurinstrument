import { describe, expect, it } from 'vitest';
import { berekenGemiddeldePerAs, berekenTotaalGemiddelde, type PlatformScoresByAs } from './scores';

describe('berekenGemiddeldePerAs', () => {
  it('berekent het gemiddelde per as, negeert null-scores', () => {
    const data: PlatformScoresByAs = {
      techniek: { 'common-ground-standaarden': 4, 'cloud-data': 2, 'ai-integratie': null, 'digitale-weerbaarheid': null },
      mens: { 'capaciteit-kennis': 3, 'digitaal-vakmanschap': 3, 'klantbetrokkenheid': 3, 'opleiding-continuiteit': 3 },
      proces: {},
    };
    const result = berekenGemiddeldePerAs(data);
    expect(result.techniek).toBe(3);
    expect(result.mens).toBe(3);
  });

  it('geeft null voor een as zonder enige score', () => {
    const result = berekenGemiddeldePerAs({ techniek: {}, mens: {}, proces: {} });
    expect(result.techniek).toBeNull();
  });
});

describe('berekenTotaalGemiddelde', () => {
  it('berekent het gemiddelde over de as-gemiddelden, niet over individuele vragen', () => {
    const data: PlatformScoresByAs = {
      techniek: { 'common-ground-standaarden': 4, 'cloud-data': 4, 'ai-integratie': 4, 'digitale-weerbaarheid': 4 },
      mens: { 'capaciteit-kennis': 2, 'digitaal-vakmanschap': 2, 'klantbetrokkenheid': 2, 'opleiding-continuiteit': 2 },
      proces: {},
    };
    expect(berekenTotaalGemiddelde(data)).toBe(3);
  });

  it('geeft null als geen enkele as een score heeft', () => {
    expect(berekenTotaalGemiddelde({ techniek: {}, mens: {}, proces: {} })).toBeNull();
  });
});
