'use client';

import { Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

function InlogKnop() {
  const callbackUrl = useSearchParams().get('callbackUrl') ?? '/';
  return (
    <button className="btn btn-primary" onClick={() => signIn('keycloak', { callbackUrl })}>
      Inloggen
    </button>
  );
}

export default function InloggenPage() {
  return (
    <div className="card">
      <h2>Inloggen</h2>
      <p>
        Je logt in met je e-mailadres en een eenmalige code uit je authenticator-app (bijvoorbeeld
        Microsoft Authenticator of Google Authenticator). Er is geen wachtwoord nodig.
      </p>
      <p>Log je voor het eerst in? Dan koppel je eerst je authenticator-app door de QR-code te scannen.</p>
      <Suspense fallback={null}>
        <InlogKnop />
      </Suspense>
    </div>
  );
}
