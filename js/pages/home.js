import { getFeaturedProperties, searchProperties } from '../modules/search.js';
import { renderPropertyCards } from '../modules/property.js';

document.addEventListener('DOMContentLoaded', async () => {
  const featuredEl = document.getElementById('featured-properties');
  const newEl = document.getElementById('new-properties');
  const verifiedEl = document.getElementById('verified-properties');

  const empty = (el, msg) => {
    if (el) el.innerHTML = `<p class="text-muted">${msg}</p>`;
  };

  try {
    const [featured, newest, verified] = await Promise.all([
      getFeaturedProperties(6),
      searchProperties({ sort: '-createdAt', limit: 6 }).then((r) => r.data),
      searchProperties({ verified: 'true', limit: 6 }).then((r) => r.data),
    ]);

    if (featured.length) renderPropertyCards(featuredEl, featured);
    else empty(featuredEl, 'No featured listings yet.');

    if (newest.length) renderPropertyCards(newEl, newest);
    else empty(newEl, 'No new listings yet.');

    if (verified.length) renderPropertyCards(verifiedEl, verified);
    else empty(verifiedEl, 'No verified listings yet.');
  } catch (err) {
    const msg = err.message || 'Could not load listings. Start the API (backend).';
    empty(featuredEl, msg);
    empty(newEl, msg);
    empty(verifiedEl, msg);
  }
});
