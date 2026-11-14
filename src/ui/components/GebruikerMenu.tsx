'use client';

import type { Ik } from '@/src/ui/hooks/useIk';

/**
 * Bottom of the side menu: the name of the logged-in user and the logout link.
 * Renders nothing while loading or when nobody is logged in.
 * @param props.ik - The logged-in user, or null
 * @returns the menu or null
 */
export function GebruikerMenu({ ik }: { ik: Ik | null }) {
  if (!ik) return null;
  return (
    <nav aria-label="Gebruikersmenu" className="gebruiker-menu">
      <span className="gebruiker-naam">{ik.naam}</span>
      {/* Plain anchor: the logout route answers with a redirect to Keycloak, not a page. */}
      <a href="/api/auth/uitloggen">Uitloggen</a>
    </nav>
  );
}
