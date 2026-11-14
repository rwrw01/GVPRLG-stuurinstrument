import { CONFIG } from '@/src/service/config';

/**
 * Scale legend above the questionnaire: per level the Dutch name with the CMMI name after it.
 * @returns the legend card
 */
export function ScoreSchaalLegenda() {
  return (
    <div className="card">
      <h3>Wat betekenen de niveaus</h3>
      <table aria-label="Toelichting scoreschaal 1-5">
        <thead>
          <tr>
            <th>Niveau</th>
            <th>Naam</th>
            <th>Beschrijving</th>
          </tr>
        </thead>
        <tbody>
          {CONFIG.schaal.map((s) => (
            <tr key={s.waarde}>
              <td className={`score-${s.waarde}`}>{s.waarde}</td>
              <td>{s.naam} <span className="schaal-cmmi">({s.label})</span></td>
              <td>{s.beschrijving}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
