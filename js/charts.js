// js/charts.js
import { CONFIG } from './config.js';

const AXIS_LABELS = CONFIG.assen.map((a) => a.naam);
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
    backgroundColor: ds.fillColor || 'rgba(226, 0, 122, 0.15)',
    borderColor: ds.borderColor || '#E2007A',
    borderWidth: 2,
    pointBackgroundColor: ds.borderColor || '#E2007A',
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
      const ndsTag = vraag.nds ? `<span class="nds-tag">NDS</span>` : '';

      section.innerHTML += `
        <div style="margin-bottom:0.5rem;">
          <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:0.2rem;">
            <span>${vraag.id.replace(/-/g, ' ')}${ndsTag}</span>
            <span style="font-weight:600;color:${color}">${score ?? '-'}/5</span>
          </div>
          <div style="height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;" role="progressbar" aria-valuenow="${score ?? 0}" aria-valuemin="0" aria-valuemax="5" aria-label="${vraag.id.replace(/-/g, ' ')}: ${score ?? 0} van 5">
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
  { border: '#E2007A', fill: 'rgba(226, 0, 122, 0.15)' },
  { border: '#3786D2', fill: 'rgba(55, 134, 210, 0.15)' },
  { border: '#15803D', fill: 'rgba(21, 128, 61, 0.15)' },
  { border: '#C2410C', fill: 'rgba(194, 65, 12, 0.15)' },
];
