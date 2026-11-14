import type { AsVergelijking, Kerncijfers } from './_overzichtTypen';

const definitief = (aantal: number) => (aantal === 1 ? '1 definitief platform' : `${aantal} definitieve platformen`);

/**
 * Base of the key-figure average and of its difference, so the reader sees what is compared.
 * @param cijfers - Key figures
 * @returns e.g. "Over 3 definitieve platformen; verschil met 2025 over de 2 platformen die in beide jaren definitief zijn"
 */
export function kerncijferBasis(cijfers: Kerncijfers): string {
  if (cijfers.gemiddelde === null) return 'Nog geen definitieve platformen';
  const basis = `Over ${definitief(cijfers.aantalGemiddelde)}`;
  const { vergelijking, vorigeJaar } = cijfers;
  if (vergelijking) {
    const gemeen = vergelijking.aantal === 1
      ? 'het ene platform dat in beide jaren definitief is'
      : `de ${vergelijking.aantal} platformen die in beide jaren definitief zijn`;
    return `${basis}; verschil met ${vorigeJaar} over ${gemeen}`;
  }
  if (vorigeJaar) return `${basis}; geen vergelijking met ${vorigeJaar}, geen platform is in beide jaren definitief`;
  return `${basis}; nog geen vergelijkingsjaar`;
}

/**
 * Base of the three-axes figures.
 * @param assen - Axis figures
 * @param nuJaar - Newest year with scores
 * @param vorigeJaar - Comparison year, or null
 * @returns the explanation sentence(s)
 */
export function assenBasis(assen: AsVergelijking[], nuJaar: number, vorigeJaar: number | null): string {
  const aantal = assen[0]?.aantal ?? 0;
  if (assen[0]?.vergeleken && vorigeJaar) {
    const gemeen = aantal === 1
      ? `het ene platform dat in ${vorigeJaar} en ${nuJaar} definitief is`
      : `de ${aantal} platformen die in ${vorigeJaar} en ${nuJaar} definitief zijn`;
    return `Gemiddeld over ${gemeen}. Het streepje is de score van ${vorigeJaar}.`;
  }
  if (aantal === 0) return `In ${nuJaar} is nog geen platform definitief.`;
  const zonder = vorigeJaar ? ` Geen vergelijking met ${vorigeJaar}: geen platform is in beide jaren definitief.` : '';
  return `Gemiddeld over ${definitief(aantal)}.${zonder}`;
}
