import { STORAGE_KEYS, siteUrl } from '../config.js';
import { showToast } from './ui.js';
import { icon } from './icons.js';
import api from './api.js';
import { normalizeProperties } from './normalize.js';

const MAX_COMPARE = 3;

function getCompareList() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.compare) || '[]');
  } catch {
    return [];
  }
}

function saveCompareList(list) {
  localStorage.setItem(STORAGE_KEYS.compare, JSON.stringify(list));
}

export function isInCompare(id) {
  return getCompareList().includes(String(id));
}

export function toggleCompare(id) {
  const list = getCompareList();
  const sid = String(id);
  const idx = list.indexOf(sid);

  if (idx >= 0) {
    list.splice(idx, 1);
    showToast('Removed from compare', 'info');
  } else {
    if (list.length >= MAX_COMPARE) {
      showToast(`You can compare up to ${MAX_COMPARE} properties`, 'warning');
      return list;
    }
    list.push(sid);
    showToast('Added to compare', 'success');
  }

  saveCompareList(list);
  updateCompareCount();
  return list;
}

export function updateCompareCount() {
  const count = getCompareList().length;
  document.querySelectorAll('[data-compare-count]').forEach((el) => {
    el.textContent = count;
    el.hidden = count === 0;
  });
}

async function fetchByIds(ids) {
  const results = [];
  await Promise.all(ids.map(async (id) => {
    try {
      const raw = await api.get(`/properties/${id}`);
      if (raw) results.push(raw);
    } catch { /* skip */ }
  }));
  return normalizeProperties(results);
}

export async function initComparePage(container) {
  if (!container) return;
  const ids = getCompareList();

  if (!ids.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">${icon('compare', 'icon--lg')}</div><p>No properties to compare. Add up to 3 listings.</p><a href="${siteUrl('pages/search.html')}" class="btn btn--primary mt-4">Browse Properties</a></div>`;
    return;
  }

  container.innerHTML = '<p class="text-muted">Loading comparison…</p>';
  const { formatCurrency } = await import('./ui.js');
  const properties = await fetchByIds(ids);
  if (!properties.length) {
    container.innerHTML = `<p class="text-muted">Could not load compared listings from the API.</p>`;
    return;
  }

  const rows = [
    ['Rent', ...properties.map((p) => `${formatCurrency(p.rent)}/mo`)],
    ['Location', ...properties.map((p) => p.location)],
    ['Room Type', ...properties.map((p) => p.roomType || '—')],
    ['Distance', ...properties.map((p) => p.distance || '—')],
    ['Verified', ...properties.map((p) => (p.verified ? '✓ Yes' : 'No'))],
    ['University', ...properties.map((p) => p.university || '—')],
    ['Amenities', ...properties.map((p) => (p.amenityLabels || []).slice(0, 4).join(', ') || '—')],
  ];

  container.innerHTML = `
    <div class="glass-panel table-wrap">
      <table class="compare-table">
        <thead>
          <tr>
            <th>Feature</th>
            ${properties.map((p) => `<th><a href="${siteUrl('pages/property.html')}?id=${p.id}">${p.title}</a></th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(([label, ...vals]) => `
            <tr><td><strong>${label}</strong></td>${vals.map((v) => `<td>${v}</td>`).join('')}</tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}
