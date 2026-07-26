import api from './api.js';
import { debounce } from './ui.js';
import { renderPropertyCards } from './property.js';
import { normalizeProperties } from './normalize.js';
import { ROUTES } from '../config.js';

export async function searchProperties(filters = {}) {
  const payload = await api.get('/properties/search', filters, { raw: true });
  const list = payload.data || payload.properties || [];
  return {
    data: normalizeProperties(list),
    total: payload.total ?? payload.pagination?.total ?? list.length,
    pagination: payload.pagination,
  };
}

export async function getFeaturedProperties(limit = 6) {
  const data = await api.get('/properties/featured', { limit });
  return normalizeProperties(Array.isArray(data) ? data : data?.data || []);
}

export function collectFilters(form) {
  if (!form) return {};
  const fd = new FormData(form);
  const filters = {};
  for (const [key, value] of fd.entries()) {
    if (value !== '' && value !== null) filters[key] = value;
  }
  return filters;
}

export function initSearchForm(formSelector, resultsSelector) {
  const form = document.querySelector(formSelector);
  const results = document.querySelector(resultsSelector);
  if (!form) return;

  const doSearch = debounce(async () => {
    const filters = collectFilters(form);
    if (results) {
      results.innerHTML = '<p class="text-muted">Searching...</p>';
      try {
        const response = await searchProperties(filters);
        renderPropertyCards(results, response.data || response);
      } catch (err) {
        results.innerHTML = `<p class="text-muted">${err.message || 'Search failed. Is the API running?'}</p>`;
      }
    }
  }, 400);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    doSearch();
  });

  form.querySelectorAll('input, select').forEach((el) => {
    el.addEventListener('change', doSearch);
  });

  form.querySelectorAll('.filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('is-active');
      const input = chip.querySelector('input');
      if (input) input.checked = chip.classList.contains('is-active');
      doSearch();
    });
  });
}

export function initHeroSearch() {
  const form = document.getElementById('hero-search-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const filters = collectFilters(form);
    const params = new URLSearchParams(filters);
    window.location.href = `${ROUTES.search}?${params}`;
  });
}

export function loadSearchFromURL(form) {
  const params = new URLSearchParams(window.location.search);
  if (!form) return params;

  params.forEach((value, key) => {
    const field = form.querySelector(`[name="${key}"]`);
    if (field) {
      if (field.type === 'checkbox') field.checked = value === 'true';
      else field.value = value;
    }
  });

  return params;
}

export function initAdvancedFilters() {
  const form = document.getElementById('advanced-search-form');
  if (!form) return;

  loadSearchFromURL(form);
  initSearchForm('#advanced-search-form', '#search-results');

  searchProperties(collectFilters(form))
    .then((response) => {
      const container = document.getElementById('search-results');
      const data = response.data || response;
      if (container) renderPropertyCards(container, data);
      const countEl = document.getElementById('results-count');
      if (countEl) countEl.textContent = `${Array.isArray(data) ? data.length : data?.length || 0} properties found`;
    })
    .catch((err) => {
      const container = document.getElementById('search-results');
      if (container) container.innerHTML = `<p class="text-muted">${err.message || 'Could not load search results.'}</p>`;
    });
}
