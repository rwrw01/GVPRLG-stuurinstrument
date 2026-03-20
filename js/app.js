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
    <div class="alert alert-warning" role="alert">
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
    btn.addEventListener('click', () => {
      downloadJson(exportPlatform(jaar, btn.dataset.platform),
        `volwassenheid-${jaar}-${btn.dataset.platform}.json`);
    });
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
          const ndsTag = v.nds ? `<span class="nds-tag">NDS: ${v.nds}</span>` : '';
          return `
            <div class="question-block">
              <p class="question-text"><span class="question-nr">${vi + 1}.</span>${v.tekst}${ndsTag}</p>
              <div class="score-group" role="radiogroup" aria-label="${v.tekst}">
                ${CONFIG.schaal.map((s) => `
                  <label class="score-option">
                    <input type="radio" name="${as.id}-${v.id}" value="${s.waarde}"
                      ${current?.score === s.waarde ? 'checked' : ''}
                      aria-label="${s.waarde} - ${s.label}: ${s.beschrijving}">
                    <span class="score-btn">${s.waarde}</span>
                    <span class="score-label">${s.label}</span>
                  </label>
                `).join('')}
              </div>
              <div class="form-group" style="margin-top:0.5rem;">
                <label for="toel-${as.id}-${v.id}" class="sr-only">Toelichting bij ${v.id}</label>
                <textarea id="toel-${as.id}-${v.id}" name="toelichting-${as.id}-${v.id}" placeholder="Toelichting (optioneel)"
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
        <table style="margin-top:1rem;" aria-label="Scores per as">
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

  // Build NDS table rows
  const ndsRows = CONFIG.platformen.map((p) => {
    const pd = meting.platformen[p.id];
    if (!pd || pd.status !== 'definitief') {
      return `<tr><td>${p.naam}</td><td colspan="${CONFIG.ndsThemas.length + 1}" style="color:var(--color-muted)">-</td></tr>`;
    }
    const nds = berekenNdsScores(pd);
    const ndsGem = berekenNdsGemiddelde(pd);
    return `<tr>
      <td><strong>${p.naam}</strong></td>
      ${CONFIG.ndsThemas.map((t) => `<td>${nds[t.id] != null ? nds[t.id] : '-'}</td>`).join('')}
      <td><strong>${ndsGem != null ? ndsGem.toFixed(1) : '-'}</strong></td>
    </tr>`;
  }).join('');

  app.innerHTML = `
    <button class="btn btn-outline" id="btn-back">Terug naar meting ${jaar}</button>
    <h2 style="margin:1rem 0;">Dashboard ${jaar}</h2>

    <div class="card">
      <h3>Totaaloverzicht</h3>
      <table aria-label="Scores per platform">
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
      <table aria-label="NDS scores per platform">
        <thead>
          <tr><th>Platform</th>${CONFIG.ndsThemas.map((t) => `<th>${t.id}</th>`).join('')}<th>NDS gem.</th></tr>
        </thead>
        <tbody>${ndsRows}</tbody>
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
      <table aria-label="Vergelijking per jaar">
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
