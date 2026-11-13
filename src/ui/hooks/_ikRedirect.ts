// Pages that render the layout (and thus useIk) but must never redirect themselves.
function _isAuthPagina(pathname: string): boolean {
  return pathname.startsWith('/inloggen') || pathname === '/geen-toegang';
}

/**
 * Decides where to send the browser after `GET /api/ik` answered with the given status.
 * @param status - HTTP status of `GET /api/ik`
 * @param pathname - Current `location.pathname`
 * @param search - Current `location.search` (including the leading `?`, or empty)
 * @returns Target URL for 401 (login with callbackUrl) or 403 (`/geen-toegang`); null otherwise
 */
export function bepaalRedirect(status: number, pathname: string, search: string): string | null {
  if (_isAuthPagina(pathname)) return null;
  if (status === 401) return `/inloggen?callbackUrl=${encodeURIComponent(`${pathname}${search}`)}`;
  if (status === 403) return '/geen-toegang';
  return null;
}
