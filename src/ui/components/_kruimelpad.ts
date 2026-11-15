export interface Kruimel {
  label: string;
  href: string;
}

/** Resolves a business unit id to its name in a year; undefined when unknown. */
export type NaamVan = (jaar: number, businessUnitId: string) => string | undefined;

const BEHEER_PAGINAS: Record<string, string> = { audit: 'Audit', vragenlijst: 'Vragenlijst', businessunits: 'Businessunits' };

// Under /beheer the second segment is a sub page, not a year.
function beheerKruimels(sub: string | undefined): Kruimel[] {
  const crumbs: Kruimel[] = [{ label: 'Beheer', href: '/beheer' }];
  const label = sub ? BEHEER_PAGINAS[sub] : undefined;
  if (sub && label) crumbs.push({ label, href: `/beheer/${sub}` });
  return crumbs;
}

/**
 * Builds the breadcrumb trail for an app path such as /metingen/2026/ro/resultaat.
 * @param pathname current URL path
 * @param naamVan resolves the business unit name of that year (falls back to the raw segment)
 * @returns crumbs from the home page down to the current page
 */
export function bouwKruimelpad(pathname: string, naamVan: NaamVan = () => undefined): Kruimel[] {
  const crumbs: Kruimel[] = [{ label: 'Overzicht', href: '/' }];
  const [eerste, jaar, businessUnitId, sub] = pathname.split('/').filter(Boolean);
  if (eerste === 'beheer') return [...crumbs, ...beheerKruimels(jaar)];
  if (eerste !== 'metingen' || !jaar) return crumbs;

  crumbs.push({ label: `Meting ${jaar}`, href: `/metingen/${jaar}` });
  if (!businessUnitId) return crumbs;

  const naam = naamVan(Number(jaar), businessUnitId) ?? businessUnitId;
  crumbs.push({ label: naam, href: `/metingen/${jaar}/${businessUnitId}` });
  if (sub === 'resultaat') {
    crumbs.push({ label: 'Resultaat', href: `/metingen/${jaar}/${businessUnitId}/resultaat` });
  }
  return crumbs;
}
