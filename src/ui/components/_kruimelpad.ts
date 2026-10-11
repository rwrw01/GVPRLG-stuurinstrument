import { CONFIG } from '@/src/service/config';

export interface Kruimel {
  label: string;
  href: string;
}

/**
 * Builds the breadcrumb trail for an app path such as /metingen/2026/ro/resultaat.
 * @param pathname current URL path
 * @returns crumbs from the home page down to the current page
 */
export function bouwKruimelpad(pathname: string): Kruimel[] {
  const crumbs: Kruimel[] = [{ label: 'Metingen', href: '/' }];
  const [eerste, jaar, platformId, sub] = pathname.split('/').filter(Boolean);
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
