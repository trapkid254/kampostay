import { requireAuth, requireRole, logout } from '../modules/auth.js';
import { openModal, closeModal, showToast } from '../modules/ui.js';
import { initDashboardNavIcons, bindDashboardPanels } from '../modules/dashboard-nav.js';
import api from '../modules/api.js';
import { siteUrl } from '../config.js';

const PLACEHOLDER_IMG = `${siteUrl('favicon.svg')}`;

function formatMoney(n) {
  return `KSh ${Number(n || 0).toLocaleString('en-KE')}`;
}

function fmtDate(d) {
  try {
    return new Date(d).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(d || '');
  }
}

let cachedProperties = [];
let revenueChart;

async function loadUniversities(input) {
  if (!input) return;
  const datalist = document.getElementById('university-list');
  if (!datalist) return;
  try {
    const { INSTITUTIONS } = await import('../data/institutions.js');
    datalist.innerHTML = INSTITUTIONS.map((u) => `<option value="${u.name}" data-id="${u.key}">${u.name}</option>`).join('');
  } catch {
    datalist.innerHTML = '';
  }
}

async function loadMyProperties() {
  const container = document.getElementById('landlord-properties');
  if (!container) return;

  container.innerHTML = '<p class="text-muted">Loading your listings…</p>';
  try {
    const data = await api.get('/properties/mine', { limit: 50 });
    const list = Array.isArray(data) ? data : data?.properties || data?.data || [];
    cachedProperties = list;

    refreshPricingSelect();
    refreshMedia();
    refreshOccupancyAndAnalytics();

    if (!list.length) {
      container.innerHTML = '<p class="text-muted">No properties yet. Click <strong>+ Add Property</strong> to list your first room.</p>';
      return;
    }

    container.innerHTML = list.map((p) => {
      const id = p._id || p.id;
      const status = p.status || 'draft';
      const verified = p.verification?.status || 'pending';
      const img = p.primaryImage || p.media?.images?.[0]?.url || PLACEHOLDER_IMG;
      return `
          <div class="glass-panel" style="padding:var(--space-6);" data-property-id="${id}">
            <img src="${img}" alt="" style="width:100%;height:140px;object-fit:cover;border-radius:8px;margin-bottom:1rem;background:var(--color-bg-elevated);">
            <h3>${p.title}</h3>
            <p class="text-muted text-sm">${formatMoney(p.rent)}/mo · ${p.roomType || 'room'}</p>
            <p class="text-sm mt-2"><span class="badge">${status}</span> <span class="badge badge--${verified === 'verified' ? 'verified' : 'new'}">${verified}</span></p>
            <div class="flex gap-4 mt-4 flex-wrap">
              <a class="btn btn--sm btn--outline" href="${siteUrl('pages/property.html')}?id=${id}">View</a>
              <button type="button" class="btn btn--sm btn--ghost" data-delete-property="${id}">Archive</button>
              <button type="button" class="btn btn--sm btn--danger" data-delete-property-permanent="${id}">Delete</button>
            </div>
          </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = `<p class="text-muted">Could not load properties. ${err.message || 'Is the API running on port 5000?'}</p>`;
  }
}

function refreshPricingSelect() {
  const select = document.getElementById('pricing-property');
  if (!select) return;
  select.innerHTML = cachedProperties.length
    ? cachedProperties.map((p) => `<option value="${p._id || p.id}">${p.title} — ${formatMoney(p.rent)}</option>`).join('')
    : '<option value="">No properties yet</option>';
  const first = cachedProperties[0];
  if (first) {
    document.getElementById('pricing-rent').value = first.rent || '';
    document.getElementById('pricing-deposit').value = first.deposit ?? first.rent ?? '';
  }
}

function refreshMedia() {
  const el = document.getElementById('landlord-media');
  if (!el) return;
  const images = cachedProperties.flatMap((p) => {
    const imgs = p.media?.images || [];
    if (!imgs.length && (p.primaryImage || imgs[0]?.url)) {
      return [{ url: p.primaryImage || PLACEHOLDER_IMG, title: p.title }];
    }
    return imgs.map((img) => ({ url: img.url || PLACEHOLDER_IMG, title: p.title }));
  });
  if (!images.length) {
    el.innerHTML = '<p class="text-muted">No media yet. Add an image URL when creating a property, or edit listings later.</p>';
    return;
  }
  el.innerHTML = images.map((img) => `
    <div class="glass-panel" style="padding:var(--space-3);">
      <img src="${img.url}" alt="" style="width:100%;height:120px;object-fit:cover;border-radius:8px;background:var(--color-bg-elevated);">
      <p class="text-sm text-muted mt-2">${img.title || ''}</p>
    </div>`).join('');
}

async function refreshOccupancyAndAnalytics() {
  const published = cachedProperties.filter((p) => p.status === 'published' || p.status === 'active').length
    || cachedProperties.length;
  const views = cachedProperties.reduce((s, p) => s + (p.views || 0), 0);

  let bookings = [];
  try {
    const payload = await api.get('/bookings', { limit: 50 }, { raw: true });
    bookings = payload.bookings || payload.data || [];
  } catch {
    bookings = [];
  }

  const confirmed = bookings.filter((b) => b.status === 'confirmed' || b.status === 'completed').length;
  const pending = bookings.filter((b) => b.status === 'pending').length;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('occ-rate', String(confirmed));
  set('occ-active', String(published));
  set('occ-pending', String(pending));
  set('an-views', String(views));
  set('an-bookings', String(bookings.length));
  set('an-rating', String(cachedProperties.length));

  const cal = document.getElementById('landlord-calendar');
  if (cal) {
    const upcoming = bookings
      .filter((b) => b.scheduledDate && new Date(b.scheduledDate) >= new Date(Date.now() - 86400000))
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
    cal.innerHTML = upcoming.length
      ? upcoming.map((b) => `
        <div class="glass-panel mb-4" style="padding:var(--space-4);">
          <strong>${fmtDate(b.scheduledDate)}</strong>
          <p class="text-muted text-sm">${b.type || 'booking'} · ${b.property?.title || 'Property'} · ${b.status}</p>
        </div>`).join('')
      : '<p class="text-muted">No upcoming bookings on the calendar.</p>';
  }
}

async function loadMyBookings() {
  const el = document.getElementById('landlord-bookings');
  if (!el) return;
  el.innerHTML = '<p class="text-muted">Loading bookings…</p>';
  try {
    const payload = await api.get('/bookings', { limit: 30 }, { raw: true });
    const list = payload.bookings || payload.data || [];
    if (!list.length) {
      el.innerHTML = '<div class="glass-panel" style="padding:var(--space-6);"><p class="text-muted">No booking requests yet.</p></div>';
      return;
    }
    el.innerHTML = list.map((b) => {
      const id = b._id || b.id;
      const student = [b.student?.profile?.firstName, b.student?.profile?.lastName].filter(Boolean).join(' ') || 'Student';
      return `
        <div class="glass-panel mb-4" style="padding:var(--space-6);" data-booking-id="${id}">
          <p><strong>${b.type || 'booking'}</strong> — ${student} · ${b.property?.title || 'Property'}</p>
          <p class="text-muted text-sm mt-2">${fmtDate(b.scheduledDate)} · ${formatMoney(b.amount || 0)} · ${b.status}</p>
          ${b.status === 'pending' ? `<div class="flex gap-4 mt-4">
            <button type="button" class="btn btn--sm btn--primary" data-booking-status="${id}" data-status="confirmed">Accept</button>
            <button type="button" class="btn btn--sm btn--outline" data-booking-status="${id}" data-status="cancelled">Decline</button>
          </div>` : ''}
        </div>`;
    }).join('');
    await refreshOccupancyAndAnalytics();
  } catch (err) {
    el.innerHTML = `<p class="text-muted">${err.message || 'Could not load bookings.'}</p>`;
  }
}

async function loadMessages() {
  const el = document.getElementById('landlord-messages');
  if (!el) return;
  try {
    const data = await api.get('/messages');
    const list = Array.isArray(data) ? data : data?.data || [];
    el.innerHTML = list.length
      ? list.map((c) => `<p class="mb-4"><strong>${c.participant?.profile?.firstName || 'User'}</strong><br><span class="text-muted text-sm">${c.lastMessage?.content || c.lastMessage?.text || 'Conversation'}</span></p>`).join('')
      : '<p class="text-muted">No messages yet.</p>';
  } catch (err) {
    el.innerHTML = `<p class="text-muted">${err.message || 'Could not load messages.'}</p>`;
  }
}

async function loadReviews() {
  const el = document.getElementById('landlord-reviews');
  if (!el) return;
  el.innerHTML = '<p class="text-muted">Loading…</p>';
  try {
    const data = await api.get('/reviews');
    const list = Array.isArray(data) ? data : data?.data || [];
    if (!list.length) {
      el.innerHTML = '<p class="text-muted">No reviews on your listings yet.</p>';
      return;
    }
    el.innerHTML = list.map((r) => {
      const id = r._id || r.id;
      const stars = r.ratings?.overall || r.rating || '—';
      const reply = r.landlordReply?.text
        ? `<p class="text-sm mt-2"><em>Your reply:</em> ${r.landlordReply.text}</p>`
        : `<div class="mt-4"><textarea class="form-textarea" data-reply-text="${id}" rows="2" placeholder="Write a reply…"></textarea>
           <button type="button" class="btn btn--primary btn--sm mt-2" data-reply="${id}">Reply</button></div>`;
      return `<div class="glass-panel mb-4" style="padding:var(--space-6);">
        <p><strong>${r.property?.title || 'Property'}</strong> · ${stars}/5</p>
        <p class="mt-2">${r.text || ''}</p>
        ${reply}
      </div>`;
    }).join('');
  } catch (err) {
    el.innerHTML = `<p class="text-muted">${err.message || 'Could not load reviews.'}</p>`;
  }
}

async function loadRevenueChart() {
  const summary = document.getElementById('revenue-summary');
  const ctx = document.getElementById('revenue-chart');
  try {
    const data = await api.get('/payments');
    const list = Array.isArray(data) ? data : data?.data || data?.payments || [];
    const completed = list.filter((p) => p.status === 'completed' || p.status === 'success');
    const total = completed.reduce((s, p) => s + Number(p.amount || 0), 0);
    if (summary) summary.textContent = completed.length
      ? `Completed payments: ${formatMoney(total)} (${completed.length} transactions)`
      : 'No completed payments yet.';

    if (!ctx || !window.Chart) return;
    const byMonth = {};
    completed.forEach((p) => {
      const d = new Date(p.completedAt || p.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + Number(p.amount || 0);
    });
    const labels = Object.keys(byMonth).sort();
    const values = labels.map((k) => byMonth[k]);
    if (revenueChart) revenueChart.destroy();
    revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['No data'],
        datasets: [{
          label: 'Revenue (KSh)',
          data: labels.length ? values : [0],
          borderColor: '#0B3D2E',
          backgroundColor: 'rgba(11,61,46,0.1)',
          fill: true,
        }],
      },
      options: { responsive: true, maintainAspectRatio: false },
    });
  } catch (err) {
    if (summary) summary.textContent = err.message || 'Could not load revenue.';
  }
}

async function uploadImage(file) {
  if (!file) return null;
  const formData = new FormData();
  formData.append('file', file);
  try {
    const response = await fetch(`${api.baseUrl}/uploads/image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('kampostay-token')}`,
      },
      body: formData,
    });
    const data = await response.json();
    return data.data?.url || data.data?.secure_url;
  } catch (err) {
    console.error('Image upload failed:', err);
    return null;
  }
}

async function uploadMultipleImages(files) {
  const uploadPromises = files.map(file => uploadImage(file));
  const urls = await Promise.all(uploadPromises);
  return urls.filter(Boolean);
}

let imageSlotCount = 1;

window.addImageSlot = function() {
  if (imageSlotCount >= 5) {
    showToast('Maximum 5 images allowed', 'error');
    return;
  }
  imageSlotCount++;
  const container = document.getElementById('image-upload-container');
  const slot = document.createElement('div');
  slot.className = 'image-upload-slot mt-2';
  slot.innerHTML = `
    <input id="property-image-${imageSlotCount}" name="imageFile${imageSlotCount}" type="file" class="form-input" accept="image/*">
    <button type="button" class="btn btn--sm btn--ghost mt-2 text-danger" onclick="removeImageSlot(${imageSlotCount}, this)">Remove</button>
  `;
  container.appendChild(slot);
};

window.removeImageSlot = function(id, button) {
  const slot = button.parentElement;
  slot.remove();
  imageSlotCount--;
};

async function buildPropertyPayload(fd, extra = {}) {
  const amenities = {
    wifi: fd.get('wifi') === 'on',
    water: fd.get('water') === 'on',
    furnished: fd.get('furnished') === 'on',
    parking: fd.get('parking') === 'on',
    laundry: fd.get('laundry') === 'on',
    kitchen: fd.get('kitchen') === 'on',
    electricityType: 'prepaid',
    bathrooms: 1,
    genderRestriction: 'none',
  };
  const lng = Number(fd.get('lng') || 36.8219);
  const lat = Number(fd.get('lat') || -1.2921);

  // Collect all image files
  const imageFiles = [];
  for (let i = 1; i <= 5; i++) {
    const file = fd.get(`imageFile${i}`);
    if (file && file.size > 0) {
      imageFiles.push(file);
    }
  }

  // Upload all images
  const uploadedImageUrls = await uploadMultipleImages(imageFiles);

  // Find university ID from name if needed
  const universityName = fd.get('university');
  const datalist = document.getElementById('university-list');
  let universityId = universityName;
  if (datalist) {
    const option = Array.from(datalist.options).find(opt => opt.value === universityName);
    if (option && option.dataset.id) {
      universityId = option.dataset.id;
    }
  }

  // Build media images array with first image as primary
  const mediaImages = uploadedImageUrls.map((url, index) => ({
    url,
    isPrimary: index === 0
  }));

  return {
    ...extra,
    title: String(fd.get('title') || '').trim(),
    description: String(fd.get('description') || '').trim(),
    university: universityId,
    rent: Number(fd.get('rent')),
    deposit: Number(fd.get('deposit') || fd.get('rent') || 0),
    roomType: fd.get('roomType'),
    roomSize: 12,
    walkingTimeMinutes: Number(fd.get('walkingTimeMinutes') || 15),
    distanceFromCampus: 1,
    amenities,
    location: {
      address: String(fd.get('address') || '').trim(),
      estate: String(fd.get('estate') || '').trim(),
      city: String(fd.get('city') || 'Nairobi').trim(),
      county: String(fd.get('county') || 'Nairobi').trim(),
      coordinates: { type: 'Point', coordinates: [lng, lat] },
    },
    media: {
      images: mediaImages,
    },
    houseRules: String(fd.get('houseRules') || '').split('\n').map((r) => r.trim()).filter(Boolean),
    status: 'published',
    publishedAt: new Date().toISOString(),
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth() || !requireRole('landlord', siteUrl('pages/auth/login.html'))) return;

  initDashboardNavIcons();
  bindDashboardPanels(async (panel) => {
    if (panel === 'bookings') await loadMyBookings();
    if (panel === 'messages') await loadMessages();
    if (panel === 'reviews') await loadReviews();
    if (panel === 'revenue') await loadRevenueChart();
    if (panel === 'media') refreshMedia();
    if (panel === 'occupancy' || panel === 'analytics' || panel === 'calendar') await refreshOccupancyAndAnalytics();
  });

  document.querySelector('[data-logout]')?.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });

  await loadUniversities(document.getElementById('property-university'));
  await loadMyProperties();
  await loadMyBookings();

  document.getElementById('pricing-property')?.addEventListener('change', (e) => {
    const p = cachedProperties.find((x) => String(x._id || x.id) === e.target.value);
    if (!p) return;
    document.getElementById('pricing-rent').value = p.rent || '';
    document.getElementById('pricing-deposit').value = p.deposit ?? '';
  });

  document.getElementById('pricing-save')?.addEventListener('click', async () => {
    const id = document.getElementById('pricing-property')?.value;
    if (!id) {
      showToast('Add a property first.', 'error');
      return;
    }
    try {
      await api.patch(`/properties/${id}`, {
        rent: Number(document.getElementById('pricing-rent').value),
        deposit: Number(document.getElementById('pricing-deposit').value),
      });
      showToast('Pricing updated.', 'success');
      await loadMyProperties();
    } catch (err) {
      showToast(err.message || 'Could not update pricing.', 'error');
    }
  });

  document.getElementById('landlord-bookings')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-booking-status]');
    if (!btn) return;
    try {
      await api.patch(`/bookings/${btn.dataset.bookingStatus}/status`, { status: btn.dataset.status });
      showToast(`Booking ${btn.dataset.status}.`, 'success');
      await loadMyBookings();
    } catch (err) {
      showToast(err.message || 'Could not update booking.', 'error');
    }
  });

  document.getElementById('landlord-reviews')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-reply]');
    if (!btn) return;
    const text = document.querySelector(`[data-reply-text="${btn.dataset.reply}"]`)?.value?.trim();
    if (!text) {
      showToast('Write a reply first.', 'error');
      return;
    }
    try {
      await api.post(`/reviews/${btn.dataset.reply}/reply`, { text });
      showToast('Reply posted.', 'success');
      await loadReviews();
    } catch (err) {
      showToast(err.message || 'Could not reply.', 'error');
    }
  });

  document.querySelector('[data-add-property]')?.addEventListener('click', () => openModal('add-property-modal'));

  document.getElementById('landlord-properties')?.addEventListener('click', async (e) => {
    const permBtn = e.target.closest('[data-delete-property-permanent]');
    if (permBtn) {
      if (!confirm('Permanently delete this property? This cannot be undone.')) return;
      try {
        await api.delete(`/properties/${permBtn.dataset.deletePropertyPermanent}?permanent=true`);
        showToast('Property permanently deleted.', 'success');
        await loadMyProperties();
      } catch (err) {
        showToast(err.message || 'Could not delete property.', 'error');
      }
      return;
    }

    const btn = e.target.closest('[data-delete-property]');
    if (!btn) return;
    if (!confirm('Archive this property?')) return;
    try {
      await api.delete(`/properties/${btn.dataset.deleteProperty}`);
      showToast('Property archived.', 'success');
      await loadMyProperties();
    } catch (err) {
      showToast(err.message || 'Could not archive property.', 'error');
    }
  });

  const form = document.getElementById('add-property-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    
    // Validate at least one image is uploaded
    let hasImage = false;
    for (let i = 1; i <= 5; i++) {
      const file = fd.get(`imageFile${i}`);
      if (file && file.size > 0) {
        hasImage = true;
        break;
      }
    }
    if (!hasImage) {
      showToast('Please upload at least 1 image.', 'error');
      return;
    }
    
    const payload = await buildPropertyPayload(fd);
    console.log('Property payload:', payload);
    
    if (!payload.title || !payload.description || !payload.university || !payload.rent || !payload.roomType) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
    const submitBtn = document.querySelector('button[form="add-property-form"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving…';
    }
    try {
      await api.post('/properties', payload);
      showToast('Property submitted and published! It is now visible on the site.', 'success');
      form.reset();
      // Reset image slots to initial state
      resetImageSlots();
      closeModal('add-property-modal');
      await loadMyProperties();
    } catch (err) {
      console.error('Property creation error:', err);
      showToast(err.message || 'Could not create property.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit listing';
      }
    }
  });

  function resetImageSlots() {
    const container = document.getElementById('image-upload-container');
    container.innerHTML = `
      <div class="image-upload-slot">
        <input id="property-image-1" name="imageFile1" type="file" class="form-input" accept="image/*" required>
        <button type="button" class="btn btn--sm btn--ghost mt-2" onclick="addImageSlot()">+ Add another image</button>
      </div>
    `;
    imageSlotCount = 1;
  }
});
