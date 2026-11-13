'use client';

import Link from 'next/link';
import { useIk } from '@/src/ui/hooks/useIk';

/**
 * Header menu with the user's name, a link to the admin page for beheerders and a logout link.
 * Renders nothing while loading or when nobody is logged in (public pages share the layout).
 * @returns the menu or null
 */
export function GebruikerMenu() {
  const { ik } = useIk();
  if (!ik) return null;
  return (
    <nav aria-label="Gebruikersmenu" className="gebruiker-menu">
      <span>{ik.naam}</span>
      {ik.rol === 'beheerder' && <Link href="/beheer">Beheer</Link>}
      {/* Plain anchor: the logout route answers with a redirect to Keycloak, not a page. */}
      <a href="/api/auth/uitloggen">Uitloggen</a>
    </nav>
  );
}
