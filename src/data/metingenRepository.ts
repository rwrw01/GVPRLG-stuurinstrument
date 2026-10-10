import { prisma } from './prismaClient';
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
  return prisma.meting.findMany({ orderBy: { jaar: 'desc' } });
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

export async function getMetingByJaar(jaar: number): Promise<MetingWithPlatformen | null> {
  const meting = await prisma.meting.findUnique({
    where: { jaar },
    include: { platformen: { include: { vraagScores: true } } },
  });
  if (!meting) return null;

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

export async function savePlatformScore(input: {
  metingId: string;
  platformId: string;
  status: string;
  algemeneToelichting: string;
  laatstGewijzigdDoor: string;
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

    await tx.auditLogEntry.create({
      data: {
        actor: input.laatstGewijzigdDoor,
        actie: input.status === 'definitief' ? 'platform_afgerond' : 'platform_opgeslagen_concept',
        doelType: 'platform_score',
        doelId: platformScore.id,
        detail: `platform=${input.platformId}`,
      },
    });
  });
}
