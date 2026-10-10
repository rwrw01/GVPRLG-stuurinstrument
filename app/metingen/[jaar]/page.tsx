'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CONFIG } from '@/src/service/config';

export default function MetingOverzichtPage() {
  const params = useParams<{ jaar: string }>();

  return (
    <div>
      <h2>Meting {params.jaar}</h2>
      <div className="dashboard-grid">
        {CONFIG.platformen.map((p) => (
          <div className="card" key={p.id}>
            <h3>{p.naam}</h3>
            <div className="btn-group">
              <Link className="btn btn-primary" href={`/metingen/${params.jaar}/${p.id}`}>Invullen</Link>
              <Link className="btn btn-outline" href={`/metingen/${params.jaar}/${p.id}/resultaat`}>Bekijken</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
