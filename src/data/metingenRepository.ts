import type { Prisma } from '@prisma/client';

import { businessUnitDetail, schrijfAudit } from './auditRepository';
import { prisma } from './prismaClient';
import { legVast, leesVragenlijst, type Vragenlijst } from './vragenlijstRepository';

/** The stored row of one business unit within a meting. */
export interface BusinessUnitSnapshot {
  status: string;
  algemeneToelichting: string;
  aanwezigen: string;
  laatstGewijzigdDoor: string;
  laatstGewijzigdOp: Date;
  scoresPerAs: Record<string, Record<string, number | null>>;
  toelichtingen: Record<string, string>;
}

/** One meting with the rows of the business units filled in so far, keyed by business unit id. */
export interface MetingMetBusinessUnits {
  id: string;
  jaar: number;
  aangemaakt: Date;
  vastgelegd: boolean;
  businessUnits: Record<string, BusinessUnitSnapshot>;
}

/**
 * Lists every meting, oldest year first.
 * @returns the meting rows
 */
export async function listMetingen() {
  return prisma.meting.findMany({ orderBy: { jaar: 'asc' } });
}

/**
 * Creates an open meting (it follows the catalogue until its first save).
 * @param jaar - Measurement year
 * @returns the created row
 */
export async function createMeting(jaar: number) {
  return prisma.meting.create({ data: { jaar } });
}

const MET_SCORES = {
  businessUnitScores: { include: { vraagScores: { include: { metingVraag: { select: { asId: true } } } } } },
} as const;

type MetingRij = Prisma.MetingGetPayload<{ include: typeof MET_SCORES }>;

// Maps one meting row to the snapshot shape; the axis of every score comes from the year's copy.
function naarMeting(meting: MetingRij): MetingMetBusinessUnits {
  const businessUnits: Record<string, BusinessUnitSnapshot> = {};
  for (const rij of meting.businessUnitScores) {
    const scoresPerAs: Record<string, Record<string, number | null>> = {};
    const toelichtingen: Record<string, string> = {};
    for (const vs of rij.vraagScores) {
      (scoresPerAs[vs.metingVraag.asId] ??= {})[vs.vraagId] = vs.score;
      toelichtingen[vs.vraagId] = vs.toelichting;
    }
    businessUnits[rij.businessUnitId] = {
      status: rij.status,
      algemeneToelichting: rij.algemeneToelichting,
      aanwezigen: rij.aanwezigen,
      laatstGewijzigdDoor: rij.laatstGewijzigdDoor,
      laatstGewijzigdOp: rij.laatstGewijzigdOp,
      scoresPerAs,
      toelichtingen,
    };
  }
  return { id: meting.id, jaar: meting.jaar, aangemaakt: meting.aangemaakt, vastgelegd: meting.vastgelegdOp !== null, businessUnits };
}

/**
 * Loads one meting with the status and scores of every business unit that has a row.
 * @param jaar - Measurement year
 * @returns the meting, or null when the year does not exist
 */
export async function getMetingByJaar(jaar: number): Promise<MetingMetBusinessUnits | null> {
  const meting = await prisma.meting.findUnique({ where: { jaar }, include: MET_SCORES });
  return meting ? naarMeting(meting) : null;
}

/**
 * Loads every meting with the rows of its business units, oldest year first.
 * @returns all metingen in ascending year order
 */
export async function listMetingenMetScores(): Promise<MetingMetBusinessUnits[]> {
  const metingen = await prisma.meting.findMany({ orderBy: { jaar: 'asc' }, include: MET_SCORES });
  return metingen.map(naarMeting);
}

/** Input of `bewaarBusinessUnitScore`. */
export interface BusinessUnitOpslag {
  metingId: string;
  jaar: number;
  businessUnitId: string;
  status: string;
  algemeneToelichting: string;
  aanwezigen: string;
  /** Acting user id. */
  laatstGewijzigdDoor: string;
  /** Appended to the audit detail as `;email=<email>` when given. */
  actorEmail?: string;
  vraagScores: Array<{ vraagId: string; score: number | null; toelichting: string }>;
}

/** What the caller's check sees inside the transaction: the frozen list and the current status. */
export interface OpslagContext {
  lijst: Vragenlijst;
  huidigeStatus: string | null;
}

/** Outcome of a save; `te-weinig-vragen` when the year cannot be frozen. */
export type OpslagResultaat<E> = { ok: true } | { ok: false; fout: E | 'te-weinig-vragen' };

class Teruggedraaid<E> extends Error {
  constructor(readonly fout: E) {
    super('Save rolled back by its check');
  }
}

/**
 * Saves one business unit row in one transaction: freezes the year first (see `legVast`), then runs
 * `controle` against the list of that moment and the current status, and only when it passes
 * upserts the row and its question scores and writes the audit row. A failed check rolls back the
 * whole transaction, the freeze included.
 * @param input - Row to save
 * @param controle - Returns an error to refuse the save, or null to continue
 * @returns ok, or the error of the check / `te-weinig-vragen`
 */
export async function bewaarBusinessUnitScore<E>(
  input: BusinessUnitOpslag,
  controle: (context: OpslagContext) => E | null,
): Promise<OpslagResultaat<E>> {
  try {
    await prisma.$transaction(async (tx) => {
      if ((await legVast(tx, input.metingId)) === 'te-weinig-vragen') throw new Teruggedraaid('te-weinig-vragen' as const);
      const lijst = (await leesVragenlijst(input.jaar, tx))!;
      const sleutel = { metingId_businessUnitId: { metingId: input.metingId, businessUnitId: input.businessUnitId } };
      const bestaand = await tx.businessUnitScore.findUnique({ where: sleutel, select: { status: true } });
      const fout = controle({ lijst, huidigeStatus: bestaand?.status ?? null });
      if (fout !== null) throw new Teruggedraaid(fout);
      await schrijfRij(tx, input, lijst);
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof Teruggedraaid) return { ok: false, fout: e.fout as E | 'te-weinig-vragen' };
    throw e;
  }
}

// Upserts the row and its question scores and audits the save.
async function schrijfRij(tx: Prisma.TransactionClient, input: BusinessUnitOpslag, lijst: Vragenlijst): Promise<void> {
  const velden = {
    status: input.status,
    algemeneToelichting: input.algemeneToelichting,
    aanwezigen: input.aanwezigen,
    laatstGewijzigdDoor: input.laatstGewijzigdDoor,
  };
  const rij = await tx.businessUnitScore.upsert({
    where: { metingId_businessUnitId: { metingId: input.metingId, businessUnitId: input.businessUnitId } },
    create: { metingId: input.metingId, businessUnitId: input.businessUnitId, ...velden },
    update: { ...velden, laatstGewijzigdOp: new Date() },
  });
  for (const vs of input.vraagScores) {
    await tx.vraagScore.upsert({
      where: { businessUnitScoreId_vraagId: { businessUnitScoreId: rij.id, vraagId: vs.vraagId } },
      create: { businessUnitScoreId: rij.id, metingId: input.metingId, vraagId: vs.vraagId, score: vs.score, toelichting: vs.toelichting },
      update: { score: vs.score, toelichting: vs.toelichting },
    });
  }
  const platformId = lijst.businessUnits.find((b) => b.id === input.businessUnitId)?.platformId ?? '';
  await schrijfAudit(
    {
      actor: input.laatstGewijzigdDoor,
      actie: input.status === 'definitief' ? 'platform_afgerond' : 'platform_opgeslagen_concept',
      doelType: 'platform_score',
      doelId: rij.id,
      detail: businessUnitDetail(platformId, input.businessUnitId, input.jaar) + (input.actorEmail ? `;email=${input.actorEmail}` : ''),
    },
    tx,
  );
}

/**
 * Reopens a finalised business unit row: status back to `concept`, audited in the same transaction.
 * @param input - Meting id, business unit id and the acting administrator
 * @returns `heropend`, `niet-definitief` when the row is not final, or `niet-gevonden` when absent
 */
export async function heropenBusinessUnit(input: {
  metingId: string;
  businessUnitId: string;
  actor: string;
}): Promise<'heropend' | 'niet-definitief' | 'niet-gevonden'> {
  return prisma.$transaction(async (tx) => {
    const rij = await tx.businessUnitScore.findUnique({
      where: { metingId_businessUnitId: { metingId: input.metingId, businessUnitId: input.businessUnitId } },
      include: { meting: { select: { jaar: true } }, metingBusinessUnit: { select: { platformId: true } } },
    });
    if (!rij) return 'niet-gevonden';
    if (rij.status !== 'definitief') return 'niet-definitief';

    await tx.businessUnitScore.update({
      where: { id: rij.id },
      data: { status: 'concept', laatstGewijzigdDoor: input.actor, laatstGewijzigdOp: new Date() },
    });
    await schrijfAudit(
      {
        actor: input.actor,
        actie: 'platform_heropend',
        doelType: 'platform_score',
        doelId: rij.id,
        detail: businessUnitDetail(rij.metingBusinessUnit.platformId, input.businessUnitId, rij.meting.jaar),
      },
      tx,
    );
    return 'heropend';
  });
}
