import { CONFIG } from '@/src/service/config';
import type { PlatformScoresByAs } from '@/src/service/scores';

interface VraagDetailProps {
  scoresPerAs: PlatformScoresByAs;
  toelichtingen: Record<string, string>;
}

/**
 * Per-question score bars with the respondent's explanation, grouped by axis.
 * @param props scores per axis and explanations per question id
 * @returns one section per axis
 */
export function VraagDetail({ scoresPerAs, toelichtingen }: VraagDetailProps) {
  return (
    <div>
      {CONFIG.assen.map((as) => (
        <section key={as.id} className="vraag-detail-as">
          <h4 style={{ color: as.kleur }}>{as.naam}</h4>
          {as.vragen.map((v) => {
            const score = scoresPerAs[as.id]?.[v.id] ?? null;
            return (
              <div key={v.id} className="vraag-detail">
                <div className="vraag-detail-kop">
                  <span>{v.tekst}</span>
                  <strong className={score ? `score-${score}` : undefined}>{score ?? '-'}/5</strong>
                </div>
                <div className="vraag-detail-balk" role="progressbar" aria-valuenow={score ?? 0} aria-valuemin={0} aria-valuemax={5} aria-label={`${v.id}: ${score ?? 0} van 5`}>
                  <div style={{ width: `${((score ?? 0) / 5) * 100}%` }} className={score ? `balk-${score}` : undefined} />
                </div>
                {toelichtingen[v.id] && <p className="vraag-detail-toelichting">{toelichtingen[v.id]}</p>}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
