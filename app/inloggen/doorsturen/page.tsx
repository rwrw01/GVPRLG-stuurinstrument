'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import { veiligDoorstuurPad } from '@/src/integration/auth/_doorstuurPad';

// A same-site navigation from this page sends the strict session cookie, which the first
// request after the cross-site redirect from Keycloak does not.
function Doorsturen() {
  const naar = useSearchParams().get('naar');
  useEffect(() => {
    window.location.replace(veiligDoorstuurPad(naar, window.location.origin));
  }, [naar]);
  return null;
}

export default function DoorsturenPage() {
  return (
    <div className="card">
      <p>Even geduld…</p>
      <Suspense fallback={null}>
        <Doorsturen />
      </Suspense>
    </div>
  );
}
