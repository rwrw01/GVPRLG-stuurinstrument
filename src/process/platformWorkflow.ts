import { CONFIG } from '../service/config';

export interface VraagScoreCheck {
  vraagId: string;
  score: number | null;
}

export function valideerVoorAfronden(vraagScores: VraagScoreCheck[]): string | null {
  const alleVraagIds = CONFIG.assen.flatMap((a) => a.vragen.map((v) => v.id));
  const ingevuld = new Map(vraagScores.map((v) => [v.vraagId, v.score]));
  const ontbrekend = alleVraagIds.filter((id) => ingevuld.get(id) == null);
  if (ontbrekend.length > 0) {
    return `Vul alle vragen in voordat u afrondt. Ontbrekend: ${ontbrekend.join(', ')}.`;
  }
  return null;
}
