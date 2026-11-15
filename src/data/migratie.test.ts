import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';

import { STANDAARD } from '@/tests/support/vragenlijst-testdata';

import { prisma } from './prismaClient';

// Replays the migrations on a scratch database: the old schema with production-shaped data, then
// the migration `beheerbare_vragenlijst`, and compares what the data means before and after.

const MAP = join(process.cwd(), 'prisma', 'migrations');
const MIGRATIES = readdirSync(MAP).filter((m) => /^\d{14}_/.test(m)).sort();
const NIEUW = MIGRATIES.findIndex((m) => m.endsWith('_beheerbare_vragenlijst'));
const DB = 'gvprlg_test_migratie';
const open: PrismaClient[] = [];

async function verseDatabase(): Promise<PrismaClient> {
  await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
  await prisma.$executeRawUnsafe(`CREATE DATABASE ${DB}`);
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = `/${DB}`;
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });
  open.push(client);
  return client;
}

async function voerUit(client: PrismaClient, migraties: string[]): Promise<void> {
  for (const m of migraties) await client.$executeRawUnsafe(readFileSync(join(MAP, m, 'migration.sql'), 'utf8'));
}

// Old schema: 2024 and 2025 with rows (some unanswered, a concept, comments), 2026-2028 empty (seeded by a migration).
async function vulOudeData(client: PrismaClient, vraagId = (i: number) => vraagIds[i]!, platformId = (p: string) => p): Promise<void> {
  await client.$executeRawUnsafe(`INSERT INTO metingen (id, jaar) VALUES ('m24', 2024), ('m25', 2025)`);
  let n = 0;
  for (const [metingId, basis] of [['m24', 1], ['m25', 2]] as const) {
    for (const [p, unit] of STANDAARD.businessUnits.entries()) {
      const rij = `${metingId}-${unit.id}`;
      const status = p === 4 && metingId === 'm25' ? 'concept' : 'definitief';
      await client.$executeRawUnsafe(
        `INSERT INTO platform_scores (id, "metingId", "platformId", status, "algemeneToelichting", "laatstGewijzigdDoor") VALUES ($1, $2, $3, $4, $5, 'seed')`,
        rij, metingId, platformId(unit.id), status, `Toelichting ${rij}`,
      );
      for (let i = 0; i < vraagIds.length; i += 1) {
        const score = status === 'concept' && i % 3 === 0 ? null : ((basis + p + i) % 5) + 1;
        n += 1;
        await client.$executeRawUnsafe(
          `INSERT INTO vraag_scores (id, "platformScoreId", "vraagId", score, toelichting) VALUES ($1, $2, $3, $4, $5)`,
          `vs${n}`, rij, vraagId(i), score, i === 0 ? 'Onderbouwing' : '',
        );
      }
    }
  }
}

const vraagIds = STANDAARD.assen.flatMap((a) => a.vragen.map((v) => v.id));
const asVan = new Map(STANDAARD.assen.flatMap((a) => a.vragen.map((v) => [v.id, a.id] as const)));

type Rij = { jaar: number; unit: string; vraagId: string; score: number | null };

// Per year and unit: the mean per axis and the total (mean of all answered questions), the start-screen rule.
function gemiddelden(rijen: Rij[], asVanVraag: (r: Rij) => string): Record<string, number> {
  const groepen = new Map<string, number[]>();
  for (const r of rijen) {
    if (r.score === null) continue;
    for (const sleutel of [`${r.jaar}/${r.unit}/${asVanVraag(r)}`, `${r.jaar}/${r.unit}/totaal`]) {
      groepen.set(sleutel, [...(groepen.get(sleutel) ?? []), r.score]);
    }
  }
  return Object.fromEntries([...groepen].map(([k, w]) => [k, w.reduce((s, v) => s + v, 0) / w.length]));
}

afterAll(async () => {
  for (const c of open) await c.$disconnect();
  await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
});

describe('migration beheerbare_vragenlijst', () => {
  it('should keep every per-axis and total average per business unit and freeze only the years with rows', async () => {
    const db = await verseDatabase();
    await voerUit(db, MIGRATIES.slice(0, NIEUW));
    await vulOudeData(db);
    const voor = await db.$queryRawUnsafe<Rij[]>(
      `SELECT m.jaar, p."platformId" AS unit, v."vraagId", v.score FROM vraag_scores v JOIN platform_scores p ON p.id = v."platformScoreId" JOIN metingen m ON m.id = p."metingId"`,
    );
    await voerUit(db, MIGRATIES.slice(NIEUW));

    const na = await db.$queryRawUnsafe<Array<Rij & { asId: string }>>(
      `SELECT m.jaar, b."businessUnitId" AS unit, v."vraagId", v.score, mv."asId" FROM vraag_scores v
         JOIN business_unit_scores b ON b.id = v."businessUnitScoreId" JOIN metingen m ON m.id = b."metingId"
         JOIN meting_vragen mv ON mv."metingId" = v."metingId" AND mv."vraagId" = v."vraagId"`,
    );
    expect(na).toHaveLength(voor.length);
    expect(gemiddelden(na, (r) => (r as Rij & { asId: string }).asId)).toEqual(gemiddelden(voor, (r) => asVan.get(r.vraagId)!));

    const jaren = await db.$queryRawUnsafe<Array<{ jaar: number; vast: boolean; vragen: bigint }>>(
      `SELECT m.jaar, m."vastgelegdOp" IS NOT NULL AS vast, (SELECT COUNT(*) FROM meting_vragen mv WHERE mv."metingId" = m.id) AS vragen FROM metingen m ORDER BY m.jaar`,
    );
    expect(jaren.map((j) => [j.jaar, j.vast, Number(j.vragen)])).toEqual([
      [2024, true, 16], [2025, true, 16], [2026, false, 0], [2027, false, 0], [2028, false, 0],
    ]);
    const behouden = await db.$queryRawUnsafe<Array<{ toel: bigint; alg: bigint; aanw: bigint }>>(
      `SELECT (SELECT COUNT(*) FROM vraag_scores WHERE toelichting = 'Onderbouwing') AS toel,
              (SELECT COUNT(*) FROM business_unit_scores WHERE "algemeneToelichting" LIKE 'Toelichting %') AS alg,
              (SELECT COUNT(*) FROM business_unit_scores WHERE aanwezigen = '') AS aanw`,
    );
    expect(behouden[0]).toEqual({ toel: 10n, alg: 10n, aanw: 10n });
  });

  it('should abort with an error naming the id when a score row has an unknown question id', async () => {
    const db = await verseDatabase();
    await voerUit(db, MIGRATIES.slice(0, NIEUW));
    await vulOudeData(db, (i) => (i === 3 ? 'verdwenen-vraag' : vraagIds[i]!));
    await expect(voerUit(db, MIGRATIES.slice(NIEUW))).rejects.toThrow(/unknown question id "verdwenen-vraag"/);
    const tabellen = await db.$queryRawUnsafe<Array<{ n: bigint }>>(`SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_name = 'assen'`);
    expect(Number(tabellen[0]!.n)).toBe(0);
  });

  it('should abort with an error naming the id when a score row has an unknown platform id', async () => {
    const db = await verseDatabase();
    await voerUit(db, MIGRATIES.slice(0, NIEUW));
    await vulOudeData(db, undefined, (p) => (p === 'ro' ? 'oud-platform' : p));
    await expect(voerUit(db, MIGRATIES.slice(NIEUW))).rejects.toThrow(/unknown platform id "oud-platform"/);
  });

  it('should abort with an error naming the id when a filler link has an unknown platform id', async () => {
    const db = await verseDatabase();
    await voerUit(db, MIGRATIES.slice(0, NIEUW));
    await vulOudeData(db);
    await db.$executeRawUnsafe(`INSERT INTO platform_invullers (id, "metingId", "platformId", gebruiker) VALUES ('pi1', 'm25', 'weg-platform', 'g1')`);
    await expect(voerUit(db, MIGRATIES.slice(NIEUW))).rejects.toThrow(/platform_invullers has a row with unknown platform id "weg-platform"/);
  });

  it('should roll back completely when a statement fails after the first schema changes', async () => {
    const db = await verseDatabase();
    await voerUit(db, MIGRATIES.slice(0, NIEUW));
    await vulOudeData(db);
    // A table in the way makes CREATE TABLE meting_assen fail after the catalogue tables, their rows
    // and the vastgelegdOp column were already created in the same script.
    await db.$executeRawUnsafe('CREATE TABLE meting_assen (x int)');
    await expect(voerUit(db, MIGRATIES.slice(NIEUW))).rejects.toThrow(/meting_assen/);
    const staat = await db.$queryRawUnsafe<Array<{ oud: string | null; nieuw: string | null; kolom: bigint; rijen: bigint }>>(
      `SELECT to_regclass('platform_scores')::text AS oud, to_regclass('assen')::text AS nieuw,
              (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'metingen' AND column_name = 'vastgelegdOp') AS kolom,
              (SELECT COUNT(*) FROM platform_scores) AS rijen`,
    );
    expect(staat[0]).toEqual({ oud: 'platform_scores', nieuw: null, kolom: 0n, rijen: 10n });
  });
});
