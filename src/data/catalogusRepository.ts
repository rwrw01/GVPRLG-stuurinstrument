import type { Prisma } from '@prisma/client';

import { prisma } from './prismaClient';
import { vergrendelCatalogus } from './vragenlijstRepository';

/** The four managed lists. A `vraag` hangs under an `as`, a `businessunit` under a `platform`. */
export type CatalogusSoort = 'as' | 'vraag' | 'platform' | 'businessunit';

/**
 * One catalogue row in a uniform shape. `ouderId` is the axis of a question or the platform of a
 * business unit (null for axes and platforms); `naam` is the question text for a question.
 */
export interface CatalogusRij {
  id: string;
  ouderId: string | null;
  naam: string;
  kort: string | null;
  nds: string | null;
  kleur: string | null;
  volgorde: number;
  vervallen: boolean;
}

/** Fields that can be written; omitted fields stay untouched. */
export type CatalogusVelden = Partial<Omit<CatalogusRij, 'id'>>;

type Tx = Prisma.TransactionClient;

const naarRij = {
  as: (r: { id: string; naam: string; kleur: string; volgorde: number; vervallen: boolean }): CatalogusRij =>
    ({ id: r.id, ouderId: null, naam: r.naam, kort: null, nds: null, kleur: r.kleur, volgorde: r.volgorde, vervallen: r.vervallen }),
  vraag: (r: { id: string; asId: string; kort: string; tekst: string; nds: string | null; volgorde: number; vervallen: boolean }): CatalogusRij =>
    ({ id: r.id, ouderId: r.asId, naam: r.tekst, kort: r.kort, nds: r.nds, kleur: null, volgorde: r.volgorde, vervallen: r.vervallen }),
  platform: (r: { id: string; naam: string; volgorde: number; vervallen: boolean }): CatalogusRij =>
    ({ id: r.id, ouderId: null, naam: r.naam, kort: null, nds: null, kleur: null, volgorde: r.volgorde, vervallen: r.vervallen }),
  businessunit: (r: { id: string; platformId: string; naam: string; kleur: string; volgorde: number; vervallen: boolean }): CatalogusRij =>
    ({ id: r.id, ouderId: r.platformId, naam: r.naam, kort: null, nds: null, kleur: r.kleur, volgorde: r.volgorde, vervallen: r.vervallen }),
};

/**
 * Runs catalogue changes in one transaction holding the exclusive catalogue lock, so the rule
 * checks (minimum questions, free colours) and a concurrent freeze of a year never interleave.
 * @param werk - The changes, run with the transaction client
 * @returns what `werk` returns
 */
export async function inCatalogusTransactie<T>(werk: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await vergrendelCatalogus(tx, 'exclusief');
    return werk(tx);
  });
}

/**
 * Reads every row of one list, removed rows included, in their order.
 * @param soort - Which list
 * @param tx - Transaction client (default: the shared client)
 * @returns the rows ordered by `volgorde`
 */
export async function leesRijen(soort: CatalogusSoort, tx: Tx | typeof prisma = prisma): Promise<CatalogusRij[]> {
  const orderBy = { volgorde: 'asc' } as const;
  switch (soort) {
    case 'as':
      return (await tx.as.findMany({ orderBy })).map(naarRij.as);
    case 'vraag':
      return (await tx.vraag.findMany({ orderBy })).map(naarRij.vraag);
    case 'platform':
      return (await tx.platform.findMany({ orderBy })).map(naarRij.platform);
    case 'businessunit':
      return (await tx.businessUnit.findMany({ orderBy })).map(naarRij.businessunit);
  }
}

/**
 * Creates one row with a generated (cuid) key.
 * @param tx - Transaction client
 * @param soort - Which list
 * @param v - All fields the list needs (`ouderId`, `kort`, `kleur` where applicable)
 * @returns the created row
 */
export async function maakRij(tx: Tx, soort: CatalogusSoort, v: Omit<CatalogusRij, 'id' | 'vervallen'>): Promise<CatalogusRij> {
  switch (soort) {
    case 'as':
      return naarRij.as(await tx.as.create({ data: { naam: v.naam, kleur: v.kleur!, volgorde: v.volgorde } }));
    case 'vraag':
      return naarRij.vraag(await tx.vraag.create({ data: { asId: v.ouderId!, tekst: v.naam, kort: v.kort!, nds: v.nds, volgorde: v.volgorde } }));
    case 'platform':
      return naarRij.platform(await tx.platform.create({ data: { naam: v.naam, volgorde: v.volgorde } }));
    case 'businessunit':
      return naarRij.businessunit(await tx.businessUnit.create({ data: { platformId: v.ouderId!, naam: v.naam, kleur: v.kleur!, volgorde: v.volgorde } }));
  }
}

/**
 * Updates one row; colours are never changed after creation.
 * @param tx - Transaction client
 * @param soort - Which list
 * @param id - Row id
 * @param v - Fields to change
 * @returns the updated row
 */
export async function wijzigRij(tx: Tx, soort: CatalogusSoort, id: string, v: CatalogusVelden): Promise<CatalogusRij> {
  const basis = { volgorde: v.volgorde, vervallen: v.vervallen };
  switch (soort) {
    case 'as':
      return naarRij.as(await tx.as.update({ where: { id }, data: { ...basis, naam: v.naam } }));
    case 'vraag':
      return naarRij.vraag(await tx.vraag.update({
        where: { id },
        data: { ...basis, asId: v.ouderId ?? undefined, tekst: v.naam, kort: v.kort ?? undefined, nds: v.nds },
      }));
    case 'platform':
      return naarRij.platform(await tx.platform.update({ where: { id }, data: { ...basis, naam: v.naam } }));
    case 'businessunit':
      return naarRij.businessunit(await tx.businessUnit.update({ where: { id }, data: { ...basis, naam: v.naam, platformId: v.ouderId ?? undefined } }));
  }
}

/**
 * The id of the meting of a year.
 * @param jaar - Measurement year
 * @returns the id, or null when the year does not exist
 */
export async function metingIdVanJaar(jaar: number): Promise<string | null> {
  return (await prisma.meting.findUnique({ where: { jaar }, select: { id: true } }))?.id ?? null;
}

/**
 * The open metingen (not frozen), which follow the catalogue.
 * @param tx - Transaction client (or the shared client)
 * @returns id and year, oldest first
 */
export async function openMetingen(tx: Tx | typeof prisma): Promise<Array<{ id: string; jaar: number }>> {
  return tx.meting.findMany({ where: { vastgelegdOp: null }, orderBy: { jaar: 'asc' }, select: { id: true, jaar: true } });
}

/**
 * Every meting with whether it is frozen and whether it holds anything an unfreeze would lose.
 * @returns year, frozen flag and content flag, oldest first
 */
export async function metingStanden(): Promise<Array<{ jaar: number; vastgelegd: boolean; heeftInhoud: boolean }>> {
  const [metingen, vragen, units] = await Promise.all([
    prisma.meting.findMany({ orderBy: { jaar: 'asc' }, select: { id: true, jaar: true, vastgelegdOp: true } }),
    prisma.vraagScore.findMany({ where: { OR: [{ score: { not: null } }, { toelichting: { not: '' } }] }, select: { metingId: true }, distinct: ['metingId'] }),
    prisma.businessUnitScore.findMany({ where: { OR: [{ algemeneToelichting: { not: '' } }, { aanwezigen: { not: '' } }] }, select: { metingId: true }, distinct: ['metingId'] }),
  ]);
  const metInhoud = new Set([...vragen, ...units].map((r) => r.metingId));
  return metingen.map((m) => ({ jaar: m.jaar, vastgelegd: m.vastgelegdOp !== null, heeftInhoud: metInhoud.has(m.id) }));
}

/**
 * Removes the filler links to one platform in the given metingen.
 * @param tx - Transaction client
 * @param platformId - Platform id
 * @param metingIds - Metingen whose links go
 * @returns the removed links (user id and meting id)
 */
export async function verwijderKoppelingen(tx: Tx, platformId: string, metingIds: string[]): Promise<Array<{ gebruiker: string; metingId: string }>> {
  const where = { platformId, metingId: { in: metingIds } };
  const rijen = await tx.platformInvuller.findMany({ where, select: { gebruiker: true, metingId: true } });
  await tx.platformInvuller.deleteMany({ where });
  return rijen;
}
