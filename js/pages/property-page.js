import { getPropertyFromURL, loadPropertyDetail, shareProperty, whatsappLandlord } from '../modules/property.js';
import { SUPPORT_PHONE } from '../config.js';
import { renderMapEmbed, initDirectionsButton, getUniversityCoords } from '../modules/maps.js';
import { formatCurrency, openModal, closeModal, showToast } from '../modules/ui.js';
import { toggleWishlist, isInWishlist } from '../modules/wishlist.js';
import { toggleCompare } from '../modules/compare.js';
import { isAuthenticated, requireAuth } from '../modules/auth.js';
import { ROUTES } from '../config.js';
import { icon } from '../modules/icons.js';
import api from '../modules/api.js';

function wishlistLabel(saved) {
  return `${saved ? icon('heartFilled') : icon('heart')} <span>${saved ? 'Saved' : 'Save'}</span>`;
}

function amenityIconList(labels) {
  return (labels || []).map((a) => `<div class="amenity">${icon('check', 'icon--sm')} ${a}</div>`).join('');
}

async function loadReviews(propertyId) {
  try {
    const data = await api.get(`/reviews/property/${propertyId}`);
    const list = Array.isArray(data) ? data : data?.reviews || data?.data || [];
    return list;
  } catch {
    return [];
  }
}

function renderReviews(list) {
  if (!list.length) {
    return `<p class="text-muted">No reviews yet. Be the first to review after your stay.</p>`;
  }
  return list.slice(0, 6).map((r) => {
    const name = [r.author?.profile?.firstName, r.author?.profile?.lastName].filter(Boolean).join(' ')
      || 'Student';
    const score = r.ratings?.overall || r.rating || '—';
    return `<div class="glass-panel testimonial">
      <blockquote class="testimonial__quote">"${(r.text || 'Great stay.').replace(/"/g, '&quot;')}"</blockquote>
      <div class="testimonial__author"><div>
        <div class="testimonial__name">${name}</div>
        <div class="testimonial__role">${score}/5 rating</div>
      </div></div>
    </div>`;
  }).join('');
}

function renderFacilities(property) {
  const nearby = property.nearbyFacilities || [];
  if (nearby.length) {
    return nearby.map((f) => `
      <div class="glass-panel" style="padding:var(--space-4);">
        <strong>${f.name || 'Facility'}</strong>
        <p class="text-sm text-muted mt-2">${f.type || 'nearby'} · ${f.walkingMinutes ? `${f.walkingMinutes} min walk` : `${f.distanceMeters || ''} m`}</p>
      </div>`).join('');
  }
  const emergency = property.emergencyContacts || [];
  if (emergency.length) {
    return emergency.map((c) => `
      <div class="glass-panel" style="padding:var(--space-4);">
        ${icon('shield')} <strong class="ml-2">${c.name || 'Contact'}</strong>
        <p class="text-sm text-muted mt-2">${c.relation || ''} · ${c.phone || ''}</p>
      </div>`).join('');
  }
  return `
    <div class="glass-panel" style="padding:var(--space-4);">${icon('hospital')} <strong class="ml-2">Campus clinic / hospital</strong><p class="text-sm text-muted mt-2">Ask landlord for the nearest facility during viewing.</p></div>
    <div class="glass-panel" style="padding:var(--space-4);">${icon('shield')} <strong>Police / security</strong><p class="text-sm text-muted mt-2">Prefer gated compounds and verified listings.</p></div>`;
}

document.addEventListener('DOMContentLoaded', async () => {
  const id = getPropertyFromURL();
  const property = await loadPropertyDetail(id);
  if (!property) {
    document.getElementById('property-content').innerHTML = `<div class="empty-state"><h2>Property not found</h2><a href="${ROUTES.search}" class="btn btn--primary mt-4">Back to Search</a></div>`;
    return;
  }

  document.title = `${property.title} — KampoStay`;
  const phone = property.landlordPhone || '+254712345678';
  const telHref = `tel:${phone.replace(/\s/g, '')}`;

  const images = property.images || [property.image];
  const gallery = document.getElementById('property-gallery');
  gallery.innerHTML = `
    <div class="property-gallery__main"><img src="${images[0]}" alt="${property.title}"></div>
    ${(images[1] ? `<div class="property-gallery__thumb"><img src="${images[1]}" alt=""></div>` : '')}
    ${(images[2] ? `<div class="property-gallery__thumb"><img src="${images[2]}" alt=""></div>` : '')}`;

  document.getElementById('property-header').innerHTML = `
    <div class="flex flex-wrap gap-4 items-center mb-4">
      ${property.verified ? `<span class="badge badge--verified">${icon('checkCircle', 'icon--sm')} Verified</span>` : ''}
      ${property.new ? '<span class="badge badge--new">New</span>' : ''}
      <span class="badge badge--refund">${icon('refund', 'icon--sm')} 100% mismatch refund</span>
    </div>
    <h1>${property.title}</h1>
    <p class="text-muted text-lg meta-line">${icon('mapPin', 'icon--sm')} ${property.location} · ${property.university || ''}</p>
    ${property.description ? `<p class="mt-4">${property.description}</p>` : ''}
    <div class="flex flex-wrap gap-4 mt-4">
      <button id="btn-wishlist" class="btn btn--outline btn--sm btn--with-icon">${wishlistLabel(isInWishlist(property.id))}</button>
      <button id="btn-compare" class="btn btn--outline btn--sm btn--with-icon">${icon('compare')} <span>Compare</span></button>
      <button id="btn-share" class="btn btn--outline btn--sm btn--with-icon">${icon('share')} <span>Share</span></button>
      <button id="btn-whatsapp" class="btn btn--accent btn--sm btn--with-icon">${icon('whatsapp')} <span>WhatsApp</span></button>
      <a id="btn-phone" href="${telHref}" class="btn btn--primary btn--sm btn--with-icon">${icon('phone')} <span>Call</span></a>
    </div>`;

  document.getElementById('amenities-grid').innerHTML = amenityIconList(property.amenityLabels);
  document.getElementById('house-rules').innerHTML = (property.houseRules || [])
    .map((r) => `<li style="padding:var(--space-2) 0;">${r}</li>`).join('');

  const lat = property.coords?.lat;
  const lng = property.coords?.lng;
  if (lat != null && lng != null) {
    renderMapEmbed(document.getElementById('property-map'), lat, lng, property.title);
    initDirectionsButton(document.getElementById('directions-btn'), null, null, lat, lng);
  } else {
    const coords = getUniversityCoords(property.university);
    renderMapEmbed(document.getElementById('property-map'), coords.lat, coords.lng, property.title);
    initDirectionsButton(document.getElementById('directions-btn'), null, null, coords.lat, coords.lng);
  }
  const dirBtn = document.getElementById('directions-btn');
  if (dirBtn) dirBtn.innerHTML = `${icon('walk')} <span>Get Walking Directions</span>`;

  const reviews = await loadReviews(property.id);
  document.getElementById('reviews-list').innerHTML = renderReviews(reviews);
  document.getElementById('emergency-list').innerHTML = renderFacilities(property);

  const deposit = property.deposit || property.rent;
  document.getElementById('booking-panel').innerHTML = `
    <div class="card__price" style="font-size:var(--text-3xl);">${formatCurrency(property.rent)}<span>/month</span></div>
    <p class="text-muted mt-4">Deposit: ${formatCurrency(deposit)}</p>
    <p class="text-muted">Room: ${property.roomType || 'Standard'} · ${property.distance || 'Near campus'}</p>
    <div class="pay-methods mt-6" aria-label="Accepted payment methods">
      <span class="pay-methods__label">Pay securely with</span>
      <div class="pay-methods__list">
        <span class="pay-chip">${icon('mpesa', 'icon--sm')} M-Pesa</span>
        <span class="pay-chip">${icon('creditCard', 'icon--sm')} Card</span>
        <span class="pay-chip">${icon('bank', 'icon--sm')} Bank</span>
      </div>
      <p class="text-muted" style="margin-top:0.5rem;">Paybill / Till: <strong>${SUPPORT_PHONE}</strong></p>
    </div>
    <div class="guarantee-box mt-6">
      ${icon('shield')}
      <div>
        <strong>100% refund guarantee</strong>
        <p class="text-sm text-muted">If you pay on KampoStay and the room is materially different from the listing, report within 48 hours of your first visit for a full refund.</p>
      </div>
    </div>
    <button id="btn-pay" class="btn btn--primary btn--lg mt-8" style="width:100%;">${icon('creditCard')} <span>Pay &amp; Reserve Room</span></button>
    <button id="btn-book" class="btn btn--outline mt-4" style="width:100%;">${icon('calendar')} <span>Book Viewing Only</span></button>`;

  document.getElementById('landlord-panel').innerHTML = `
    <h3>Landlord</h3>
    <p class="mt-4"><strong>${property.landlordName}</strong></p>
    <p class="text-muted text-sm">${property.landlordVerified ? 'Verified landlord' : 'Landlord on KampoStay'}${property.landlordPhone ? ` · ${property.landlordPhone}` : ''}</p>`;

  const payAmount = document.getElementById('pay-amount');
  const payProperty = document.getElementById('pay-property-title');
  if (payAmount) payAmount.textContent = formatCurrency(deposit);
  if (payProperty) payProperty.textContent = property.title;

  document.getElementById('btn-wishlist')?.addEventListener('click', async () => {
    await toggleWishlist(property.id);
    document.getElementById('btn-wishlist').innerHTML = wishlistLabel(isInWishlist(property.id));
  });
  document.getElementById('btn-compare')?.addEventListener('click', () => toggleCompare(property.id));
  document.getElementById('btn-share')?.addEventListener('click', () => shareProperty(property));
  document.getElementById('btn-whatsapp')?.addEventListener('click', () => whatsappLandlord(phone, property));
  document.getElementById('btn-book')?.addEventListener('click', () => {
    if (!isAuthenticated()) {
      requireAuth(window.location.href);
      return;
    }
    openModal('booking-modal');
  });
  document.getElementById('btn-pay')?.addEventListener('click', () => {
    if (!isAuthenticated()) {
      requireAuth(window.location.href);
      return;
    }
    openModal('payment-modal');
  });

  document.getElementById('booking-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const scheduledDate = fd.get('date') || fd.get('scheduledDate');
    const notes = fd.get('notes') || '';
    try {
      await api.post('/bookings', {
        propertyId: property.id,
        type: 'viewing',
        scheduledDate: scheduledDate ? new Date(String(scheduledDate)).toISOString() : new Date(Date.now() + 86400000).toISOString(),
        notes: String(notes),
      });
      closeModal('booking-modal');
      showToast('Viewing booked! Check your dashboard for confirmation.', 'success');
      form.reset();
    } catch (err) {
      showToast(err.message || 'Could not book viewing. Please log in as a student.', 'error');
    }
  });

  const paymentForm = document.getElementById('payment-form');
  paymentForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(paymentForm);
    const method = fd.get('method');
    const phoneInput = String(fd.get('phone') || '').trim();
    if (method === 'mpesa' && phoneInput.length < 9) {
      showToast('Enter a valid M-Pesa phone number.', 'error');
      return;
    }
    try {
      const booking = await api.post('/bookings', {
        propertyId: property.id,
        type: 'reservation',
        scheduledDate: new Date(Date.now() + 2 * 86400000).toISOString(),
        amount: deposit,
        notes: `Reserve via ${method}`,
      });
      const bookingId = booking?._id || booking?.id || booking?.data?._id;
      if (method === 'mpesa' || !method) {
        await api.post('/payments/stk-push', {
          phoneNumber: phoneInput || phone,
          amount: deposit,
          bookingId,
          description: `Deposit for ${property.title}`,
        });
        showToast('M-Pesa payment initiated. In demo/sandbox it may auto-complete — check Payments in your dashboard.', 'success');
      } else {
        showToast(`${method === 'card' ? 'Card' : 'Bank'} reservation recorded. Complete payment instructions will be emailed. Covered by 100% mismatch refund.`, 'success');
      }
      closeModal('payment-modal');
      paymentForm.reset();
    } catch (err) {
      showToast(err.message || 'Payment could not start. Log in as a student and try again.', 'error');
    }
  });

  paymentForm?.addEventListener('change', (e) => {
    if (e.target.name !== 'method') return;
    const mpesaField = document.getElementById('mpesa-phone-group');
    if (mpesaField) mpesaField.hidden = e.target.value !== 'mpesa';
  });

  if (window.QRCode) {
    const url = `${window.location.origin}${window.location.pathname}?id=${property.id}`;
    QRCode.toCanvas(document.getElementById('share-qr'), url, { width: 160 });
  }
});
