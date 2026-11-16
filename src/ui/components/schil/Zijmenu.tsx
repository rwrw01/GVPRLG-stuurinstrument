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
  onKies: () => void;
  children: ReactNode;
}

/**
 * One menu item; a click always folds the menu on narrow screens, also on the current page.
 * @param props.href - Target
 * @param props.pathname - Current URL path, for aria-current
 * @param props.ookOnder - Also mark the item on pages below its target
 * @param props.onKies - Called on click
 * @param props.children - Link content
 * @returns the list item
 */
function MenuLink({ href, pathname, ookOnder = false, onKies, children }: MenuLinkProps) {
  return (
    <li>
      <Link className="zijmenu-link" href={href} aria-current={huidigeStand(pathname, href, ookOnder)} onClick={onKies}>{children}</Link>
    </li>
  );
}

/**
 * Progress label of a year with screen-reader text.
 * @param props.jaar - Year figures
 * @returns the label
 */
function Voortgang({ jaar }: { jaar: JaarCijfers }) {
  const tekst = jaar.voortgang === 'afgerond' ? 'afgerond' : `${jaar.aantalDefinitief} van ${jaar.businessUnits.length} businessunits definitief`;
  return (
    <span className="zijmenu-voortgang">
      <span aria-hidden="true">{jaar.voortgang}</span>
      <span className="visueel-verborgen">, {tekst}</span>
    </span>
  );
}

/**
 * The measurement years, oldest first, with their progress.
 * @param props.pathname - Current URL path
 * @param props.onKies - Called when a year is clicked
 * @returns the list, or a short status line while loading or without years
 */
function JarenLijst({ pathname, onKies }: { pathname: string; onKies: () => void }) {
  const { staat } = useOverzicht();
  if (staat.status !== 'ok') return <p className="zijmenu-leeg">{staat.status === 'laden' ? 'Jaren worden geladen' : 'Jaren niet geladen'}</p>;
  if (staat.overzicht.jaren.length === 0) return <p className="zijmenu-leeg">Nog geen metingen</p>;
  return (
    <ul aria-labelledby="zijmenu-metingen">
      {staat.overzicht.jaren.map((j) => (
        <MenuLink key={j.jaar} href={`/metingen/${j.jaar}`} pathname={pathname} ookOnder onKies={onKies}>
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
 * @param props.onSluit - Called to fold the menu and return focus to the Menu button (Escape)
 * @param props.onKies - Called when a menu link is clicked, to fold the menu
 * @returns the side menu
 */
export function Zijmenu(props: { pathname: string; open: boolean; onSluit: () => void; onKies: () => void }) {
  const { pathname, open, onSluit, onKies } = props;
  const { ik } = useIk();
  function toets(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) onSluit();
  }
  return (
    <aside id="zijmenu" className={`zijmenu${open ? ' is-open' : ''}`} onKeyDown={toets}>
      <nav aria-label="Hoofdmenu">
        <ul>
          <MenuLink href="/" pathname={pathname} onKies={onKies}>Overzicht</MenuLink>
        </ul>
        <p className="zijmenu-kop" id="zijmenu-metingen">Metingen</p>
        <JarenLijst pathname={pathname} onKies={onKies} />
        <p className="zijmenu-kop" id="zijmenu-beheer">Beheer</p>
        <ul aria-labelledby="zijmenu-beheer">
          {ik?.rol === 'beheerder' && <MenuLink href="/beheer" pathname={pathname} onKies={onKies}>Gebruikers</MenuLink>}
          {ik?.rol === 'beheerder' && <MenuLink href="/beheer#nieuwe-meting" pathname={pathname} onKies={onKies}>Nieuwe meting</MenuLink>}
          <MenuLink href="/beheer/vragenlijst" pathname={pathname} onKies={onKies}>Vragenlijst</MenuLink>
          <MenuLink href="/beheer/businessunits" pathname={pathname} onKies={onKies}>Businessunits</MenuLink>
          {ik?.rol === 'beheerder' && <MenuLink href="/beheer/audit" pathname={pathname} onKies={onKies}>Auditlog</MenuLink>}
        </ul>
      </nav>
      <GebruikerMenu ik={ik} />
    </aside>
  );
}
