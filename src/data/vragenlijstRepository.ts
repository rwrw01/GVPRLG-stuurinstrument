import type { Prisma } from '@prisma/client';

import { prisma } from './prismaClient';

/** One question of a year's questionnaire. */
export interface LijstVraag {
  id: string;
  asId: string;
  kort: string;
  tekst: string;
  nds?: string;
}

/** One axis of a year's questionnaire with its questions, ordered. */
export interface LijstAs {
  id: string;
  naam: string;
  kleur: string;
  vragen: LijstVraag[];
}

/** One user platform of a year with its business units (ordered ids). */
export interface LijstPlatform {
  id: string;
  naam: string;
  businessUnitIds: string[];
}

/** One scored business unit of a year. */
export interface LijstBusinessUnit {
  id: string;
  platformId: string;
  naam: string;
  kleur: string;
}

/** The questionnaire of one measurement year: the frozen copy, or the active catalogue while open. */
export type Vragenlijst = {
  jaar: number;
  vastgelegd: boolean;
  assen: LijstAs[];
  platformen: LijstPlatform[];
  businessUnits: LijstBusinessUnit[];
};

/** A web needs at least three spokes; freezing and removing questions keep at least this many. */
export const MINIMUM_VRAGEN = 3;

/** Advisory lock key that serializes catalogue writes against freezing (shared) a year. */
const CATALOGUS_SLOT = 734_211;

type Client = Prisma.TransactionClient | typeof prisma;

type Inhoud = Omit<Vragenlijst, 'jaar' | 'vastgelegd'>;

/**
 * Takes the catalogue advisory lock for the rest of the transaction.
 * @param tx - Transaction client
 * @param modus - `exclusief` for catalogue writes, `gedeeld` for freezing a year
 * @returns Promise that resolves once the lock is held
 */
export async function vergrendelCatalogus(tx: Prisma.TransactionClient, modus: 'exclusief' | 'gedeeld'): Promise<void> {
  if (modus === 'exclusief') await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CATALOGUS_SLOT}::bigint)`;
  else await tx.$executeRaw`SELECT pg_advisory_xact_lock_shared(${CATALOGUS_SLOT}::bigint)`;
}

function metNds<T extends { nds: string | null }>(v: T): Omit<T, 'nds'> & { nds?: string } {
  const { nds, ...rest } = v;
  return nds ? { ...rest, nds } : rest;
}

/**
 * Reads the active catalogue: axes with at least one active question, active platforms with their
 * active business units. Business units are ordered by platform, then by their own order.
 * @param client - Prisma client or transaction client
 * @returns the active lists
 */
async function leesActief(client: Client): Promise<Inhoud> {
  const [assen, platformen] = await Promise.all([
    client.as.findMany({
      where: { vervallen: false },
      orderBy: { volgorde: 'asc' },
      include: { vragen: { where: { vervallen: false }, orderBy: { volgorde: 'asc' } } },
    }),
    client.platform.findMany({
      where: { vervallen: false },
      orderBy: { volgorde: 'asc' },
      include: { businessUnits: { where: { vervallen: false }, orderBy: { volgorde: 'asc' } } },
    }),
  ]);
  return {
    assen: assen
      .filter((a) => a.vragen.length > 0)
      .map((a) => ({ id: a.id, naam: a.naam, kleur: a.kleur, vragen: a.vragen.map((v) => metNds({ id: v.id, asId: v.asId, kort: v.kort, tekst: v.tekst, nds: v.nds })) })),
    platformen: platformen.map((p) => ({ id: p.id, naam: p.naam, businessUnitIds: p.businessUnits.map((b) => b.id) })),
    businessUnits: platformen.flatMap((p) => p.businessUnits.map((b) => ({ id: b.id, platformId: b.platformId, naam: b.naam, kleur: b.kleur }))),
  };
}

type KopieRijen = {
  assen: Array<{ asId: string; naam: string; kleur: string }>;
  vragen: Array<{ vraagId: string; asId: string; kort: string; tekst: string; nds: string | null }>;
  platformen: Array<{ platformId: string; naam: string }>;
  units: Array<{ businessUnitId: string; platformId: string; naam: string; kleur: string }>;
};

/**
 * Shapes the snapshot rows of one meting (each already in order) into the lists.
 * @param rijen - Snapshot rows of one meting
 * @returns the frozen lists
 */
function bouwKopie({ assen, vragen, platformen, units }: KopieRijen): Inhoud {
  const unitsVan = (platformId: string) => units.filter((b) => b.platformId === platformId);
  return {
    assen: assen.map((a) => ({
      id: a.asId, naam: a.naam, kleur: a.kleur,
      vragen: vragen.filter((v) => v.asId === a.asId).map((v) => metNds({ id: v.vraagId, asId: v.asId, kort: v.kort, tekst: v.tekst, nds: v.nds })),
    })),
    platformen: platformen.map((p) => ({ id: p.platformId, naam: p.naam, businessUnitIds: unitsVan(p.platformId).map((b) => b.businessUnitId) })),
    businessUnits: platformen.flatMap((p) => unitsVan(p.platformId).map((b) => ({ id: b.businessUnitId, platformId: b.platformId, naam: b.naam, kleur: b.kleur }))),
  };
}

/**
 * Reads the snapshot rows of the given metingen (all when omitted), each table in snapshot order.
 * @param client - Prisma client or transaction client
 * @param metingId - Restrict to one meting
 * @returns the rows with their meting id
 */
async function leesKopieRijen(client: Client, metingId?: string) {
  const where = metingId ? { metingId } : {};
  const orderBy = { volgorde: 'asc' } as const;
  const [assen, vragen, platformen, units] = await Promise.all([
    client.metingAs.findMany({ where, orderBy }),
    client.metingVraag.findMany({ where, orderBy }),
    client.metingPlatform.findMany({ where, orderBy }),
    client.metingBusinessUnit.findMany({ where, orderBy }),
  ]);
  return { assen, vragen, platformen, units };
}

/**
 * Picks the snapshot rows of one meting out of rows of several metingen.
 * @param rijen - Rows of several metingen
 * @param metingId - Meting id
 * @returns the rows of that meting
 */
function vanMeting(rijen: Awaited<ReturnType<typeof leesKopieRijen>>, metingId: string): KopieRijen {
  const eigen = <T extends { metingId: string }>(lijst: T[]) => lijst.filter((r) => r.metingId === metingId);
  return { assen: eigen(rijen.assen), vragen: eigen(rijen.vragen), platformen: eigen(rijen.platformen), units: eigen(rijen.units) };
}

/**
 * The questionnaire of one year: the frozen copy when the year is frozen, otherwise the active catalogue.
 * @param jaar - Measurement year
 * @param client - Optional transaction client (default: the shared client)
 * @returns the list, or null when the meting does not exist
 */
export async function leesVragenlijst(jaar: number, client: Client = prisma): Promise<Vragenlijst | null> {
  const meting = await client.meting.findUnique({ where: { jaar }, select: { id: true, vastgelegdOp: true } });
  if (!meting) return null;
  const vastgelegd = meting.vastgelegdOp !== null;
  return { jaar, vastgelegd, ...(vastgelegd ? bouwKopie(await leesKopieRijen(client, meting.id)) : await leesActief(client)) };
}

/**
 * The questionnaires of every year, reading the catalogue once for all open years.
 * @returns a map from year to its list
 */
export async function leesVragenlijsten(): Promise<Map<number, Vragenlijst>> {
  const metingen = await prisma.meting.findMany({ orderBy: { jaar: 'asc' }, select: { id: true, jaar: true, vastgelegdOp: true } });
  const [actief, kopie] = await Promise.all([leesActief(prisma), leesKopieRijen(prisma)]);
  const lijsten = new Map<number, Vragenlijst>();
  for (const m of metingen) {
    const vastgelegd = m.vastgelegdOp !== null;
    lijsten.set(m.jaar, { jaar: m.jaar, vastgelegd, ...(vastgelegd ? bouwKopie(vanMeting(kopie, m.id)) : actief) });
  }
  return lijsten;
}

/**
 * Copies the active catalogue into the snapshot tables of the meting.
 * @param tx - Transaction client
 * @param metingId - Meting id
 * @param lijst - The active lists
 * @returns Promise that resolves once copied
 */
async function kopieer(tx: Prisma.TransactionClient, metingId: string, lijst: Inhoud): Promise<void> {
  await tx.metingAs.createMany({ data: lijst.assen.map((a, i) => ({ metingId, asId: a.id, naam: a.naam, kleur: a.kleur, volgorde: i })) });
  await tx.metingVraag.createMany({
    data: lijst.assen.flatMap((a) => a.vragen.map((v, i) => ({ metingId, vraagId: v.id, asId: a.id, kort: v.kort, tekst: v.tekst, nds: v.nds ?? null, volgorde: i }))),
  });
  await tx.metingPlatform.createMany({ data: lijst.platformen.map((p, i) => ({ metingId, platformId: p.id, naam: p.naam, volgorde: i })) });
  await tx.metingBusinessUnit.createMany({
    data: lijst.businessUnits.map((b) => ({
      metingId, businessUnitId: b.id, platformId: b.platformId, naam: b.naam, kleur: b.kleur,
      volgorde: lijst.platformen.find((p) => p.id === b.platformId)!.businessUnitIds.indexOf(b.id),
    })),
  });
}

/**
 * Freezes the questionnaire of a meting: copies the active catalogue into the snapshot tables and
 * sets `vastgelegdOp`. Idempotent and race-safe: the meting row is locked until the transaction
 * ends, so of two concurrent first saves one copies and the other sees the year frozen.
 * @param tx - Transaction client of the save
 * @param metingId - Meting id
 * @returns `vastgelegd` (also when it already was), or `te-weinig-vragen` below MINIMUM_VRAGEN
 */
export async function legVast(tx: Prisma.TransactionClient, metingId: string): Promise<'vastgelegd' | 'te-weinig-vragen'> {
  await vergrendelCatalogus(tx, 'gedeeld');
  const rijen = await tx.$queryRaw<Array<{ vastgelegdOp: Date | null }>>`SELECT "vastgelegdOp" FROM metingen WHERE id = ${metingId} FOR UPDATE`;
  if (!rijen[0]) throw new Error(`Meting ${metingId} not found while freezing`);
  if (rijen[0].vastgelegdOp !== null) return 'vastgelegd';
  const lijst = await leesActief(tx);
  if (lijst.assen.reduce((som, a) => som + a.vragen.length, 0) < MINIMUM_VRAGEN) return 'te-weinig-vragen';
  await kopieer(tx, metingId, lijst);
  await tx.meting.update({ where: { id: metingId }, data: { vastgelegdOp: new Date() } });
  return 'vastgelegd';
}

/**
 * Unfreezes a meting when it holds nothing that would be lost: no score, no question comment, no
 * general comment and no aanwezigen. Removes the empty rows and the copy, in one transaction with a
 * row lock on the meting; `auditInTx` writes the audit row in the same transaction.
 * @param metingId - Meting id
 * @param auditInTx - Writes the audit row through the given transaction client
 * @returns `vrijgegeven`, `niet-vastgelegd` or `heeft-inhoud`
 */
export async function geefVrij(
  metingId: string,
  auditInTx: (tx: Prisma.TransactionClient) => Promise<void>,
): Promise<'vrijgegeven' | 'niet-vastgelegd' | 'heeft-inhoud'> {
  return prisma.$transaction(async (tx) => {
    const rijen = await tx.$queryRaw<Array<{ vastgelegdOp: Date | null }>>`SELECT "vastgelegdOp" FROM metingen WHERE id = ${metingId} FOR UPDATE`;
    if (!rijen[0] || rijen[0].vastgelegdOp === null) return 'niet-vastgelegd';
    const [vragen, units] = await Promise.all([
      tx.vraagScore.count({ where: { metingId, OR: [{ score: { not: null } }, { toelichting: { not: '' } }] } }),
      tx.businessUnitScore.count({ where: { metingId, OR: [{ algemeneToelichting: { not: '' } }, { aanwezigen: { not: '' } }] } }),
    ]);
    if (vragen + units > 0) return 'heeft-inhoud';
    await tx.vraagScore.deleteMany({ where: { metingId } });
    await tx.businessUnitScore.deleteMany({ where: { metingId } });
    await tx.metingBusinessUnit.deleteMany({ where: { metingId } });
    await tx.metingPlatform.deleteMany({ where: { metingId } });
    await tx.metingVraag.deleteMany({ where: { metingId } });
    await tx.metingAs.deleteMany({ where: { metingId } });
    await tx.meting.update({ where: { id: metingId }, data: { vastgelegdOp: null } });
    await auditInTx(tx);
    return 'vrijgegeven';
  });
}
