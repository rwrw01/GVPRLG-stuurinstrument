import type { AuditRegel } from './_beheerTypen';

/**
 * Table of audit rows, newest first as delivered by the API. Detail is rendered as plain text.
 * @param props.regels - Audit rows
 * @returns the table, or a message when there are no rows
 */
export function AuditTabel({ regels }: { regels: AuditRegel[] }) {
  if (regels.length === 0) return <p>Geen auditregels gevonden.</p>;
  return (
    <table aria-label="Auditregels" className="beheer-tabel">
      <thead>
        <tr>
          <th>Tijdstip</th><th>Actie</th><th>Actor</th><th>Doeltype</th><th>Detail</th>
        </tr>
      </thead>
      <tbody>
        {regels.map((r) => (
          <tr key={r.id}>
            <td>{new Date(r.tijdstip).toLocaleString('nl-NL')}</td>
            <td>{r.actie}</td>
            <td>{r.actor}</td>
            <td>{r.doelType}</td>
            <td>{r.detail}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
