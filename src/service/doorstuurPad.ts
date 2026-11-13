/**
 * Reduces a redirect target to a path on the given origin, so it can never leave the app.
 * Parses like a browser does (`/\host` is protocol-relative), so tricks such as `//host` or
 * `/\host` resolve to a foreign origin and are rejected.
 * @param naar - Untrusted target, relative or absolute
 * @param origin - Origin (or any URL on it) the target must stay on
 * @returns `pathname + search + hash` of the target, or `/` when it is unsafe
 */
export function veiligDoorstuurPad(naar: string | null, origin: string): string {
  if (naar === null) return '/';
  let doel: URL;
  try {
    doel = new URL(naar, origin);
  } catch {
    return '/';
  }
  if (doel.origin !== new URL(origin).origin || doel.pathname.startsWith('//')) return '/';
  return `${doel.pathname}${doel.search}${doel.hash}`;
}
