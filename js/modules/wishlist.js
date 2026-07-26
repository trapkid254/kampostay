import { STORAGE_KEYS, siteUrl } from '../config.js';
import { showToast } from './ui.js';
import { icon } from './icons.js';
import { isAuthenticated } from './auth.js';
import api from './api.js';
import { normalizeProperties } from './normalize.js';

function getLocalWishlist() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.wishlist) || '[]');
  } catch {
    return [];
  }
}

function saveLocalWishlist(list) {
  localStorage.setItem(STORAGE_KEYS.wishlist, JSON.stringify(list));
}

export function isInWishlist(id) {
  return getLocalWishlist().includes(String(id));
}

export async function toggleWishlist(id) {
  const list = getLocalWishlist();
  const sid = String(id);
  const idx = list.indexOf(sid);
  const removing = idx >= 0;

  if (removing) list.splice(idx, 1);
  else list.push(sid);
  saveLocalWishlist(list);
  updateWishlistCount();

  if (isAuthenticated()) {
    try {
      if (removing) await api.delete(`/wishlist/${sid}`);
      else await api.post(`/wishlist/${sid}`);
    } catch {
      /* keep local copy even if API fails */
    }
  }

  showToast(removing ? 'Removed from wishlist' : 'Saved to wishlist', removing ? 'info' : 'success');
  return list;
}

export function updateWishlistCount() {
  const count = getLocalWishlist().length;
  document.querySelectorAll('[data-wishlist-count]').forEach((el) => {
    el.textContent = count;
    el.hidden = count === 0;
  });
}

export async function syncWishlistFromApi() {
  if (!isAuthenticated()) return getLocalWishlist();
  try {
    const data = await api.get('/wishlist');
    const rows = Array.isArray(data) ? data : data?.items || data?.data || [];
    const ids = rows.map((row) => String(row.property?._id || row.property?.id || row.property || row._id || '')).filter(Boolean);
    if (ids.length) saveLocalWishlist([...new Set([...getLocalWishlist(), ...ids])]);
  } catch {
    /* ignore */
  }
  updateWishlistCount();
  return getLocalWishlist();
}

async function fetchPropertiesByIds(ids) {
  const results = [];
  await Promise.all(ids.map(async (id) => {
    try {
      const raw = await api.get(`/properties/${id}`);
      if (raw) results.push(raw);
    } catch {
      /* skip missing */
    }
  }));
  return normalizeProperties(results);
}

export async function initWishlistPage(container) {
  if (!container) return;
  await syncWishlistFromApi();
  const ids = getLocalWishlist();

  if (!ids.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">${icon('heart', 'icon--lg')}</div><p>Your wishlist is empty. Start saving properties you love!</p><a href="${siteUrl('pages/search.html')}" class="btn btn--primary mt-4">Browse Properties</a></div>`;
    return;
  }

  container.innerHTML = '<p class="text-muted">Loading saved properties…</p>';
  const properties = await fetchPropertiesByIds(ids);

  if (!properties.length) {
    container.innerHTML = `<div class="empty-state"><p class="text-muted">Saved listings could not be loaded from the API.</p><a href="${siteUrl('pages/search.html')}" class="btn btn--primary mt-4">Browse Properties</a></div>`;
    return;
  }

  const { renderPropertyCards } = await import('./property.js');
  renderPropertyCards(container, properties);
}
