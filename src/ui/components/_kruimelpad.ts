import { CONFIG } from '@/src/service/config';

export interface Kruimel {
  label: string;
  href: string;
}

// Under /beheer the second segment is a sub page (only "audit" exists), not a year.
function beheerKruimels(sub: string | undefined): Kruimel[] {
  const crumbs: Kruimel[] = [{ label: 'Beheer', href: '/beheer' }];
  if (sub === 'audit') crumbs.push({ label: 'Audit', href: '/beheer/audit' });
  return crumbs;
}

/**
 * Builds the breadcrumb trail for an app path such as /metingen/2026/ro/resultaat.
 * @param pathname current URL path
 * @returns crumbs from the home page down to the current page
 */
export function bouwKruimelpad(pathname: string): Kruimel[] {
  const crumbs: Kruimel[] = [{ label: 'Overzicht', href: '/' }];
  const [eerste, jaar, platformId, sub] = pathname.split('/').filter(Boolean);
  if (eerste === 'beheer') return [...crumbs, ...beheerKruimels(jaar)];
  if (eerste !== 'metingen' || !jaar) return crumbs;

  crumbs.push({ label: `Meting ${jaar}`, href: `/metingen/${jaar}` });
  if (!platformId) return crumbs;

  const naam = CONFIG.platformen.find((p) => p.id === platformId)?.naam ?? platformId;
  crumbs.push({ label: naam, href: `/metingen/${jaar}/${platformId}` });
  if (sub === 'resultaat') {
    crumbs.push({ label: 'Resultaat', href: `/metingen/${jaar}/${platformId}/resultaat` });
  }
  return crumbs;
}
