// Test-only helper: the E2E global setup hard-deletes rows, so it may only ever touch a local database.

const LOKALE_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
// Connection parameters with which libpq/pg take the host from the query string instead of the authority.
const HOST_PARAMETERS = ['host', 'hostaddr'];

/**
 * Refuses to go on unless DATABASE_URL points at a database on this machine, or E2E_ALLOW_DB names
 * exactly that URL's host (an explicit, deliberate exception, e.g. a disposable CI database). A URL
 * that sets the host through `?host=` or `?hostaddr=` is refused outright: the pg driver would
 * connect there, not to the host in the authority part.
 * @param url - The DATABASE_URL the setup would use
 * @param toegestaan - Value of E2E_ALLOW_DB, if set; an empty value never matches
 * @returns the host when allowed
 * @throws Error naming the host when the database is not local and not explicitly allowed
 */
export function vereisLokaleDatabase(url: string | undefined, toegestaan?: string): string {
  if (!url) throw new Error('E2E setup refused: DATABASE_URL is not set.');
  let ontleed: URL;
  try {
    ontleed = new URL(url);
  } catch {
    throw new Error('E2E setup refused: DATABASE_URL is not a valid URL.');
  }
  const hostParameter = HOST_PARAMETERS.find((p) => ontleed.searchParams.has(p));
  if (hostParameter) throw new Error(`E2E setup refused: DATABASE_URL sets the host through ?${hostParameter}=; use the host part of the URL.`);
  const host = ontleed.hostname;
  if (host === '') throw new Error('E2E setup refused: DATABASE_URL has no host.');
  if (LOKALE_HOSTS.has(host)) return host;
  if (toegestaan !== undefined && toegestaan.trim() !== '' && toegestaan.trim() === host) return host;
  throw new Error(`E2E setup refused: DATABASE_URL points at host "${host}", not a local database. Set E2E_ALLOW_DB=${host} to allow it on purpose.`);
}
