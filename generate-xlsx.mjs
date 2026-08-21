import XLSX from 'xlsx';
import { CONFIG } from './js/config.js';

const wb = XLSX.utils.book_new();

// === Sheet 1: Scorelijst per platform ===
// Header row per platform met kolommen: As, Vraag-ID, Vraagtekst, NDS-thema, Score (1-5), Toelichting
const scoreRows = [];

for (const platform of CONFIG.platformen) {
  // Platform header
  scoreRows.push({
    'Platform': platform.naam,
    'As': '',
    'Vraag-ID': '',
    'Vraag': '',
    'NDS-thema': '',
    'Score (1-5)': '',
    'Toelichting': '',
  });

  for (const as of CONFIG.assen) {
    for (const vraag of as.vragen) {
      scoreRows.push({
        'Platform': platform.naam,
        'As': as.naam,
        'Vraag-ID': vraag.id,
        'Vraag': vraag.tekst,
        'NDS-thema': vraag.nds || '',
        'Score (1-5)': '',
        'Toelichting': '',
      });
    }
  }
}

const wsScore = XLSX.utils.json_to_sheet(scoreRows);

// Kolombreedte instellen
wsScore['!cols'] = [
  { wch: 22 },  // Platform
  { wch: 12 },  // As
  { wch: 28 },  // Vraag-ID
  { wch: 80 },  // Vraag
  { wch: 35 },  // NDS-thema
  { wch: 12 },  // Score
  { wch: 40 },  // Toelichting
];

XLSX.utils.book_append_sheet(wb, wsScore, 'Scorelijst');

// === Sheet 2: Scoreschaal (referentie) ===
const schaalRows = CONFIG.schaal.map(s => ({
  'Score': s.waarde,
  'Label': s.label,
  'Beschrijving': s.beschrijving,
}));
const wsSchaal = XLSX.utils.json_to_sheet(schaalRows);
wsSchaal['!cols'] = [
  { wch: 8 },
  { wch: 16 },
  { wch: 50 },
];
XLSX.utils.book_append_sheet(wb, wsSchaal, 'Scoreschaal');

// === Sheet 3: NDS-themas (referentie) ===
const ndsRows = CONFIG.ndsThemas.map(t => ({
  'NDS-thema': t.id,
  'Kleur': t.kleur,
}));
const wsNds = XLSX.utils.json_to_sheet(ndsRows);
wsNds['!cols'] = [
  { wch: 40 },
  { wch: 12 },
];
XLSX.utils.book_append_sheet(wb, wsNds, 'NDS-themas');

// === Sheet 4: Platformen (referentie) ===
const platRows = CONFIG.platformen.map(p => ({
  'Platform-ID': p.id,
  'Naam': p.naam,
}));
const wsPlat = XLSX.utils.json_to_sheet(platRows);
wsPlat['!cols'] = [
  { wch: 25 },
  { wch: 25 },
];
XLSX.utils.book_append_sheet(wb, wsPlat, 'Platformen');

// === Schrijf bestand ===
const filename = 'GVPRLG-Volwassenheidsmeting-v2.xlsx';
XLSX.writeFile(wb, filename);
console.log(`XLSX gegenereerd: ${filename}`);
