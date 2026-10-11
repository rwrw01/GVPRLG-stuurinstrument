import { config as loadEnv } from 'dotenv';

/**
 * Empties the test database once before the whole suite runs.
 * Migrations seed the measurement years 2026-2028, so the database is not empty after
 * `prisma migrate deploy`. Runs outside per-file module mocks; per-file afterEach hooks
 * keep the database empty between tests.
 * @returns Promise that resolves once the tables are empty
 */
export async function setup(): Promise<void> {
  loadEnv({ path: '.env.test', override: true, quiet: true });
  if (!process.env.DATABASE_URL?.includes('_test')) {
    throw new Error('DATABASE_URL does not point to a test database (expected "_test" in the name).');
  }
  const { prisma } = await import('./src/data/prismaClient');
  await prisma.vraagScore.deleteMany();
  await prisma.platformScore.deleteMany();
  await prisma.platformInvuller.deleteMany();
  await prisma.auditLogEntry.deleteMany();
  await prisma.meting.deleteMany();
  await prisma.$disconnect();
}
