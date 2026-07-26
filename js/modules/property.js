import { formatCurrency } from './ui.js';
import { toggleWishlist, isInWishlist } from './wishlist.js';
import { toggleCompare, isInCompare } from './compare.js';
import { ROUTES, siteUrl } from '../config.js';
import { normalizeProperty } from './normalize.js';
import { icon } from './icons.js';

const PLACEHOLDER = siteUrl('favicon.svg');

export function renderPropertyCard(property) {
  property = normalizeProperty(property) || property;
  const badges = [];
  if (property.verified) badges.push('<span class="badge badge--verified">✓ Verified</span>');
  if (property.new) badges.push('<span class="badge badge--new">New</span>');
  if (property.featured) badges.push('<span class="badge badge--featured">Featured</span>');

  const wishlisted = isInWishlist(property.id);
  const compared = isInCompare(property.id);
  const img = property.image || property.images?.[0] || PLACEHOLDER;

  return `
    <article class="card card--interactive" data-property-id="${property.id}">
      <a href="${ROUTES.property}?id=${property.id}" class="card__image" aria-label="View ${property.title}">
        <img src="${img}" alt="${property.title}" loading="lazy" width="400" height="300">
        <div class="card__badges">${badges.join('')}</div>
        <div class="card__actions">
          <button type="button" class="btn btn--icon btn--ghost" data-wishlist="${property.id}" aria-label="${wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}" title="Save">${wishlisted ? icon('heartFilled') : icon('heart')}</button>
          <button type="button" class="btn btn--icon btn--ghost" data-compare="${property.id}" aria-label="${compared ? 'Remove from compare' : 'Add to compare'}" title="Compare">${icon('compare')}</button>
        </div>
      </a>
      <div class="card__body">
        <div class="card__price">${formatCurrency(property.rent)}<span>/month</span></div>
        <h3 class="card__title"><a href="${ROUTES.property}?id=${property.id}">${property.title}</a></h3>
        <div class="card__meta">
          <span class="card__meta-item">${icon('mapPin', 'icon--sm')} ${property.location}</span>
          ${property.distance ? `<span class="card__meta-item">${icon('walk', 'icon--sm')} ${property.distance}</span>` : ''}
          ${property.roomType ? `<span class="card__meta-item">${icon('bed', 'icon--sm')} ${property.roomType}</span>` : ''}
        </div>
      </div>
      <div class="card__footer">
        <span class="text-muted text-sm">${property.university || ''}</span>
        <a href="${ROUTES.property}?id=${property.id}" class="btn btn--sm btn--outline">View Details</a>
      </div>
    </article>`;
}

export function renderPropertyCards(container, properties) {
  if (!container) return;
  if (!properties?.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">${icon('home', 'icon--lg')}</div><p>No properties found. Try adjusting your filters.</p></div>`;
    return;
  }
  container.innerHTML = properties.map(renderPropertyCard).join('');
  bindCardActions(container);
}

function bindCardActions(container) {
  container.querySelectorAll('[data-wishlist]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.wishlist;
      toggleWishlist(id);
      btn.innerHTML = isInWishlist(id) ? icon('heartFilled') : icon('heart');
    });
  });

  container.querySelectorAll('[data-compare]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.compare;
      toggleCompare(id);
      btn.innerHTML = icon('compare');
      btn.classList.toggle('is-active', isInCompare(id));
    });
  });
}

export function getPropertyFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

export async function loadPropertyDetail(id) {
  const { default: api } = await import('./api.js');
  const data = await api.get(`/properties/${id}`);
  return normalizeProperty(data);
}

export function shareProperty(property) {
  const url = `${window.location.origin}/pages/property.html?id=${property.id}`;
  const text = `Check out ${property.title} on KampoStay — ${formatCurrency(property.rent)}/month`;

  if (navigator.share) {
    navigator.share({ title: property.title, text, url });
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
  }
}

export function whatsappLandlord(phone, property) {
  const msg = `Hi, I'm interested in ${property.title} listed on KampoStay (${formatCurrency(property.rent)}/month). Is it still available?`;
  window.open(`https://wa.me/${phone?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
}
