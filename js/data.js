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
    return null;
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
    status,
    laatstGewijzigd: new Date().toISOString(),
    ...scores,
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

// Export functions
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
