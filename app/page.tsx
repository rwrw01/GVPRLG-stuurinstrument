'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useIk } from '@/src/ui/hooks/useIk';

interface Meting {
  id: string;
  jaar: number;
}

export default function HomePage() {
  const [metingen, setMetingen] = useState<Meting[]>([]);
  const [nieuwJaar, setNieuwJaar] = useState('');
  const [fout, setFout] = useState<string | null>(null);
  const { ik } = useIk();

  function laadMetingen() {
    fetch('/api/metingen').then((r) => r.json()).then((data) => setMetingen(data.metingen));
  }

  useEffect(laadMetingen, []);

  async function meetingAanmaken() {
    setFout(null);
    const jaar = Number(nieuwJaar);
    const response = await fetch('/api/metingen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jaar }),
    });
    if (!response.ok) {
      const problem = await response.json();
      setFout(problem.detail);
      return;
    }
    setNieuwJaar('');
    laadMetingen();
  }

  return (
    <div>
      {/* Only hidden for non-beheerders; POST /api/metingen enforces the role itself. */}
      {ik?.rol === 'beheerder' && (
        <div className="card">
          <div className="form-group">
            <label htmlFor="nieuw-jaar">Nieuwe meting (jaar)</label>
            <input id="nieuw-jaar" type="number" value={nieuwJaar} onChange={(e) => setNieuwJaar(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={meetingAanmaken}>Meting aanmaken</button>
          {fout && <div className="alert alert-warning" role="alert">{fout}</div>}
        </div>
      )}
      {metingen.length === 0 && <p>Nog geen metingen.</p>}
      <div className="dashboard-grid">
        {metingen.map((m) => (
          <div className="card" key={m.id}>
            <h3>Meting {m.jaar}</h3>
            <Link className="btn btn-outline" href={`/metingen/${m.jaar}`}>Openen</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
