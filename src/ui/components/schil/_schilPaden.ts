/** Pages a visitor sees without a session: header only, no side menu. */
const ZONDER_MENU = ['/inloggen', '/inloggen/doorsturen', '/geen-toegang'];

/**
 * Whether the page is shown without the side menu.
 * @param pathname - Current URL path
 * @returns true on the login, redirect and no-access pages
 */
export function zonderMenu(pathname: string): boolean {
  const pad = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return ZONDER_MENU.includes(pad);
}

/**
 * The `aria-current` value of a side-menu link: "page" on the page itself, "location" on a page
 * below it (only for links with `ookOnder`), otherwise undefined.
 * @param pathname - Current URL path
 * @param href - Target of the menu link
 * @param ookOnder - Also mark the link on pages below its target (a year with its platform pages)
 * @returns the aria-current value
 */
export function huidigeStand(pathname: string, href: string, ookOnder = false): 'page' | 'location' | undefined {
  if (pathname === href) return 'page';
  if (ookOnder && pathname.startsWith(`${href}/`)) return 'location';
  return undefined;
}
