'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { bouwKruimelpad } from './_kruimelpad';

/**
 * Breadcrumb navigation derived from the current URL.
 * @returns nav landmark with the trail; the last crumb is the current page
 */
export function Kruimelpad() {
  const crumbs = bouwKruimelpad(usePathname());
  return (
    <nav aria-label="Kruimelpad" className="kruimelpad">
      <ol>
        {crumbs.map((c, i) => (
          <li key={c.href}>
            {i === crumbs.length - 1 ? <span aria-current="page">{c.label}</span> : <Link href={c.href}>{c.label}</Link>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
