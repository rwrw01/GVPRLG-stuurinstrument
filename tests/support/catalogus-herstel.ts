// Test-only helper: imported exclusively from *.test.ts files, never from production code.
import type { PrismaClient } from '@prisma/client';

import { STANDAARD } from './vragenlijst-testdata';

/**
 * Puts the catalogue of the test database back to the migrated list: restores every migrated row
 * (texts, colours, order, parent, not removed) and hard-deletes rows a test created. Call after the
 * metingen are deleted, because snapshot rows reference the catalogue.
 * @param prisma - Client of the test database
 * @returns Promise that resolves once restored
 */
export async function herstelCatalogus(prisma: PrismaClient): Promise<void> {
  const asIds = STANDAARD.assen.map((a) => a.id);
  const vraagIds = STANDAARD.assen.flatMap((a) => a.vragen.map((v) => v.id));
  const platformIds = STANDAARD.platformen.map((p) => p.id);
  const unitIds = STANDAARD.businessUnits.map((b) => b.id);
  await prisma.$transaction([
    ...STANDAARD.assen.map((a, i) => prisma.as.update({ where: { id: a.id }, data: { naam: a.naam, kleur: a.kleur, volgorde: i, vervallen: false } })),
    ...STANDAARD.assen.flatMap((a) => a.vragen.map((v, i) => prisma.vraag.update({
      where: { id: v.id }, data: { asId: a.id, kort: v.kort, tekst: v.tekst, nds: v.nds ?? null, volgorde: i, vervallen: false },
    }))),
    ...STANDAARD.platformen.map((p, i) => prisma.platform.update({ where: { id: p.id }, data: { naam: p.naam, volgorde: i, vervallen: false } })),
    ...STANDAARD.businessUnits.map((b) => prisma.businessUnit.update({ where: { id: b.id }, data: { platformId: b.platformId, naam: b.naam, kleur: b.kleur, volgorde: 0, vervallen: false } })),
    prisma.platformInvuller.deleteMany({ where: { platformId: { notIn: platformIds } } }),
    prisma.vraag.deleteMany({ where: { id: { notIn: vraagIds } } }),
    prisma.businessUnit.deleteMany({ where: { id: { notIn: unitIds } } }),
    prisma.as.deleteMany({ where: { id: { notIn: asIds } } }),
    prisma.platform.deleteMany({ where: { id: { notIn: platformIds } } }),
  ]);
}
