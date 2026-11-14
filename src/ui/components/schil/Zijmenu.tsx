'use client';

import Link from 'next/link';
import type { KeyboardEvent, ReactNode } from 'react';

import { GebruikerMenu } from '@/src/ui/components/GebruikerMenu';
import type { JaarCijfers } from '@/src/ui/components/overzicht/_overzichtTypen';
import { useIk } from '@/src/ui/hooks/useIk';
import { useOverzicht } from '@/src/ui/hooks/useOverzicht';

import { huidigeStand } from './_schilPaden';

interface MenuLinkProps {
  href: string;
  pathname: string;
  ookOnder?: boolean;
  children: ReactNode;
}

function MenuLink({ href, pathname, ookOnder = false, children }: MenuLinkProps) {
  return (
    <li>
      <Link className="zijmenu-link" href={href} aria-current={huidigeStand(pathname, href, ookOnder)}>{children}</Link>
    </li>
  );
}

function Voortgang({ jaar }: { jaar: JaarCijfers }) {
  const tekst = jaar.voortgang === 'afgerond' ? 'afgerond' : `${jaar.aantalDefinitief} van ${jaar.platformen.length} definitief`;
  return (
    <span className="zijmenu-voortgang">
      <span aria-hidden="true">{jaar.voortgang}</span>
      <span className="visueel-verborgen">, {tekst}</span>
    </span>
  );
}

function JarenLijst({ pathname }: { pathname: string }) {
  const { staat } = useOverzicht();
  if (staat.status !== 'ok') return <p className="zijmenu-leeg">{staat.status === 'laden' ? 'Jaren worden geladen' : 'Jaren niet geladen'}</p>;
  if (staat.overzicht.jaren.length === 0) return <p className="zijmenu-leeg">Nog geen metingen</p>;
  return (
    <ul aria-labelledby="zijmenu-metingen">
      {staat.overzicht.jaren.map((j) => (
        <MenuLink key={j.jaar} href={`/metingen/${j.jaar}`} pathname={pathname} ookOnder>
          <span>{j.jaar}</span>
          <Voortgang jaar={j} />
        </MenuLink>
      ))}
    </ul>
  );
}

/**
 * Side menu: Overzicht, every measurement year (oldest first) with its progress, the admin links
 * and at the bottom the user with the logout link. Escape closes it on narrow screens.
 * @param props.pathname - Current URL path, for aria-current
 * @param props.open - Whether the menu is unfolded (only matters below 820 px)
 * @param props.onSluit - Called to fold the menu
 * @returns the side menu
 */
export function Zijmenu({ pathname, open, onSluit }: { pathname: string; open: boolean; onSluit: () => void }) {
  const { ik } = useIk();
  function toets(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) onSluit();
  }
  return (
    <aside id="zijmenu" className={`zijmenu${open ? ' is-open' : ''}`} onKeyDown={toets}>
      <nav aria-label="Hoofdmenu">
        <ul>
          <MenuLink href="/" pathname={pathname}>Overzicht</MenuLink>
        </ul>
        <p className="zijmenu-kop" id="zijmenu-metingen">Metingen</p>
        <JarenLijst pathname={pathname} />
        <p className="zijmenu-kop" id="zijmenu-beheer">Beheer</p>
        <ul aria-labelledby="zijmenu-beheer">
          {ik?.rol === 'beheerder' && <MenuLink href="/beheer" pathname={pathname}>Gebruikers</MenuLink>}
          {ik?.rol === 'beheerder' && <MenuLink href="/beheer#nieuwe-meting" pathname={pathname}>Nieuwe meting</MenuLink>}
          <MenuLink href="/beheer/audit" pathname={pathname}>Auditlog</MenuLink>
        </ul>
      </nav>
      <GebruikerMenu ik={ik} />
    </aside>
  );
}
