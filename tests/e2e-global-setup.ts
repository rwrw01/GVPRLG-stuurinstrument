import { config as loadEnv } from 'dotenv';

import {
  E2E_JAAR_TOT,
  E2E_JAAR_VAN,
  FASE_B_JAAR,
  GEBRUIKERS,
  OVERZICHT_JAREN,
  PLATFORM_CONCEPT,
  PLATFORM_DEFINITIEF,
  PLATFORM_INVULLER,
  wisJaarClaims,
} from './e2e-data';
import { keycloakId, resetNaarTotpInstellen, zorgVoorGebruikerMetTotp } from './keycloak-admin';

const MAILPIT_URL = process.env.E2E_MAILPIT_URL ?? 'http://127.0.0.1:8025';

type Repos = typeof import('../src/data/gebruikersRepository') & typeof import('../src/data/metingenRepository');
type Prisma = (typeof import('../src/data/prismaClient'))['prisma'];

// Removes the reserved E2E years; platform links have no foreign key, so drop those explicitly.
async function _ruimJarenOp(prisma: Prisma): Promise<void> {
  const where = { jaar: { gte: E2E_JAAR_VAN, lte: E2E_JAAR_TOT } };
  const ids = (await prisma.meting.findMany({ where, select: { id: true } })).map((m) => m.id);
  await prisma.platformInvuller.deleteMany({ where: { metingId: { in: ids } } });
  const { count } = await prisma.meting.deleteMany({ where });
  console.log(`E2E setup: removed ${count} leftover test measurement(s)`);
}

// Ensures an active app user with the given role, bound to its current Keycloak subject.
async function _zorgVoorActief(repos: Repos, gebruiker: { email: string; naam: string }, rol: 'beheerder' | 'invuller' | 'lezer'): Promise<string> {
  const bestaand = await repos.vindGebruikerOpEmail(gebruiker.email);
  const record = bestaand ?? (await repos.maakGebruiker({ email: gebruiker.email, naam: gebruiker.naam, rol }));
  await repos.wijzigGebruiker(record.id, { rol, status: 'actief' });
  // A re-imported realm gets new user ids; rebinding avoids a "sub-conflict" refusal.
  await repos.bindKeycloakSub(record.id, await keycloakId(gebruiker.email));
  return record.id;
}

async function _verwijderAppGebruiker(prisma: Prisma, email: string): Promise<void> {
  const rij = await prisma.gebruiker.findUnique({ where: { email } });
  if (!rij) return;
  await prisma.platformInvuller.deleteMany({ where: { gebruiker: rij.id } });
  await prisma.gebruiker.delete({ where: { id: rij.id } });
}

function _vraagScores(score: number): Array<{ vraagId: string; score: number; toelichting: string }> {
  const vraagIds = [
    'common-ground-standaarden', 'cloud-data', 'ai-integratie', 'digitale-weerbaarheid',
    'capaciteit-kennis', 'digitaal-vakmanschap', 'klantbetrokkenheid', 'opleiding-continuiteit',
    'dienstverlening-nps', 'release-incident', 'roadmap-transparantie', 'burgers-ondernemers-centraal',
    'prijsbeleid', 'lifecyclemanagement', 'partner-productontwikkeling', 'partner-dienstverlening',
  ];
  return vraagIds.map((vraagId) => ({ vraagId, score, toelichting: '' }));
}

// The fase-B year: invuller linked to one platform, one concept and one definitief platform by the
// beheerder, and the app-only "wordt lezer" user as invuller of the same platform.
async function _maakFaseBJaar(repos: Repos, beheerderId: string, invullerId: string): Promise<void> {
  const meting = await repos.createMeting(FASE_B_JAAR);
  await repos.zetKoppelingen(invullerId, meting.id, [PLATFORM_INVULLER]);
  const wordtLezer = await repos.maakGebruiker({ ...GEBRUIKERS.wordtLezer, rol: 'invuller' });
  await repos.zetKoppelingen(wordtLezer.id, meting.id, [PLATFORM_INVULLER]);
  const basis = { metingId: meting.id, jaar: FASE_B_JAAR, algemeneToelichting: '', laatstGewijzigdDoor: beheerderId };
  await repos.savePlatformScore({ ...basis, platformId: PLATFORM_CONCEPT, status: 'concept', vraagScores: _vraagScores(2) });
  await repos.savePlatformScore({ ...basis, platformId: PLATFORM_DEFINITIEF, status: 'definitief', vraagScores: _vraagScores(4) });
}

// Two consecutive years for the start screen: belastingen 3 -> 4 (definitief), R&O 3 -> 2 (concept in the second year).
async function _maakOverzichtJaren(repos: Repos, beheerderId: string): Promise<void> {
  const [eerste, tweede] = OVERZICHT_JAREN;
  const scores: Array<[number, string, 'concept' | 'definitief', number]> = [
    [eerste, 'belastingen', 'definitief', 3], [eerste, 'ro', 'definitief', 3],
    [tweede, 'belastingen', 'definitief', 4], [tweede, 'ro', 'concept', 2],
  ];
  const metingen = new Map<number, string>();
  for (const jaar of OVERZICHT_JAREN) metingen.set(jaar, (await repos.createMeting(jaar)).id);
  for (const [jaar, platformId, status, score] of scores) {
    await repos.savePlatformScore({
      metingId: metingen.get(jaar)!, jaar, platformId, status, algemeneToelichting: '', laatstGewijzigdDoor: beheerderId, vraagScores: _vraagScores(score),
    });
  }
}

async function _leegMailpit(): Promise<void> {
  const query = new URLSearchParams({ query: `to:${GEBRUIKERS.nieuweVoorzitter.email}` });
  const response = await fetch(`${MAILPIT_URL}/api/v1/search?${query.toString()}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Mailpit cleanup failed: ${response.status}`);
}

/**
 * Resets everything the E2E suite depends on in the dev stack (app DB, dev Keycloak, Mailpit):
 * removes leftover test years, ensures the beheerder, invuller and lezer users, creates the fase-B year,
 * and puts invuller2 and geen-app back in their "not yet in the app" state.
 * @returns Promise that resolves once the dev stack is ready for a run
 */
export default async function globalSetup(): Promise<void> {
  loadEnv({ path: '.env', quiet: true });
  const { prisma } = await import('../src/data/prismaClient');
  const repos: Repos = {
    ...(await import('../src/data/gebruikersRepository')),
    ...(await import('../src/data/metingenRepository')),
  };
  try {
    wisJaarClaims();
    await _ruimJarenOp(prisma);
    const beheerderId = await _zorgVoorActief(repos, GEBRUIKERS.beheerder, 'beheerder');
    const invullerId = await _zorgVoorActief(repos, GEBRUIKERS.invuller, 'invuller');
    const lezerId = await _zorgVoorActief(repos, GEBRUIKERS.lezer, 'lezer');
    await prisma.platformInvuller.deleteMany({ where: { gebruiker: lezerId } });
    await _verwijderAppGebruiker(prisma, GEBRUIKERS.wordtLezer.email);
    await _maakFaseBJaar(repos, beheerderId, invullerId);
    await _maakOverzichtJaren(repos, beheerderId);

    await _verwijderAppGebruiker(prisma, GEBRUIKERS.nieuweVoorzitter.email);
    await resetNaarTotpInstellen(GEBRUIKERS.nieuweVoorzitter.email);
    await _verwijderAppGebruiker(prisma, GEBRUIKERS.zonderAppGebruiker.email);
    await zorgVoorGebruikerMetTotp(GEBRUIKERS.zonderAppGebruiker.email, { voornaam: 'Geen', achternaam: 'App' });
    await _leegMailpit();
    console.log(`E2E setup: users reset, metingen ${FASE_B_JAAR} and ${OVERZICHT_JAREN.join(', ')} prepared`);
  } finally {
    await prisma.$disconnect();
  }
}
