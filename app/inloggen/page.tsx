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
      <p>
        Toegang krijg je via een uitnodigingsmail; daarin koppel je eenmalig je authenticator-app.
        Heb je nog geen uitnodiging ontvangen? Neem dan contact op met de{' '}
        <a href="https://gvprlg.nl/contact/" target="_blank" rel="noopener noreferrer">
          Gebruikersvereniging PinkRoccade Local Government
        </a>
        .
      </p>
      <Suspense fallback={null}>
        <InlogKnop />
      </Suspense>
    </div>
  );
}
