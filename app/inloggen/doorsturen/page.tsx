'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

// A same-site navigation from this page sends the strict session cookie, which the first
// request after the cross-site redirect from Keycloak does not.
function Doorsturen() {
  const naar = useSearchParams().get('naar');
  useEffect(() => {
    const veilig = naar !== null && naar.startsWith('/') && !naar.startsWith('//') ? naar : '/';
    window.location.replace(veilig);
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
