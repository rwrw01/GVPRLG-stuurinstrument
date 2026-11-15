'use client';

import { Suspense, useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

// The button stays disabled until React has hydrated it: a click on the server-rendered button
// before that would do nothing at all (seen in E2E under load: no sign-in request followed).
function InlogKnop() {
  const callbackUrl = useSearchParams().get('callbackUrl') ?? '/';
  const [klaar, setKlaar] = useState(false);
  useEffect(() => setKlaar(true), []);
  return (
    <button className="btn btn-primary" disabled={!klaar} onClick={() => signIn('keycloak', { callbackUrl })}>
      Inloggen
    </button>
  );
}

export default function InloggenPage() {
  const [hulpOpen, setHulpOpen] = useState(false);
  return (
    <div className="card inlog-card">
      <h2>Inloggen</h2>
      <p>Je logt in met je e-mailadres en daarna een eenmalige code. Er is geen wachtwoord nodig.</p>
      <div className="inlog-acties">
        <Suspense fallback={null}>
          <InlogKnop />
        </Suspense>
        <button
          type="button"
          className="inlog-hulp-knop"
          aria-label="Hoe werkt inloggen?"
          title="Hoe werkt inloggen?"
          aria-expanded={hulpOpen}
          aria-controls="inlog-hulp"
          onClick={() => setHulpOpen((open) => !open)}
        >
          <span aria-hidden="true">?</span>
        </button>
      </div>
      {hulpOpen && (
        <div id="inlog-hulp" className="inlog-hulp-tekst">
          <p>
            De code komt uit je authenticator-app (bijvoorbeeld Microsoft Authenticator of Google
            Authenticator). Toegang krijg je via een uitnodigingsmail; daarin koppel je eenmalig je
            authenticator-app.
          </p>
          <p>
            Nog geen uitnodiging ontvangen? Neem contact op met de{' '}
            <a href="https://gvprlg.nl/contact/" target="_blank" rel="noopener noreferrer">
              Gebruikersvereniging PinkRoccade Local Government
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}
