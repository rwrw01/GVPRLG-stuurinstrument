'use client';

import { useCallback, useEffect, useState } from 'react';
import { AuditFilters, LEEG_FILTER, type AuditFilterWaarden } from '@/src/ui/components/beheer/AuditFilters';
import { AuditTabel } from '@/src/ui/components/beheer/AuditTabel';
import type { AuditRegel } from '@/src/ui/components/beheer/_beheerTypen';
import { leesDetail } from '@/src/ui/components/_verstuurJson';
import { useJaren } from '@/src/ui/hooks/useJaren';

function naarQuery(filter: AuditFilterWaarden): string {
  const params = new URLSearchParams();
  for (const [sleutel, waarde] of Object.entries(filter)) {
    if (waarde.trim() !== '') params.set(sleutel, waarde.trim());
  }
  return params.toString();
}

// The audit API scopes the rows to what the logged-in user may see; this page only displays them.
export default function AuditPage() {
  const jaren = useJaren();
  const [regels, setRegels] = useState<AuditRegel[] | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  const zoek = useCallback(async (filter: AuditFilterWaarden) => {
    setFout(null);
    const response = await fetch(`/api/audit?${naarQuery(filter)}`).catch(() => null);
    if (!response) return setFout('De server is niet bereikbaar.');
    const json: unknown = await response.json().catch(() => null);
    if (!response.ok) return setFout(leesDetail(json) ?? 'Kon de auditlog niet laden.');
    setRegels((json as { regels: AuditRegel[] }).regels);
  }, []);

  useEffect(() => {
    void zoek(LEEG_FILTER);
  }, [zoek]);

  return (
    <div>
      <h2>Auditlog</h2>
      <AuditFilters jaren={jaren ?? []} onZoek={zoek} />
      {fout && <div className="alert alert-warning" role="alert">{fout}</div>}
      <div className="card">{regels === null ? <p>Laden...</p> : <AuditTabel regels={regels} />}</div>
    </div>
  );
}
