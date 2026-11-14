import { prisma } from './prismaClient';
import { platformDetail, schrijfAudit } from './auditRepository';
import { CONFIG } from '../service/config';

export interface PlatformSnapshot {
  status: string;
  algemeneToelichting: string;
  laatstGewijzigdDoor: string;
  laatstGewijzigdOp: Date;
  scoresPerAs: Record<string, Record<string, number | null>>;
  toelichtingen: Record<string, string>;
}

export interface MetingWithPlatformen {
  id: string;
  jaar: number;
  aangemaakt: Date;
  platformen: Record<string, PlatformSnapshot>;
}

export async function listMetingen() {
  return prisma.meting.findMany({ orderBy: { jaar: 'asc' } });
}

export async function createMeting(jaar: number) {
  return prisma.meting.create({ data: { jaar } });
}

function vraagToAsId(vraagId: string): string | undefined {
  for (const as of CONFIG.assen) {
    if (as.vragen.some((v) => v.id === vraagId)) return as.id;
  }
  return undefined;
}

type MetingRij = NonNullable<Awaited<ReturnType<typeof vindMetingMetScores>>>;

function vindMetingMetScores(jaar: number) {
  return prisma.meting.findUnique({
    where: { jaar },
    include: { platformen: { include: { vraagScores: true } } },
  });
}

// Maps one meting row with its platform and question scores to the snapshot shape.
function naarMetingMetPlatformen(meting: MetingRij): MetingWithPlatformen {
  const platformen: Record<string, PlatformSnapshot> = {};
  for (const p of meting.platformen) {
    const scoresPerAs: Record<string, Record<string, number | null>> = {};
    const toelichtingen: Record<string, string> = {};
    for (const as of CONFIG.assen) scoresPerAs[as.id] = {};
    for (const vs of p.vraagScores) {
      const asId = vraagToAsId(vs.vraagId);
      if (asId) scoresPerAs[asId]![vs.vraagId] = vs.score;
      toelichtingen[vs.vraagId] = vs.toelichting;
    }
    platformen[p.platformId] = {
      status: p.status,
      algemeneToelichting: p.algemeneToelichting,
      laatstGewijzigdDoor: p.laatstGewijzigdDoor,
      laatstGewijzigdOp: p.laatstGewijzigdOp,
      scoresPerAs,
      toelichtingen,
    };
  }
  return { id: meting.id, jaar: meting.jaar, aangemaakt: meting.aangemaakt, platformen };
}

/**
 * Loads one meting with the status and scores of every platform that has a row.
 * @param jaar - Measurement year
 * @returns the meting, or null when the year does not exist
 */
export async function getMetingByJaar(jaar: number): Promise<MetingWithPlatformen | null> {
  const meting = await vindMetingMetScores(jaar);
  return meting ? naarMetingMetPlatformen(meting) : null;
}

/**
 * Loads every meting with the status and scores of its platforms, oldest year first.
 * @returns all metingen in ascending year order
 */
export async function listMetingenMetScores(): Promise<MetingWithPlatformen[]> {
  const metingen = await prisma.meting.findMany({
    orderBy: { jaar: 'asc' },
    include: { platformen: { include: { vraagScores: true } } },
  });
  return metingen.map(naarMetingMetPlatformen);
}

/**
 * Upserts a platform score with its question scores and writes the audit row in one transaction.
 * @param input - Score data; `laatstGewijzigdDoor` is the acting user id, `actorEmail` (optional)
 *   is appended to the audit detail as `;email=<email>`
 * @returns Promise that resolves once committed
 */
export async function savePlatformScore(input: {
  metingId: string;
  jaar: number;
  platformId: string;
  status: string;
  algemeneToelichting: string;
  laatstGewijzigdDoor: string;
  actorEmail?: string;
  vraagScores: Array<{ vraagId: string; score: number | null; toelichting: string }>;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const platformScore = await tx.platformScore.upsert({
      where: { metingId_platformId: { metingId: input.metingId, platformId: input.platformId } },
      create: {
        metingId: input.metingId,
        platformId: input.platformId,
        status: input.status,
        algemeneToelichting: input.algemeneToelichting,
        laatstGewijzigdDoor: input.laatstGewijzigdDoor,
      },
      update: {
        status: input.status,
        algemeneToelichting: input.algemeneToelichting,
        laatstGewijzigdDoor: input.laatstGewijzigdDoor,
        laatstGewijzigdOp: new Date(),
      },
    });

    for (const vs of input.vraagScores) {
      await tx.vraagScore.upsert({
        where: { platformScoreId_vraagId: { platformScoreId: platformScore.id, vraagId: vs.vraagId } },
        create: { platformScoreId: platformScore.id, vraagId: vs.vraagId, score: vs.score, toelichting: vs.toelichting },
        update: { score: vs.score, toelichting: vs.toelichting },
      });
    }

    await schrijfAudit(
      {
        actor: input.laatstGewijzigdDoor,
        actie: input.status === 'definitief' ? 'platform_afgerond' : 'platform_opgeslagen_concept',
        doelType: 'platform_score',
        doelId: platformScore.id,
        detail: platformDetail(input.platformId, input.jaar) + (input.actorEmail ? `;email=${input.actorEmail}` : ''),
      },
      tx,
    );
  });
}

/**
 * Reopens a finalised platform score: status back to `concept`, audited in the same transaction.
 * @param input - Meting id, platform id and the acting administrator
 * @returns `heropend`, `niet-definitief` when the score is not final, or `niet-gevonden` when absent
 */
export async function heropenPlatform(input: {
  metingId: string;
  platformId: string;
  actor: string;
}): Promise<'heropend' | 'niet-definitief' | 'niet-gevonden'> {
  return prisma.$transaction(async (tx) => {
    const score = await tx.platformScore.findUnique({
      where: { metingId_platformId: { metingId: input.metingId, platformId: input.platformId } },
      include: { meting: { select: { jaar: true } } },
    });
    if (!score) return 'niet-gevonden';
    if (score.status !== 'definitief') return 'niet-definitief';

    await tx.platformScore.update({
      where: { id: score.id },
      data: { status: 'concept', laatstGewijzigdDoor: input.actor, laatstGewijzigdOp: new Date() },
    });
    await schrijfAudit(
      {
        actor: input.actor,
        actie: 'platform_heropend',
        doelType: 'platform_score',
        doelId: score.id,
        detail: platformDetail(input.platformId, score.meting.jaar),
      },
      tx,
    );
    return 'heropend';
  });
}
