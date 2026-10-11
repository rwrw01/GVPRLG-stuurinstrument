import { config as loadEnv } from 'dotenv';

/** Years 2030-2099 are reserved for E2E runs; real and seeded measurements stay below 2030. */
const E2E_JAAR_VAN = 2030;
const E2E_JAAR_TOT = 2099;

/**
 * Removes the measurement years left behind by earlier E2E runs from the dev database,
 * so randomly chosen test years never collide (409) with a previous run.
 * @returns Promise that resolves once the reserved years are gone
 */
export default async function globalSetup(): Promise<void> {
  loadEnv({ path: '.env', quiet: true });
  const { prisma } = await import('../src/data/prismaClient');
  const { count } = await prisma.meting.deleteMany({ where: { jaar: { gte: E2E_JAAR_VAN, lte: E2E_JAAR_TOT } } });
  console.log(`E2E setup: removed ${count} leftover test measurement(s)`);
  await prisma.$disconnect();
}
