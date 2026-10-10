import { describe, expect, it } from 'vitest';
import { valideerVoorAfronden } from './platformWorkflow';
import { CONFIG } from '../service/config';

const alleVraagIds = CONFIG.assen.flatMap((a) => a.vragen.map((v) => v.id));

describe('valideerVoorAfronden', () => {
  it('geeft null als alle vragen een score hebben', () => {
    const scores = alleVraagIds.map((id) => ({ vraagId: id, score: 3 }));
    expect(valideerVoorAfronden(scores)).toBeNull();
  });

  it('geeft een foutmelding met de ontbrekende vraag-id als er scores missen', () => {
    const scores = alleVraagIds.slice(1).map((id) => ({ vraagId: id, score: 3 }));
    const fout = valideerVoorAfronden(scores);
    expect(fout).not.toBeNull();
    expect(fout).toContain(alleVraagIds[0]);
    expect(fout).toContain('Vul alle vragen in');
  });

  it('behandelt een null-score als niet ingevuld', () => {
    const scores = alleVraagIds.map((id) => ({ vraagId: id, score: id === alleVraagIds[0] ? null : 3 }));
    const fout = valideerVoorAfronden(scores);
    expect(fout).toContain(alleVraagIds[0]);
  });
});
