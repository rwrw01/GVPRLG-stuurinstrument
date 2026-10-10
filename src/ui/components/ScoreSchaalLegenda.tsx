import { CONFIG } from '@/src/service/config';

export function ScoreSchaalLegenda() {
  return (
    <div className="card">
      <h3>Toelichting op de schaal (CMMI-niveaus)</h3>
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
              <td>{s.label}</td>
              <td>{s.beschrijving}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
