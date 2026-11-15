// Test-only helper: the E2E global setup hard-deletes rows, so it may only ever touch a local database.

const LOKALE_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Refuses to go on unless DATABASE_URL points at a database on this machine, or E2E_ALLOW_DB names
 * exactly that URL's host (an explicit, deliberate exception, e.g. a disposable CI database).
 * @param url - The DATABASE_URL the setup would use
 * @param toegestaan - Value of E2E_ALLOW_DB, if set
 * @returns the host when allowed
 * @throws Error naming the host when the database is not local and not explicitly allowed
 */
export function vereisLokaleDatabase(url: string | undefined, toegestaan?: string): string {
  if (!url) throw new Error('E2E setup refused: DATABASE_URL is not set.');
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error('E2E setup refused: DATABASE_URL is not a valid URL.');
  }
  if (LOKALE_HOSTS.has(host) || (toegestaan !== undefined && toegestaan === host)) return host;
  throw new Error(`E2E setup refused: DATABASE_URL points at host "${host}", not a local database. Set E2E_ALLOW_DB=${host} to allow it on purpose.`);
}
