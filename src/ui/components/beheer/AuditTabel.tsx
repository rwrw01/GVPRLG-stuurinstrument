import type { AuditRegel } from './_beheerTypen';

// Spec §6: a known user as "naam (email)", anything else as "onbekend (<waarde>)".
function actorLabel(r: AuditRegel): string {
  return r.actorNaam !== null ? `${r.actorNaam} (${r.actorEmail ?? ''})` : `onbekend (${r.actor})`;
}

/**
 * Table of audit rows, newest first as delivered by the API. Detail is rendered as plain text.
 * @param props.regels - Audit rows
 * @returns the table, or a message when there are no rows
 */
export function AuditTabel({ regels }: { regels: AuditRegel[] }) {
  if (regels.length === 0) return <p>Geen auditregels gevonden.</p>;
  return (
    <div className="tabel-scroll">
    <table aria-label="Auditregels" className="beheer-tabel beheer-tabel-stapel" role="table">
      <thead role="rowgroup">
        <tr role="row">
          <th role="columnheader">Tijdstip</th><th role="columnheader">Actie</th><th role="columnheader">Actor</th><th role="columnheader">Doeltype</th><th role="columnheader">Detail</th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        {regels.map((r) => (
          <tr key={r.id} role="row">
            <td role="cell" data-label="Tijdstip">{new Date(r.tijdstip).toLocaleString('nl-NL')}</td>
            <td role="cell" data-label="Actie">{r.actie}</td>
            <td role="cell" data-label="Actor">{actorLabel(r)}</td>
            <td role="cell" data-label="Doeltype">{r.doelType}</td>
            <td role="cell" data-label="Detail" className="cel-detail">{r.detail}</td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
