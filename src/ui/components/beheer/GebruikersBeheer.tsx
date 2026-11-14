'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useJaren } from '@/src/ui/hooks/useJaren';
import { leesDetail, verstuurJson } from '../_verstuurJson';
import { GebruikersTabel } from './GebruikersTabel';
import { VoorzitterToevoegenForm } from './VoorzitterToevoegenForm';
import type { BeheerGebruiker, GebruikerWijziging } from './_beheerTypen';

function JaarKeuze({ jaren, jaar, onChange }: { jaren: number[]; jaar: number; onChange: (jaar: number) => void }) {
  return (
    <div className="form-group beheer-jaar">
      <label htmlFor="beheer-jaar">Meetjaar</label>
      <select id="beheer-jaar" value={jaar} onChange={(e) => onChange(Number(e.target.value))}>
        {jaren.map((j) => <option key={j} value={j}>{j}</option>)}
      </select>
    </div>
  );
}

// Years are listed oldest first; open on the current calendar year, else the newest year.
function startJaar(jaren: number[]): number {
  const ditJaar = new Date().getFullYear();
  return jaren.includes(ditJaar) ? ditJaar : (jaren.at(-1) ?? 0);
}

function GebruikersVoorJaar({ jaren }: { jaren: number[] }) {
  const [jaar, setJaar] = useState(() => startJaar(jaren));
  const [gebruikers, setGebruikers] = useState<BeheerGebruiker[]>([]);
  const [fout, setFout] = useState<string | null>(null);

  const laad = useCallback(async () => {
    const response = await fetch(`/api/beheer/gebruikers?jaar=${jaar}`).catch(() => null);
    if (!response) return setFout('De server is niet bereikbaar.');
    const json: unknown = await response.json().catch(() => null);
    if (!response.ok) return setFout(leesDetail(json) ?? 'Kon de gebruikers niet laden.');
    setGebruikers((json as { gebruikers: BeheerGebruiker[] }).gebruikers);
  }, [jaar]);

  useEffect(() => {
    void laad();
  }, [laad]);

  async function voerUit(url: string, method: 'PATCH' | 'PUT', body: unknown) {
    setFout(null);
    const melding = await verstuurJson(url, method, body);
    if (melding) setFout(melding);
    await laad();
  }

  return (
    <>
      <JaarKeuze
        jaren={jaren}
        jaar={jaar}
        onChange={(j) => {
          setFout(null);
          setJaar(j);
        }}
      />
      {fout && <div className="alert alert-warning" role="alert">{fout}</div>}
      <div className="card">
        <GebruikersTabel
          gebruikers={gebruikers}
          jaar={jaar}
          onWijzig={(id, wijziging: GebruikerWijziging) => voerUit(`/api/beheer/gebruikers/${id}`, 'PATCH', wijziging)}
          onKoppelingen={(id, platformIds) => voerUit(`/api/beheer/gebruikers/${id}/koppelingen`, 'PUT', { jaar, platformIds })}
        />
      </div>
      <VoorzitterToevoegenForm jaar={jaar} onToegevoegd={() => void laad()} />
    </>
  );
}

/**
 * Admin screen: user table for a chosen year, the add form and the link to the audit log.
 * @returns the admin screen
 */
export function GebruikersBeheer() {
  const jaren = useJaren();
  return (
    <div>
      <div className="platform-kop">
        <h2>Gebruikers</h2>
        <Link className="btn btn-outline" href="/beheer/audit">Auditlog</Link>
      </div>
      <div className="alert alert-info" role="note">
        Maak het account eerst aan in de Keycloak-console (realm gvprlg) en verstuur daar de uitnodiging.
      </div>
      {jaren === null && <p>Laden...</p>}
      {jaren?.length === 0 && <p>Er zijn nog geen metingen. Maak eerst een meting aan.</p>}
      {jaren && jaren.length > 0 && <GebruikersVoorJaar jaren={jaren} />}
    </div>
  );
}
