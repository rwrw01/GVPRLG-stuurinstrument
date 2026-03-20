# Volwassenheidsmeting PinkRoccade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-side web application that lets board members of the PinkRoccade LG user association score platform maturity on People/Process/Technology axes, with radar charts and year-over-year comparison.

**Architecture:** Single-page application with 4 JS modules (config, data, charts, app) loaded by one HTML file. No build step. Data persisted in localStorage with JSON import/export for collaboration between board members. Chart.js for radar visualizations.

**Tech Stack:** Vanilla HTML/CSS/JS, Chart.js 4.x via CDN

**Spec:** `docs/superpowers/specs/2026-03-20-volwassenheidsmeting-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `index.html` | Page structure, navigation shell, modal containers, Chart.js CDN link |
| `css/style.css` | All styling: layout grid, form elements, color coding, responsive breakpoints, print styles |
| `js/config.js` | `CONFIG` object: platforms, axes, questions, scale definitions. Single source of truth. |
| `js/data.js` | Data layer: localStorage CRUD, ID generation, import validation, export, score calculations |
| `js/charts.js` | Chart.js wrapper: radar chart creation, year comparison overlay, color scheme |
| `js/app.js` | UI controller: navigation/routing, form rendering, event handling, DOM updates |

All JS files use ES module pattern via `<script type="module">`. No bundler needed.

---

## Task 1: Project scaffolding + CONFIG

**Files:**
- Create: `index.html`
- Create: `js/config.js`

- [ ] **Step 1: Create `js/config.js` with complete CONFIG object**

```javascript
// js/config.js
export const CONFIG = {
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
        { id: 'common-ground', tekst: 'De producten voldoen aan de Common Ground-principes (API-first, componentenarchitectuur, scheiding data/logica)' },
        { id: 'ai-integratie', tekst: 'AI is concreet en bruikbaar onderdeel van de productportfolio (niet alleen visie, maar werkende functionaliteit)', nds: 'AI' },
        { id: 'cloud-saas', tekst: 'De producten worden aangeboden als volwaardige SaaS-oplossing met moderne cloud-architectuur', nds: 'Cloud' },
        { id: 'open-standaarden', tekst: 'De producten ondersteunen open standaarden (ZGW-API\'s, iConnect) en zijn eenvoudig te koppelen met derden' },
        { id: 'digitale-weerbaarheid', tekst: 'De producten voldoen aan actuele security-eisen (BIO, pentesting, responsible disclosure, NIS2-voorbereiding) en verminderen afhankelijkheid van een beperkt aantal leveranciers', nds: 'Digitale weerbaarheid en autonomie' },
        { id: 'datagedreven-werken', tekst: 'De producten ondersteunen verantwoord datagebruik: data is beschikbaar via API\'s, bruikbaar voor analyse en rapportage, en kan veilig gedeeld worden over overheidslagen heen', nds: 'Datagedreven werken' },
      ],
    },
    {
      id: 'mens',
      naam: 'Mens',
      kleur: '#15803D',
      vragen: [
        { id: 'capaciteit-kennis', tekst: 'De personele capaciteit in aantal en kennisniveau bij PinkRoccade is op orde om de producten te ondersteunen en door te ontwikkelen' },
        { id: 'digitaal-vakmanschap', tekst: 'PinkRoccade investeert aantoonbaar in kennisontwikkeling van eigen medewerkers (nieuwe technologieën, AI, Common Ground) en ondersteunt gemeenten bij het versterken van digitale vaardigheden', nds: 'Digitaal vakmanschap' },
        { id: 'klantbetrokkenheid', tekst: 'Gebruikers worden structureel betrokken bij doorontwikkeling (co-creatie, klankbordgroepen, roadmap-invloed)' },
        { id: 'opleiding-ondersteuning', tekst: 'De kwaliteit van training, documentatie en support voor eindgebruikers bij gemeenten is op orde' },
        { id: 'continuiteit-personeel', tekst: 'Er is stabiliteit in sleutelposities; kennisborging is niet afhankelijk van individuele medewerkers' },
      ],
    },
    {
      id: 'proces',
      naam: 'Proces',
      kleur: '#C2410C',
      vragen: [
        { id: 'uniformiteit-dienstverlening', tekst: 'Er is uniformering in de dienstverlening tussen de businessunits naar de klanten toe' },
        { id: 'nps-klanttevredenheid', tekst: 'De NPS-score en klanttevredenheid worden structureel gemeten, gedeeld en vertaald naar verbeteracties' },
        { id: 'releasemanagement', tekst: 'Releases zijn voorspelbaar, goed gecommuniceerd en veroorzaken minimale verstoringen' },
        { id: 'roadmap-transparantie', tekst: 'De productroadmap is transparant, realistisch en sluit aan bij de NDS-prioriteiten en gemeentelijke behoeften' },
        { id: 'incidentafhandeling', tekst: 'Incidenten en storingen worden snel, transparant en volgens afgesproken SLA\'s afgehandeld' },
        { id: 'burgers-ondernemers-centraal', tekst: 'De producten stellen gemeenten in staat om burgers en ondernemers als één overheid te bedienen: geïntegreerde digitale dienstverlening, eenvoudige toegang en inzicht in lopende zaken', nds: 'Burgers en ondernemers centraal' },
      ],
    },
  ],
  ndsThemas: [
    { id: 'Cloud', kleur: '#3786D2' },
    { id: 'AI', kleur: '#E2007A' },
    { id: 'Datagedreven werken', kleur: '#40CEE2' },
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

// Helper: collect all NDS-tagged questions across axes
export function getNdsVragen() {
  const result = [];
  for (const as of CONFIG.assen) {
    for (const vraag of as.vragen) {
      if (vraag.nds) {
        result.push({ ...vraag, asId: as.id, asNaam: as.naam });
      }
    }
  }
  return result;
}
```

- [ ] **Step 2: Create minimal `index.html` that loads config**

```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Volwassenheidsmeting — GV PinkRoccade LG</title>
  <link rel="stylesheet" href="css/style.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
</head>
<body>
  <header>
    <h1>Volwassenheidsmeting PinkRoccade Local Government</h1>
    <p class="subtitle">Gebruikersvereniging PinkRoccade LG</p>
  </header>
  <main id="app"></main>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 3: Verify `index.html` opens in browser without errors**

Open `index.html` in a browser. Check browser console for errors. Expected: no errors, page shows header text.

- [ ] **Step 4: Commit**

```bash
git add index.html js/config.js
git commit -m "feat: project scaffolding with CONFIG and HTML shell"
```

---

## Task 2: Data layer (`js/data.js`)

**Files:**
- Create: `js/data.js`

This module handles all data operations: localStorage persistence, CRUD for metingen, score calculations, ID generation.

- [ ] **Step 1: Create `js/data.js` with localStorage CRUD**

```javascript
// js/data.js
import { CONFIG } from './config.js';

const STORAGE_KEY = 'volwassenheidsmeting-data';

function generateId(jaar) {
  const rand = Math.random().toString(36).substring(2, 8);
  return `m-${jaar}-${rand}`;
}

export function loadAllMetingen() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return data.metingen || [];
  } catch {
    return [];
  }
}

function saveAllMetingen(metingen) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ metingen }));
}

export function getMetingByJaar(jaar) {
  return loadAllMetingen().find((m) => m.jaar === jaar) || null;
}

export function createMeting(jaar) {
  const metingen = loadAllMetingen();
  if (metingen.some((m) => m.jaar === jaar)) {
    return null; // already exists
  }
  const meting = {
    id: generateId(jaar),
    jaar,
    aangemaakt: new Date().toISOString(),
    platformen: {},
  };
  metingen.push(meting);
  saveAllMetingen(metingen);
  return meting;
}

export function savePlatformScores(jaar, platformId, invuller, scores, status) {
  const metingen = loadAllMetingen();
  const meting = metingen.find((m) => m.jaar === jaar);
  if (!meting) return false;

  meting.platformen[platformId] = {
    invuller,
    status, // 'concept' or 'definitief'
    laatstGewijzigd: new Date().toISOString(),
    ...scores, // { techniek: { 'common-ground': { score, toelichting }, ... }, mens: {...}, proces: {...} }
  };
  saveAllMetingen(metingen);
  return true;
}

export function berekenGemiddeldePerAs(platformData) {
  const result = {};
  for (const as of CONFIG.assen) {
    const asData = platformData[as.id];
    if (!asData) {
      result[as.id] = null;
      continue;
    }
    const scores = as.vragen
      .map((v) => asData[v.id]?.score)
      .filter((s) => s != null);
    result[as.id] = scores.length > 0
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : null;
  }
  return result;
}

export function berekenTotaalGemiddelde(platformData) {
  const asGemiddelden = berekenGemiddeldePerAs(platformData);
  const waarden = Object.values(asGemiddelden).filter((v) => v != null);
  return waarden.length > 0
    ? waarden.reduce((sum, v) => sum + v, 0) / waarden.length
    : null;
}

export function berekenOrganisatieGemiddelde(meting) {
  const result = {};
  for (const as of CONFIG.assen) {
    const asScores = [];
    for (const [, pData] of Object.entries(meting.platformen)) {
      if (pData.status !== 'definitief') continue;
      const gem = berekenGemiddeldePerAs(pData);
      if (gem[as.id] != null) asScores.push(gem[as.id]);
    }
    result[as.id] = asScores.length > 0
      ? asScores.reduce((sum, v) => sum + v, 0) / asScores.length
      : null;
  }
  return result;
}

// NDS: collect scores for all NDS-tagged questions for a platform
export function berekenNdsScores(platformData) {
  const result = {};
  for (const as of CONFIG.assen) {
    const asData = platformData[as.id];
    if (!asData) continue;
    for (const vraag of as.vragen) {
      if (vraag.nds && asData[vraag.id]?.score != null) {
        result[vraag.nds] = asData[vraag.id].score;
      }
    }
  }
  return result;
}

// NDS: average across all NDS questions for a platform
export function berekenNdsGemiddelde(platformData) {
  const scores = Object.values(berekenNdsScores(platformData));
  return scores.length > 0
    ? scores.reduce((sum, s) => sum + s, 0) / scores.length
    : null;
}

// NDS: organisation-level NDS scores (average per NDS theme across definitieve platforms)
export function berekenOrganisatieNds(meting) {
  const themaScores = {};
  for (const thema of CONFIG.ndsThemas) {
    themaScores[thema.id] = [];
  }
  for (const [, pData] of Object.entries(meting.platformen)) {
    if (pData.status !== 'definitief') continue;
    const nds = berekenNdsScores(pData);
    for (const [thema, score] of Object.entries(nds)) {
      themaScores[thema]?.push(score);
    }
  }
  const result = {};
  for (const [thema, scores] of Object.entries(themaScores)) {
    result[thema] = scores.length > 0
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : null;
  }
  return result;
}
```

- [ ] **Step 2: Add export and import functions to `js/data.js`**

Append to `js/data.js`:

```javascript
export function exportMeting(jaar) {
  const meting = getMetingByJaar(jaar);
  if (!meting) return null;
  return JSON.stringify({ metingen: [meting] }, null, 2);
}

export function exportPlatform(jaar, platformId) {
  const meting = getMetingByJaar(jaar);
  if (!meting || !meting.platformen[platformId]) return null;
  const partial = {
    metingen: [{
      id: meting.id,
      jaar: meting.jaar,
      aangemaakt: meting.aangemaakt,
      platformen: { [platformId]: meting.platformen[platformId] },
    }],
  };
  return JSON.stringify(partial, null, 2);
}

export function validateImportData(data) {
  const errors = [];
  if (!data || !Array.isArray(data.metingen)) {
    return { valid: false, errors: ['Ongeldig bestandsformaat: "metingen" array ontbreekt.'] };
  }
  const platformIds = CONFIG.platformen.map((p) => p.id);
  const vraagIds = {};
  for (const as of CONFIG.assen) {
    vraagIds[as.id] = as.vragen.map((v) => v.id);
  }

  for (const meting of data.metingen) {
    if (!meting.jaar || typeof meting.jaar !== 'number') {
      errors.push('Meting mist een geldig "jaar" veld.');
    }
    if (!meting.platformen || typeof meting.platformen !== 'object') {
      errors.push(`Meting ${meting.jaar}: "platformen" object ontbreekt.`);
      continue;
    }
    for (const [pId, pData] of Object.entries(meting.platformen)) {
      if (!platformIds.includes(pId)) {
        errors.push(`Onbekend platform: "${pId}".`);
        continue;
      }
      for (const as of CONFIG.assen) {
        const asData = pData[as.id];
        if (!asData) continue;
        for (const [vId, vData] of Object.entries(asData)) {
          if (!vraagIds[as.id].includes(vId)) {
            errors.push(`Onbekende vraag "${vId}" in ${as.naam} van ${pId}.`);
            continue;
          }
          if (vData.score != null && (vData.score < 1 || vData.score > 5)) {
            errors.push(`Ongeldige score ${vData.score} voor "${vId}" in ${pId}. Moet 1-5 zijn.`);
          }
        }
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

export function importMeting(data) {
  // Caller must validate first with validateImportData()
  const metingen = loadAllMetingen();
  const conflicts = [];

  for (const importMeting of data.metingen) {
    const existing = metingen.find((m) => m.jaar === importMeting.jaar);
    if (!existing) {
      metingen.push({
        ...importMeting,
        id: importMeting.id || generateId(importMeting.jaar),
      });
    } else {
      for (const [pId, pData] of Object.entries(importMeting.platformen)) {
        if (existing.platformen[pId]) {
          conflicts.push({ jaar: existing.jaar, platformId: pId });
        } else {
          existing.platformen[pId] = pData;
        }
      }
    }
  }
  saveAllMetingen(metingen);
  return { conflicts };
}

export function overschrijfPlatform(jaar, platformId, platformData) {
  const metingen = loadAllMetingen();
  const meting = metingen.find((m) => m.jaar === jaar);
  if (!meting) return false;
  meting.platformen[platformId] = platformData;
  saveAllMetingen(metingen);
  return true;
}
```

- [ ] **Step 3: Verify module loads without errors**

Temporarily add to `js/app.js`:
```javascript
import { CONFIG } from './config.js';
import { loadAllMetingen, createMeting } from './data.js';
console.log('CONFIG loaded:', CONFIG.platformen.length, 'platformen');
console.log('Metingen:', loadAllMetingen().length);
```

Open `index.html` in browser. Check console. Expected: `CONFIG loaded: 4 platformen` and `Metingen: 0`.

- [ ] **Step 4: Commit**

```bash
git add js/data.js js/app.js
git commit -m "feat: data layer with localStorage CRUD, import/export, validation"
```

---

## Task 3: Styling (`css/style.css`)

**Files:**
- Create: `css/style.css`

- [ ] **Step 1: Create `css/style.css` with complete styling**

```css
/* css/style.css — PinkRoccade Local Government huisstijl */
:root {
  /* PinkRoccade brand */
  --color-primary: #000041;
  --color-accent: #E2007A;
  --color-accent-hover: #B80164;
  --color-secondary: #3786D2;
  --color-cyan: #40CEE2;
  /* Semantic (WCAG AA contrast op wit) */
  --color-success: #15803D;     /* 4.5:1 */
  --color-warning: #C2410C;     /* 4.6:1 */
  --color-danger: #B91C1C;      /* 5.7:1 */
  /* Surfaces */
  --color-bg: #F0F0F2;
  --color-surface: #FFFFFF;
  --color-text: #000041;
  --color-muted: #64748b;
  --color-border: #e2e8f0;
  --radius: 8px;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  --focus-ring: 0 0 0 3px rgba(226, 0, 122, 0.4);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.6;
}

header {
  background: var(--color-primary);
  color: white;
  padding: 1.5rem 2rem;
}

header h1 { font-size: 1.4rem; font-weight: 600; }
.subtitle { color: rgba(255, 255, 255, 0.7); font-size: 0.9rem; }

main { max-width: 1200px; margin: 0 auto; padding: 2rem; }

/* Navigation tabs */
.nav-tabs {
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid var(--color-border);
  margin-bottom: 2rem;
}

.nav-tab {
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  font-size: 0.95rem;
  color: var(--color-muted);
  transition: all 0.2s;
}

.nav-tab:hover { color: var(--color-text); }
.nav-tab.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
  font-weight: 600;
}

/* Cards */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: var(--shadow);
}

.card h2 { font-size: 1.2rem; margin-bottom: 1rem; }
.card h3 { font-size: 1rem; margin-bottom: 0.75rem; color: var(--color-muted); }

/* Forms */
.form-group { margin-bottom: 1.25rem; }
.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 0.95rem;
  font-family: inherit;
}

.form-group textarea { resize: vertical; min-height: 60px; }

/* Score radio buttons */
.score-group {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.4rem;
}

.score-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}

.score-option input[type="radio"] { display: none; }

.score-option .score-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--color-border);
  border-radius: var(--radius);
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.2s;
  background: var(--color-surface);
}

.score-option input[type="radio"]:checked + .score-btn {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: white;
}

.score-option:hover .score-btn {
  border-color: var(--color-accent);
}

.score-option .score-label {
  font-size: 0.65rem;
  color: var(--color-muted);
  margin-top: 0.2rem;
  text-align: center;
  max-width: 60px;
}

/* Question block */
.question-block {
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  margin-bottom: 1rem;
}

.question-block .question-text {
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
  line-height: 1.5;
}

.question-block .question-nr {
  font-weight: 700;
  color: var(--color-accent);
  margin-right: 0.5rem;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: var(--radius);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
  font-family: inherit;
}

.btn:hover { opacity: 0.85; }

.btn-primary { background: var(--color-accent); color: white; }
.btn-primary:hover { background: var(--color-accent-hover); }
.btn-success { background: var(--color-success); color: white; }
.btn-warning { background: var(--color-warning); color: white; }
.btn-danger { background: var(--color-danger); color: white; }
.btn-outline {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

/* Accessibility: focus ring */
.btn:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
.score-option input:focus-visible + .score-btn {
  outline: none;
  box-shadow: var(--focus-ring);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition: none !important; animation: none !important; }
}

.btn-group { display: flex; gap: 0.5rem; flex-wrap: wrap; }

/* Tables */
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

th, td {
  padding: 0.6rem 0.8rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

th { font-weight: 600; background: var(--color-bg); }

/* Score colors */
.score-1, .score-2 { color: var(--color-danger); }
.score-3 { color: var(--color-warning); }
.score-4, .score-5 { color: var(--color-success); }

/* Dashboard grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
}

.chart-container {
  position: relative;
  width: 100%;
  max-width: 350px;
  margin: 0 auto;
}

/* Status badges */
.badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-concept { background: #fef3c7; color: #92400e; }
.badge-definitief { background: #dcfce7; color: #166534; }
.badge-leeg { background: #f1f5f9; color: #64748b; }

/* Alert / warning box */
.alert {
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  margin-bottom: 1rem;
  font-size: 0.85rem;
}

.alert-warning {
  background: #fffbeb;
  border: 1px solid #fbbf24;
  color: #92400e;
}

.alert-info {
  background: #eff6ff;
  border: 1px solid #93c5fd;
  color: #1e40af;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: var(--color-surface);
  border-radius: var(--radius);
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal h2 { margin-bottom: 1rem; }
.modal .btn-group { margin-top: 1.5rem; justify-content: flex-end; }

/* Responsive */
@media (max-width: 768px) {
  header { padding: 1rem; }
  main { padding: 1rem; }
  .nav-tab { padding: 0.5rem 0.75rem; font-size: 0.85rem; }
  .dashboard-grid { grid-template-columns: 1fr; }
}

/* Print */
@media print {
  header { background: white; color: black; border-bottom: 2px solid black; }
  .btn, .nav-tabs, .alert-warning { display: none; }
  .card { break-inside: avoid; box-shadow: none; border: 1px solid #ccc; }
}
```

- [ ] **Step 2: Verify styling renders correctly**

Open `index.html` in browser. Expected: styled header with dark blue background, white text.

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat: complete CSS styling with responsive and print support"
```

---

## Task 4: Chart module (`js/charts.js`)

**Files:**
- Create: `js/charts.js`

- [ ] **Step 1: Create `js/charts.js` with radar chart functions**

```javascript
// js/charts.js
import { CONFIG } from './config.js';

const AXIS_LABELS = CONFIG.assen.map((a) => a.naam);
const AXIS_COLORS = CONFIG.assen.map((a) => a.kleur);
const NDS_LABELS = CONFIG.ndsThemas.map((t) => t.id);

function scoreToColor(score) {
  if (score == null) return '#A4A6B1';
  if (score < 2) return '#B91C1C';
  if (score < 3) return '#C2410C';
  if (score < 4) return '#C2410C';
  return '#15803D';
}

export function createRadarChart(canvasId, datasets) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  const chartDatasets = datasets.map((ds) => ({
    label: ds.label,
    data: AXIS_LABELS.map((_, i) => ds.scores[CONFIG.assen[i].id] ?? 0),
    backgroundColor: ds.fillColor || 'rgba(37, 99, 235, 0.15)',
    borderColor: ds.borderColor || '#2563eb',
    borderWidth: 2,
    pointBackgroundColor: ds.borderColor || '#2563eb',
    pointRadius: 4,
  }));

  return new Chart(ctx, {
    type: 'radar',
    data: {
      labels: AXIS_LABELS,
      datasets: chartDatasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          min: 0,
          max: 5,
          ticks: { stepSize: 1, display: true },
          grid: { color: '#e2e8f0' },
          pointLabels: { font: { size: 13, weight: '600' } },
        },
      },
      plugins: {
        legend: { display: datasets.length > 1, position: 'bottom' },
      },
    },
  });
}

export function createDetailBars(containerId, platformData) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  for (const as of CONFIG.assen) {
    const asData = platformData[as.id];
    if (!asData) continue;

    const section = document.createElement('div');
    section.className = 'detail-section';
    section.innerHTML = `<h4 style="color:${as.kleur};margin-bottom:0.5rem;">${as.naam}</h4>`;

    for (const vraag of as.vragen) {
      const score = asData[vraag.id]?.score;
      const pct = score ? (score / 5) * 100 : 0;
      const color = scoreToColor(score);

      section.innerHTML += `
        <div style="margin-bottom:0.5rem;">
          <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:0.2rem;">
            <span>${vraag.id.replace(/-/g, ' ')}</span>
            <span style="font-weight:600;color:${color}">${score ?? '-'}/5</span>
          </div>
          <div style="height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${color};border-radius:4px;transition:width 0.3s;"></div>
          </div>
        </div>`;
    }
    container.appendChild(section);
  }
}

export function createNdsRadarChart(canvasId, datasets) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  const chartDatasets = datasets.map((ds) => ({
    label: ds.label,
    data: NDS_LABELS.map((thema) => ds.scores[thema] ?? 0),
    backgroundColor: ds.fillColor || 'rgba(226, 0, 122, 0.15)',
    borderColor: ds.borderColor || '#E2007A',
    borderWidth: 2,
    pointBackgroundColor: ds.borderColor || '#E2007A',
    pointRadius: 4,
  }));

  return new Chart(ctx, {
    type: 'radar',
    data: { labels: NDS_LABELS, datasets: chartDatasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          min: 0, max: 5,
          ticks: { stepSize: 1, display: true },
          grid: { color: '#e2e8f0' },
          pointLabels: { font: { size: 11, weight: '600' } },
        },
      },
      plugins: {
        legend: { display: datasets.length > 1, position: 'bottom' },
      },
    },
  });
}

export function destroyChart(chart) {
  if (chart) chart.destroy();
}

export const YEAR_COLORS = [
  { border: '#2563eb', fill: 'rgba(37, 99, 235, 0.15)' },
  { border: '#16a34a', fill: 'rgba(22, 163, 74, 0.15)' },
  { border: '#ea580c', fill: 'rgba(234, 88, 12, 0.15)' },
  { border: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.15)' },
];
```

- [ ] **Step 2: Verify Chart.js loads from CDN**

Open `index.html`, check browser console. Expected: `Chart` is defined globally (no 404 on CDN).

- [ ] **Step 3: Commit**

```bash
git add js/charts.js
git commit -m "feat: Chart.js wrapper for radar diagrams and detail bars"
```

---

## Task 5: App controller — navigation + startscherm (`js/app.js`)

**Files:**
- Create: `js/app.js` (replace test content from Task 2)

- [ ] **Step 1: Create `js/app.js` with navigation and startscherm**

```javascript
// js/app.js
import { CONFIG, getNdsVragen } from './config.js';
import {
  loadAllMetingen, createMeting, getMetingByJaar,
  savePlatformScores, berekenGemiddeldePerAs, berekenTotaalGemiddelde,
  berekenOrganisatieGemiddelde, berekenNdsScores, berekenNdsGemiddelde,
  berekenOrganisatieNds, exportMeting, exportPlatform,
  validateImportData, importMeting, overschrijfPlatform,
} from './data.js';
import { createRadarChart, createNdsRadarChart, createDetailBars, destroyChart, YEAR_COLORS } from './charts.js';

const app = document.getElementById('app');
let activeCharts = [];

function destroyAllCharts() {
  activeCharts.forEach(destroyChart);
  activeCharts = [];
}

function navigate(view, params = {}) {
  destroyAllCharts();
  switch (view) {
    case 'home': renderHome(); break;
    case 'meting': renderMeting(params.jaar); break;
    case 'invullen': renderInvullen(params.jaar, params.platformId); break;
    case 'platform-result': renderPlatformResult(params.jaar, params.platformId); break;
    case 'dashboard': renderDashboard(params.jaar); break;
    case 'vergelijking': renderVergelijking(); break;
    default: renderHome();
  }
}

// ─── HOME ───────────────────────────────────────────────
function renderHome() {
  const metingen = loadAllMetingen().sort((a, b) => b.jaar - a.jaar);

  app.innerHTML = `
    <div class="alert alert-warning">
      Let op: gegevens worden opgeslagen in de browser (localStorage). Exporteer regelmatig als backup.
    </div>
    <div class="card">
      <h2>Metingen</h2>
      <div class="btn-group" style="margin-bottom:1rem;">
        <button class="btn btn-primary" id="btn-new">Nieuwe meting</button>
        <button class="btn btn-outline" id="btn-import">Importeer JSON</button>
        <input type="file" id="file-import" accept=".json" style="display:none">
      </div>
      ${metingen.length === 0
        ? '<p style="color:var(--color-muted)">Nog geen metingen. Start een nieuwe meting.</p>'
        : `<table>
            <thead><tr><th>Jaar</th><th>Platformen</th><th>Status</th><th></th></tr></thead>
            <tbody>${metingen.map((m) => {
              const pCount = Object.keys(m.platformen).length;
              const defCount = Object.values(m.platformen).filter((p) => p.status === 'definitief').length;
              return `<tr>
                <td><strong>${m.jaar}</strong></td>
                <td>${pCount} / ${CONFIG.platformen.length}</td>
                <td>${defCount === CONFIG.platformen.length
                  ? '<span class="badge badge-definitief">Compleet</span>'
                  : `<span class="badge badge-concept">${defCount} definitief</span>`}</td>
                <td>
                  <button class="btn btn-outline btn-open" data-jaar="${m.jaar}">Openen</button>
                  <button class="btn btn-outline btn-export" data-jaar="${m.jaar}">Export</button>
                </td>
              </tr>`;
            }).join('')}</tbody>
          </table>`
      }
    </div>
    ${metingen.length >= 2 ? '<button class="btn btn-primary" id="btn-vergelijk">Jaarlijkse vergelijking</button>' : ''}
  `;

  document.getElementById('btn-new')?.addEventListener('click', () => {
    const jaar = parseInt(prompt('Jaar voor de nieuwe meting:', new Date().getFullYear()), 10);
    if (!jaar || jaar < 2020 || jaar > 2100) return;
    if (getMetingByJaar(jaar)) { alert(`Meting voor ${jaar} bestaat al.`); return; }
    createMeting(jaar);
    navigate('meting', { jaar });
  });

  document.getElementById('btn-import')?.addEventListener('click', () => {
    document.getElementById('file-import').click();
  });

  document.getElementById('file-import')?.addEventListener('change', handleImport);

  document.querySelectorAll('.btn-open').forEach((btn) => {
    btn.addEventListener('click', () => navigate('meting', { jaar: parseInt(btn.dataset.jaar, 10) }));
  });

  document.querySelectorAll('.btn-export').forEach((btn) => {
    btn.addEventListener('click', () => {
      const jaar = parseInt(btn.dataset.jaar, 10);
      downloadJson(exportMeting(jaar), `volwassenheid-${jaar}-compleet.json`);
    });
  });

  document.getElementById('btn-vergelijk')?.addEventListener('click', () => navigate('vergelijking'));
}

// ─── METING OVERVIEW (per year) ─────────────────────────
function renderMeting(jaar) {
  const meting = getMetingByJaar(jaar);
  if (!meting) { navigate('home'); return; }

  app.innerHTML = `
    <button class="btn btn-outline" id="btn-back">Terug</button>
    <h2 style="margin:1rem 0;">Meting ${jaar}</h2>
    <div class="dashboard-grid">
      ${CONFIG.platformen.map((p) => {
        const pd = meting.platformen[p.id];
        const status = pd ? pd.status : 'leeg';
        const gem = pd ? berekenTotaalGemiddelde(pd) : null;
        return `
          <div class="card">
            <h3>${p.naam}</h3>
            <span class="badge badge-${status}">${status === 'leeg' ? 'Nog niet ingevuld' : status}</span>
            ${gem != null ? `<p style="font-size:1.5rem;font-weight:700;margin:0.5rem 0;">${gem.toFixed(1)}</p>` : ''}
            <div class="btn-group" style="margin-top:0.75rem;">
              ${status !== 'definitief'
                ? `<button class="btn btn-primary btn-invullen" data-platform="${p.id}">Invullen</button>`
                : `<button class="btn btn-outline btn-view" data-platform="${p.id}">Bekijken</button>
                   <button class="btn btn-outline btn-unlock" data-platform="${p.id}">Heropenen</button>`}
              ${pd ? `<button class="btn btn-outline btn-export-p" data-platform="${p.id}">Export</button>` : ''}
            </div>
          </div>`;
      }).join('')}
    </div>
    <div class="btn-group" style="margin-top:1rem;">
      <button class="btn btn-primary" id="btn-dashboard">Dashboard</button>
      <button class="btn btn-outline" id="btn-import-p">Importeer platform</button>
      <input type="file" id="file-import-p" accept=".json" style="display:none">
    </div>
  `;

  document.getElementById('btn-back').addEventListener('click', () => navigate('home'));

  document.querySelectorAll('.btn-invullen').forEach((btn) => {
    btn.addEventListener('click', () => navigate('invullen', { jaar, platformId: btn.dataset.platform }));
  });

  document.querySelectorAll('.btn-view').forEach((btn) => {
    btn.addEventListener('click', () => navigate('platform-result', { jaar, platformId: btn.dataset.platform }));
  });

  document.querySelectorAll('.btn-unlock').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!confirm('Weet je zeker dat je deze meting wilt heropenen?')) return;
      const pd = meting.platformen[btn.dataset.platform];
      savePlatformScores(jaar, btn.dataset.platform, pd.invuller,
        { techniek: pd.techniek, mens: pd.mens, proces: pd.proces }, 'concept');
      navigate('meting', { jaar });
    });
  });

  document.querySelectorAll('.btn-export-p').forEach((btn) => {
    downloadJson(exportPlatform(jaar, btn.dataset.platform),
      `volwassenheid-${jaar}-${btn.dataset.platform}.json`);
  });

  document.getElementById('btn-dashboard').addEventListener('click', () => navigate('dashboard', { jaar }));

  document.getElementById('btn-import-p')?.addEventListener('click', () => {
    document.getElementById('file-import-p').click();
  });
  document.getElementById('file-import-p')?.addEventListener('change', (e) => handleImport(e, jaar));
}

// ─── INVULLEN ───────────────────────────────────────────
function renderInvullen(jaar, platformId) {
  const meting = getMetingByJaar(jaar);
  if (!meting) { navigate('home'); return; }

  const platform = CONFIG.platformen.find((p) => p.id === platformId);
  const existing = meting.platformen[platformId];

  app.innerHTML = `
    <button class="btn btn-outline" id="btn-back">Terug naar meting ${jaar}</button>
    <h2 style="margin:1rem 0;">${platform.naam} — Meting ${jaar}</h2>
    <div class="card">
      <div class="form-group">
        <label for="invuller">Naam invuller (verplicht)</label>
        <input type="text" id="invuller" value="${existing?.invuller || ''}" placeholder="Uw naam">
      </div>
    </div>
    ${CONFIG.assen.map((as) => `
      <div class="card">
        <h2 style="color:${as.kleur}">${as.naam}</h2>
        ${as.vragen.map((v, vi) => {
          const current = existing?.[as.id]?.[v.id];
          return `
            <div class="question-block">
              <p class="question-text"><span class="question-nr">${vi + 1}.</span>${v.tekst}</p>
              <div class="score-group">
                ${CONFIG.schaal.map((s) => `
                  <label class="score-option">
                    <input type="radio" name="${as.id}-${v.id}" value="${s.waarde}"
                      ${current?.score === s.waarde ? 'checked' : ''}>
                    <span class="score-btn">${s.waarde}</span>
                    <span class="score-label">${s.label}</span>
                  </label>
                `).join('')}
              </div>
              <div class="form-group" style="margin-top:0.5rem;">
                <textarea name="toelichting-${as.id}-${v.id}" placeholder="Toelichting (optioneel)"
                  rows="2">${current?.toelichting || ''}</textarea>
              </div>
            </div>`;
        }).join('')}
      </div>
    `).join('')}
    <div class="btn-group">
      <button class="btn btn-primary" id="btn-save">Opslaan als concept</button>
      <button class="btn btn-success" id="btn-finish">Afronden (definitief)</button>
    </div>
  `;

  document.getElementById('btn-back').addEventListener('click', () => navigate('meting', { jaar }));

  function collectScores() {
    const scores = {};
    for (const as of CONFIG.assen) {
      scores[as.id] = {};
      for (const v of as.vragen) {
        const radio = document.querySelector(`input[name="${as.id}-${v.id}"]:checked`);
        const textarea = document.querySelector(`textarea[name="toelichting-${as.id}-${v.id}"]`);
        scores[as.id][v.id] = {
          score: radio ? parseInt(radio.value, 10) : null,
          toelichting: textarea?.value?.trim() || '',
        };
      }
    }
    return scores;
  }

  document.getElementById('btn-save').addEventListener('click', () => {
    const invuller = document.getElementById('invuller').value.trim();
    savePlatformScores(jaar, platformId, invuller, collectScores(), 'concept');
    alert('Opgeslagen als concept.');
  });

  document.getElementById('btn-finish').addEventListener('click', () => {
    const invuller = document.getElementById('invuller').value.trim();
    if (!invuller) { alert('Vul uw naam in.'); return; }
    const scores = collectScores();
    const allFilled = CONFIG.assen.every((as) =>
      as.vragen.every((v) => scores[as.id][v.id].score != null));
    if (!allFilled) { alert('Vul alle vragen in voordat u afrondt.'); return; }
    savePlatformScores(jaar, platformId, invuller, scores, 'definitief');
    navigate('platform-result', { jaar, platformId });
  });
}

// ─── PLATFORM RESULT ────────────────────────────────────
function renderPlatformResult(jaar, platformId) {
  const meting = getMetingByJaar(jaar);
  const platform = CONFIG.platformen.find((p) => p.id === platformId);
  const pd = meting?.platformen[platformId];
  if (!pd) { navigate('meting', { jaar }); return; }

  const gemPerAs = berekenGemiddeldePerAs(pd);
  const totaal = berekenTotaalGemiddelde(pd);

  app.innerHTML = `
    <button class="btn btn-outline" id="btn-back">Terug naar meting ${jaar}</button>
    <h2 style="margin:1rem 0;">${platform.naam} — Resultaat ${jaar}</h2>
    <span class="badge badge-${pd.status}">${pd.status}</span>
    <p style="color:var(--color-muted);margin:0.5rem 0;">Ingevuld door: ${pd.invuller || '-'}</p>
    <div class="dashboard-grid" style="margin-top:1rem;">
      <div class="card">
        <h3>Radardiagram</h3>
        <div class="chart-container">
          <canvas id="radar-${platformId}"></canvas>
        </div>
        <p style="text-align:center;margin-top:0.5rem;font-size:1.3rem;font-weight:700;">
          Totaal: ${totaal != null ? totaal.toFixed(1) : '-'} / 5
        </p>
        <table style="margin-top:1rem;">
          <tbody>
            ${CONFIG.assen.map((as) => `
              <tr>
                <td style="font-weight:600;color:${as.kleur}">${as.naam}</td>
                <td>${gemPerAs[as.id] != null ? gemPerAs[as.id].toFixed(1) : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="card">
        <h3>Detail per vraag</h3>
        <div id="detail-${platformId}"></div>
      </div>
    </div>
  `;

  document.getElementById('btn-back').addEventListener('click', () => navigate('meting', { jaar }));

  activeCharts.push(createRadarChart(`radar-${platformId}`, [{
    label: `${platform.naam} ${jaar}`,
    scores: gemPerAs,
  }]));

  createDetailBars(`detail-${platformId}`, pd);
}

// ─── DASHBOARD ──────────────────────────────────────────
function renderDashboard(jaar) {
  const meting = getMetingByJaar(jaar);
  if (!meting) { navigate('home'); return; }

  const orgGem = berekenOrganisatieGemiddelde(meting);
  const orgTotaal = Object.values(orgGem).filter((v) => v != null);
  const orgScore = orgTotaal.length > 0
    ? orgTotaal.reduce((s, v) => s + v, 0) / orgTotaal.length
    : null;

  app.innerHTML = `
    <button class="btn btn-outline" id="btn-back">Terug naar meting ${jaar}</button>
    <h2 style="margin:1rem 0;">Dashboard ${jaar}</h2>

    <div class="card">
      <h3>Totaaloverzicht</h3>
      <table>
        <thead><tr><th>Platform</th>${CONFIG.assen.map((a) => `<th>${a.naam}</th>`).join('')}<th>Gemiddeld</th><th>Status</th></tr></thead>
        <tbody>
          ${CONFIG.platformen.map((p) => {
            const pd = meting.platformen[p.id];
            if (!pd) return `<tr><td>${p.naam}</td><td colspan="${CONFIG.assen.length + 2}" style="color:var(--color-muted)">Nog niet ingevuld</td></tr>`;
            const gem = berekenGemiddeldePerAs(pd);
            const tot = berekenTotaalGemiddelde(pd);
            return `<tr>
              <td><strong>${p.naam}</strong></td>
              ${CONFIG.assen.map((a) => `<td class="score-${Math.round(gem[a.id] || 0)}">${gem[a.id] != null ? gem[a.id].toFixed(1) : '-'}</td>`).join('')}
              <td><strong>${tot != null ? tot.toFixed(1) : '-'}</strong></td>
              <td><span class="badge badge-${pd.status}">${pd.status}</span></td>
            </tr>`;
          }).join('')}
          <tr style="border-top:2px solid var(--color-text);">
            <td><strong>Organisatie</strong></td>
            ${CONFIG.assen.map((a) => `<td><strong>${orgGem[a.id] != null ? orgGem[a.id].toFixed(1) : '-'}</strong></td>`).join('')}
            <td><strong>${orgScore != null ? orgScore.toFixed(1) : '-'}</strong></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="dashboard-grid">
      ${CONFIG.platformen.map((p) => {
        const pd = meting.platformen[p.id];
        if (!pd) return `<div class="card"><h3>${p.naam}</h3><p style="color:var(--color-muted)">Nog niet ingevuld</p></div>`;
        const gem = berekenGemiddeldePerAs(pd);
        return `
          <div class="card">
            <h3>${p.naam}</h3>
            <div class="chart-container"><canvas id="dash-radar-${p.id}"></canvas></div>
          </div>`;
      }).join('')}
      <div class="card">
        <h3>Organisatie totaal</h3>
        <div class="chart-container"><canvas id="dash-radar-org"></canvas></div>
      </div>
    </div>

    <h2 style="margin:1.5rem 0 1rem;">NDS-gereedheid</h2>
    <div class="card">
      <h3>Nederlandse Digitaliseringsstrategie — scores per platform</h3>
      <table>
        <thead>
          <tr><th>Platform</th>${CONFIG.ndsThemas.map((t) => `<th>${t.id}</th>`).join('')}<th>NDS gem.</th></tr>
        </thead>
        <tbody>
          ${CONFIG.platformen.map((p) => {
            const pd = meting.platformen[p.id];
            if (!pd || pd.status !== 'definitief') return `<tr><td>${p.naam}</td><td colspan="${CONFIG.ndsThemas.length + 1}" style="color:var(--color-muted)">-</td></tr>`;
            const nds = berekenNdsScores(pd);
            const ndsGem = berekenNdsGemiddelde(pd);
            return \`<tr>
              <td><strong>\${p.naam}</strong></td>
              \${CONFIG.ndsThemas.map((t) => \`<td>\${nds[t.id] != null ? nds[t.id] : '-'}</td>\`).join('')}
              <td><strong>\${ndsGem != null ? ndsGem.toFixed(1) : '-'}</strong></td>
            </tr>\`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div class="dashboard-grid">
      <div class="card">
        <h3>NDS Radardiagram — Organisatie</h3>
        <div class="chart-container"><canvas id="dash-nds-org"></canvas></div>
      </div>
    </div>
  `;

  document.getElementById('btn-back').addEventListener('click', () => navigate('meting', { jaar }));

  for (const p of CONFIG.platformen) {
    const pd = meting.platformen[p.id];
    if (!pd) continue;
    activeCharts.push(createRadarChart(`dash-radar-${p.id}`, [{
      label: p.naam, scores: berekenGemiddeldePerAs(pd),
    }]));
  }

  activeCharts.push(createRadarChart('dash-radar-org', [{
    label: `Organisatie ${jaar}`, scores: orgGem,
    borderColor: '#000041', fillColor: 'rgba(0, 0, 65, 0.15)',
  }]));

  const orgNds = berekenOrganisatieNds(meting);
  activeCharts.push(createNdsRadarChart('dash-nds-org', [{
    label: `NDS ${jaar}`, scores: orgNds,
  }]));
}

// ─── VERGELIJKING ───────────────────────────────────────
function renderVergelijking() {
  const metingen = loadAllMetingen().sort((a, b) => a.jaar - b.jaar);
  if (metingen.length < 2) { navigate('home'); return; }

  app.innerHTML = `
    <button class="btn btn-outline" id="btn-back">Terug</button>
    <h2 style="margin:1rem 0;">Jaarlijkse vergelijking</h2>
    <div class="dashboard-grid">
      ${CONFIG.platformen.map((p) => {
        const hasData = metingen.some((m) => m.platformen[p.id]?.status === 'definitief');
        if (!hasData) return '';
        return `
          <div class="card">
            <h3>${p.naam}</h3>
            <div class="chart-container"><canvas id="vgl-radar-${p.id}"></canvas></div>
          </div>`;
      }).join('')}
      <div class="card">
        <h3>Organisatie totaal</h3>
        <div class="chart-container"><canvas id="vgl-radar-org"></canvas></div>
      </div>
    </div>

    <div class="card">
      <h3>Delta-tabel</h3>
      <table>
        <thead>
          <tr>
            <th>Platform</th>
            ${metingen.map((m) => `<th>${m.jaar}</th>`).join('')}
            <th>Delta</th>
          </tr>
        </thead>
        <tbody>
          ${CONFIG.platformen.map((p) => {
            const scores = metingen.map((m) => {
              const pd = m.platformen[p.id];
              return pd?.status === 'definitief' ? berekenTotaalGemiddelde(pd) : null;
            });
            const first = scores.find((s) => s != null);
            const last = [...scores].reverse().find((s) => s != null);
            const delta = first != null && last != null ? last - first : null;
            return `<tr>
              <td><strong>${p.naam}</strong></td>
              ${scores.map((s) => `<td>${s != null ? s.toFixed(1) : '-'}</td>`).join('')}
              <td style="font-weight:600;color:${delta > 0 ? 'var(--color-success)' : delta < 0 ? 'var(--color-danger)' : 'var(--color-muted)'}">
                ${delta != null ? (delta > 0 ? '+' : '') + delta.toFixed(1) : '-'}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('btn-back').addEventListener('click', () => navigate('home'));

  for (const p of CONFIG.platformen) {
    const datasets = [];
    metingen.forEach((m, i) => {
      const pd = m.platformen[p.id];
      if (!pd || pd.status !== 'definitief') return;
      datasets.push({
        label: `${m.jaar}`,
        scores: berekenGemiddeldePerAs(pd),
        borderColor: YEAR_COLORS[i % YEAR_COLORS.length].border,
        fillColor: YEAR_COLORS[i % YEAR_COLORS.length].fill,
      });
    });
    if (datasets.length > 0) activeCharts.push(createRadarChart(`vgl-radar-${p.id}`, datasets));
  }

  // Organisation-level comparison
  const orgDatasets = metingen.map((m, i) => ({
    label: `${m.jaar}`,
    scores: berekenOrganisatieGemiddelde(m),
    borderColor: YEAR_COLORS[i % YEAR_COLORS.length].border,
    fillColor: YEAR_COLORS[i % YEAR_COLORS.length].fill,
  }));
  activeCharts.push(createRadarChart('vgl-radar-org', orgDatasets));
}

// ─── HELPERS ────────────────────────────────────────────
function downloadJson(jsonString, filename) {
  if (!jsonString) return;
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function handleImport(event, refreshJaar) {
  const file = event.target.files[0];
  if (!file) return;
  event.target.value = '';

  const reader = new FileReader();
  reader.onload = (e) => {
    let data;
    try {
      data = JSON.parse(e.target.result);
    } catch {
      alert('Ongeldig JSON-bestand.');
      return;
    }

    const validation = validateImportData(data);
    if (!validation.valid) {
      alert('Validatiefouten:\n\n' + validation.errors.join('\n'));
      return;
    }

    const result = importMeting(data);

    if (result.conflicts.length > 0) {
      for (const conflict of result.conflicts) {
        const platformNaam = CONFIG.platformen.find((p) => p.id === conflict.platformId)?.naam || conflict.platformId;
        if (confirm(`Platform "${platformNaam}" bestaat al in meting ${conflict.jaar}. Overschrijven?`)) {
          const importedPlatform = data.metingen
            .find((m) => m.jaar === conflict.jaar)
            ?.platformen[conflict.platformId];
          if (importedPlatform) {
            overschrijfPlatform(conflict.jaar, conflict.platformId, importedPlatform);
          }
        }
      }
    }

    alert('Import geslaagd.');
    navigate(refreshJaar ? 'meting' : 'home', refreshJaar ? { jaar: refreshJaar } : {});
  };
  reader.readAsText(file);
}

// ─── INIT ───────────────────────────────────────────────
navigate('home');
```

- [ ] **Step 2: Open in browser and test complete flow**

1. Open `index.html` in browser
2. Create new meting for 2026
3. Fill in scores for "Belastingen" platform — verify all 15 questions render with radio buttons
4. Save as concept — verify it persists (refresh page)
5. Complete all questions and finalize — verify radar chart renders
6. Verify dashboard shows the platform

Expected: full flow works without console errors.

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: complete app controller with all views and user flow"
```

---

## Task 6: Manual integration test

**Files:** None (testing only)

- [ ] **Step 1: Test complete user flow**

1. Open `index.html` in browser
2. Create meting 2026
3. Fill in and finalize "Belastingen" (all 15 questions scored)
4. Fill in and finalize "Burgerzaken"
5. Open Dashboard — verify both platforms show radar charts and table
6. Export "Belastingen" as separate JSON
7. Export complete meting as JSON

- [ ] **Step 2: Test import/export workflow**

1. Open a new browser / incognito window (empty localStorage)
2. Create meting 2026
3. Fill in "Sociaal Domein" and finalize
4. Export "Sociaal Domein" as JSON
5. In original browser: import the "Sociaal Domein" JSON file
6. Verify it appears alongside Belastingen and Burgerzaken

- [ ] **Step 3: Test year comparison**

1. Create meting 2025 and fill in at least one platform with different scores
2. Open "Jaarlijkse vergelijking"
3. Verify overlay radar charts show both years with different colors
4. Verify delta table shows the score difference

- [ ] **Step 4: Test edge cases**

1. Try importing an invalid JSON file — verify error message
2. Try importing a platform that already exists — verify overwrite prompt
3. Try finalizing with missing questions — verify validation message
4. Try finalizing without name — verify validation message
5. Verify responsive layout on narrow viewport (< 768px)
6. Verify print layout (Ctrl+P preview)

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: corrections from integration testing"
```

---

## Task 7: Final polish and documentation

**Files:**
- Modify: `index.html` (add SRI hash if available)

- [ ] **Step 1: Verify Chart.js SRI hash**

Look up the SRI hash for Chart.js 4.4.7 UMD build. Update the `<script>` tag:
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"
  integrity="sha256-..." crossorigin="anonymous"></script>
```

- [ ] **Step 2: Final commit**

```bash
git add -A
git commit -m "chore: add SRI hash for Chart.js CDN"
```
