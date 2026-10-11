// Fills measurement year 2026 with example scores via the public API, for demos and manual testing.
// Never run against production data: definitief platforms cannot be edited afterwards.
// Usage: node scripts/seed-voorbeeldwaardes-2026.mjs [baseUrl]   (default http://127.0.0.1:3000)

const BASE_URL = process.argv[2] ?? process.env.GVPRLG_BASE_URL ?? 'http://127.0.0.1:3000';
const JAAR = 2026;

const VRAGEN = [
  'common-ground-standaarden', 'cloud-data', 'ai-integratie', 'digitale-weerbaarheid',
  'capaciteit-kennis', 'digitaal-vakmanschap', 'klantbetrokkenheid', 'opleiding-continuiteit',
  'dienstverlening-nps', 'release-incident', 'roadmap-transparantie', 'burgers-ondernemers-centraal',
  'prijsbeleid', 'lifecyclemanagement', 'partner-productontwikkeling', 'partner-dienstverlening',
];

// Scores follow the VRAGEN order: 4 techniek, 4 mens, 8 proces.
const VOORBEELDEN = [
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

function toelichtingVoor(score) {
  if (score == null) return '';
  if (score <= 2) return 'Voorbeeld: duidelijke verbeterruimte, zie verbeteragenda.';
  if (score >= 4) return 'Voorbeeld: aantoonbaar op orde, onderbouwd met documentatie.';
  return '';
}

async function seedPlatform({ platformId, status, scores, toelichting }) {
  const body = {
    status,
    algemeneToelichting: toelichting,
    vraagScores: VRAGEN.map((vraagId, i) => ({ vraagId, score: scores[i], toelichting: toelichtingVoor(scores[i]) })),
  };
  const response = await fetch(`${BASE_URL}/api/metingen/${JAAR}/platformen/${platformId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (response.status === 409) {
    console.log(`${platformId}: already definitief, skipped`);
    return true;
  }
  if (!response.ok) {
    console.error(`${platformId}: HTTP ${response.status} ${await response.text()}`);
    return false;
  }
  console.log(`${platformId}: saved as ${status}`);
  return true;
}

let allOk = true;
for (const voorbeeld of VOORBEELDEN) {
  allOk = (await seedPlatform(voorbeeld)) && allOk;
}
process.exit(allOk ? 0 : 1);
