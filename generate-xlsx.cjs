const XLSX = require('xlsx');

// === DATA uit config.js ===
const CONFIG = {
  platformen: [
    { id: 'belastingen', naam: 'Belastingen' },
    { id: 'burgerzaken', naam: 'Burgerzaken' },
    { id: 'sociaal-domein', naam: 'Sociaal Domein' },
    { id: 'informatievoorziening', naam: 'Informatievoorziening' },
  ],
  assen: [
    {
      id: 'techniek',
      naam: 'Techniek',
      kleur: '#3786D2',
      vragen: [
        { id: 'common-ground-standaarden', tekst: 'De producten voldoen aan Common Ground-principes en open standaarden (API-first, ZGW-API\'s, iConnect, scheiding data/logica)', nds: 'Open' },
        { id: 'cloud-data', tekst: 'De producten zijn volwaardige SaaS-oplossingen met datagedreven werken: data via API\'s beschikbaar voor analyse en veilig deelbaar over overheidslagen', nds: 'Cloud' },
        { id: 'ai-integratie', tekst: 'AI is concreet en bruikbaar onderdeel van de productportfolio (werkende functionaliteit, niet alleen visie) en hierover zijn risicoanalyses uitgevoerd en een AI-act assessment van beschikbaar', nds: 'AI' },
        { id: 'digitale-weerbaarheid', tekst: 'De producten voldoen aan actuele security-eisen (BIO, NIS2, pentesting) en verminderen leveranciersafhankelijkheid', nds: 'Digitale weerbaarheid en autonomie' },
      ],
    },
    {
      id: 'mens',
      naam: 'Mens',
      kleur: '#15803D',
      vragen: [
        { id: 'capaciteit-kennis', tekst: 'De personele capaciteit (aantal en kennisniveau) is op orde om producten te ondersteunen en door te ontwikkelen en heeft een meerjaars forecast' },
        { id: 'digitaal-vakmanschap', tekst: 'PinkRoccade investeert aantoonbaar in kennisontwikkeling (nieuwe technologieën, AI, Common Ground) en ondersteunt gemeenten hierbij', nds: 'Digitaal vakmanschap' },
        { id: 'klantbetrokkenheid', tekst: 'Gebruikers worden structureel betrokken bij doorontwikkeling (co-creatie, klankbordgroepen, roadmap-invloed) en de betrokkenheid wordt op kwaliteit en kwantiteit periodiek geëvalueerd' },
        { id: 'opleiding-continuiteit', tekst: 'Training, documentatie en support zijn op orde; kennisborging is geborgd en niet afhankelijk van individuen' },
      ],
    },
    {
      id: 'proces',
      naam: 'Proces',
      kleur: '#C2410C',
      vragen: [
        { id: 'dienstverlening-nps', tekst: 'De dienstverlening is uniform tussen businessunits; NPS en klanttevredenheid worden structureel gemeten en vertaald naar verbeteracties en gepubliceerd' },
        { id: 'release-incident', tekst: 'Releases zijn voorspelbaar en goed gecommuniceerd; incidenten worden snel en transparant conform SLA afgehandeld' },
        { id: 'roadmap-transparantie', tekst: 'De productroadmap is transparant, realistisch en sluit aan bij NDS-prioriteiten en gemeentelijke behoeften' },
        { id: 'burgers-ondernemers-centraal', tekst: 'De producten stellen gemeenten in staat burgers en ondernemers als één overheid te bedienen met geïntegreerde digitale dienstverlening', nds: 'Burgers en ondernemers centraal' },
        { id: 'prijsbeleid', tekst: 'Prijsbeleid (inclusief offertes) is uitlegbaar en marktconform en hanteert een voorspelbaar proces' },
        { id: 'lifecyclemanagement', tekst: 'Lifecyclemanagement volgt de afspraken van de uitvloeiingsregeling' },
      ],
    },
  ],
  ndsThemas: [
    { id: 'Open', kleur: '#6366F1' },
    { id: 'Cloud', kleur: '#3786D2' },
    { id: 'AI', kleur: '#E2007A' },
    { id: 'Burgers en ondernemers centraal', kleur: '#15803D' },
    { id: 'Digitale weerbaarheid en autonomie', kleur: '#000041' },
    { id: 'Digitaal vakmanschap', kleur: '#C2410C' },
  ],
  schaal: [
    { waarde: 1, label: 'Afwezig', beschrijving: 'Er is niets van zichtbaar' },
    { waarde: 2, label: 'Initieel', beschrijving: 'Ad hoc, niet structureel' },
    { waarde: 3, label: 'Herhaalbaar', beschrijving: 'Er is een aanpak maar niet consistent' },
    { waarde: 4, label: 'Gedefinieerd', beschrijving: 'Structureel ingericht en meetbaar' },
    { waarde: 5, label: 'Best practice', beschrijving: 'Voorbeeldstellend, continu verbeterend' },
  ],
};

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
