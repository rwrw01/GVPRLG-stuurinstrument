// Fills measurement year 2026 with example scores directly in the database, for demos and manual testing.
// Refuses to run with NODE_ENV=production. Platforms that are already definitief are reported and skipped.
// Usage: npx tsx --env-file=.env scripts/seed-voorbeeldwaardes-2026.ts   (or: npm run seed:voorbeeld)

import { getMetingByJaar, savePlatformScore } from '../src/data/metingenRepository';
import { prisma } from '../src/data/prismaClient';

const JAAR = 2026;
const SEED_ACTOR = 'seed-voorbeelddata';

const VRAGEN = [
  'common-ground-standaarden', 'cloud-data', 'ai-integratie', 'digitale-weerbaarheid',
  'capaciteit-kennis', 'digitaal-vakmanschap', 'klantbetrokkenheid', 'opleiding-continuiteit',
  'dienstverlening-nps', 'release-incident', 'roadmap-transparantie', 'burgers-ondernemers-centraal',
  'prijsbeleid', 'lifecyclemanagement', 'partner-productontwikkeling', 'partner-dienstverlening',
];

interface Voorbeeld {
  platformId: string;
  status: 'concept' | 'definitief';
  scores: Array<number | null>;
  toelichting: string;
}

type SeedResult = 'saved' | 'skipped';

// Scores follow the VRAGEN order: 4 techniek, 4 mens, 8 proces.
const VOORBEELDEN: Voorbeeld[] = [
  {
    platformId: 'belastingen', status: 'definitief',
    scores: [3, 4, 2, 4, 3, 3, 4, 3, 3, 4, 3, 3, 2, 3, 3, 4],
    toelichting: 'Voorbeeld: stabiel platform, prijsbeleid blijft een aandachtspunt.',
  },
  {
    platformId: 'ro', status: 'definitief',
    scores: [2, 3, 1, 3, 2, 2, 3, 2, 2, 3, 2, 3, 2, 2, 2, 3],
    toelichting: 'Voorbeeld: Omgevingswet-keten nog in ontwikkeling, AI nauwelijks zichtbaar.',
  },
  {
    platformId: 'burgerzaken', status: 'definitief',
    scores: [4, 4, 3, 5, 4, 4, 4, 4, 4, 5, 4, 4, 3, 4, 4, 4],
    toelichting: 'Voorbeeld: volwassen product met voorspelbare releases.',
  },
  {
    platformId: 'sociaal-domein', status: 'definitief',
    scores: [3, 3, 2, 3, 2, 3, 3, 2, 3, 2, 3, 4, 2, 3, 3, 3],
    toelichting: 'Voorbeeld: capaciteit en kennisborging onder druk.',
  },
  {
    platformId: 'informatievoorziening', status: 'concept',
    scores: [3, 2, 2, 3, 3, null, null, 3, 3, 3, null, 3, 2, null, 3, null],
    toelichting: 'Voorbeeld: concept, nog niet alle vragen beantwoord.',
  },
];

/**
 * Returns the example explanation that belongs to a score.
 * @param score - Score 1-5 or null when unanswered
 * @returns Explanation text, empty for middle scores and unanswered questions
 */
function toelichtingVoor(score: number | null): string {
  if (score === null) return '';
  if (score <= 2) return 'Voorbeeld: duidelijke verbeterruimte, zie verbeteragenda.';
  if (score >= 4) return 'Voorbeeld: aantoonbaar op orde, onderbouwd met documentatie.';
  return '';
}

/**
 * Saves one example platform unless it is already definitief.
 * @param metingId - Id of the 2026 meting
 * @param bestaandeStatus - Current status of the platform in the database, undefined when absent
 * @param voorbeeld - Example data to write
 * @returns `skipped` when the platform is already definitief, otherwise `saved`
 */
async function seedPlatform(
  metingId: string,
  bestaandeStatus: string | undefined,
  voorbeeld: Voorbeeld,
): Promise<SeedResult> {
  if (bestaandeStatus === 'definitief') {
    console.log(`${voorbeeld.platformId}: already definitief, skipped`);
    return 'skipped';
  }
  await savePlatformScore({
    metingId,
    jaar: JAAR,
    platformId: voorbeeld.platformId,
    status: voorbeeld.status,
    algemeneToelichting: voorbeeld.toelichting,
    laatstGewijzigdDoor: SEED_ACTOR,
    vraagScores: VRAGEN.map((vraagId, i) => {
      const score = voorbeeld.scores[i] ?? null;
      return { vraagId, score, toelichting: toelichtingVoor(score) };
    }),
  });
  console.log(`${voorbeeld.platformId}: saved as ${voorbeeld.status}`);
  return 'saved';
}

/**
 * Seeds all example platforms for 2026.
 * @returns Process exit code: 0 on success, 1 when the meting is missing or a write failed
 */
async function main(): Promise<number> {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to seed example data: NODE_ENV=production.');
    return 1;
  }
  const meting = await getMetingByJaar(JAAR);
  if (!meting) {
    console.error(`No meting for ${JAAR}; run the migrations first (npm run prisma:migrate).`);
    return 1;
  }
  let failures = 0;
  for (const voorbeeld of VOORBEELDEN) {
    try {
      await seedPlatform(meting.id, meting.platformen[voorbeeld.platformId]?.status, voorbeeld);
    } catch (error: unknown) {
      failures += 1;
      console.error(`${voorbeeld.platformId}: failed to save`, error);
    }
  }
  return failures === 0 ? 0 : 1;
}

const exitCode = await main();
await prisma.$disconnect();
process.exit(exitCode);
