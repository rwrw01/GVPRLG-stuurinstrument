'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { Kruimelpad } from '@/src/ui/components/Kruimelpad';
import { OverzichtProvider } from '@/src/ui/hooks/useOverzicht';

import { Zijmenu } from './Zijmenu';
import { zonderMenu } from './_schilPaden';

/**
 * Header with the product name, the subtitle and (on app pages) the Menu button.
 * @param props.menuKnop - The Menu button, or null on pages without a session
 * @returns the header
 */
function Kop({ menuKnop }: { menuKnop: ReactNode }) {
  return (
    <header className="kop">
      <div className="kop-merk">
        <h1>Spinnenweb</h1>
        <p className="kop-ondertitel">Jaarlijkse meting van de PinkRoccade-platformen door de gebruikersvereniging</p>
      </div>
      {menuKnop}
    </header>
  );
}

/**
 * App shell: the header on every page; on pages with a session also the side menu (folded behind
 * a "Menu" button below 820 px) and the breadcrumb above the content.
 * @param props.children - The page
 * @returns the shell around the page
 */
export function Schil({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const kaal = zonderMenu(pathname);
  const [open, setOpen] = useState(false);

  // Escape folds the menu; focus goes back to the button instead of disappearing with the menu.
  function sluit() {
    setOpen(false);
    document.getElementById('menu-knop')?.focus();
  }

  // Fold the menu after every navigation on narrow screens.
  useEffect(() => setOpen(false), [pathname]);

  const menuKnop = kaal ? null : (
    <button type="button" id="menu-knop" className="menu-knop" aria-expanded={open} aria-controls="zijmenu"
      onClick={() => setOpen((o) => !o)} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      Menu
    </button>
  );

  return (
    <OverzichtProvider sleutel={pathname} actief={!kaal}>
      <a className="naar-inhoud" href="#inhoud">Naar de inhoud</a>
      <Kop menuKnop={menuKnop} />
      {kaal ? (
        <main id="inhoud" className="inhoud inhoud-kaal">{children}</main>
      ) : (
        <div className="schil">
          <Zijmenu pathname={pathname} open={open} onSluit={sluit} onKies={() => setOpen(false)} />
          <main id="inhoud" className="inhoud">
            <Kruimelpad />
            {children}
          </main>
        </div>
      )}
    </OverzichtProvider>
  );
}
