import { requireAuth, requireRole, logout, getUser, setUser } from '../modules/auth.js';
import { showToast, formatCurrency } from '../modules/ui.js';
import { initWishlistPage, syncWishlistFromApi } from '../modules/wishlist.js';
import { initComparePage } from '../modules/compare.js';
import { renderPropertyCards } from '../modules/property.js';
import { normalizeProperties } from '../modules/normalize.js';
import { initDashboardNavIcons, bindDashboardPanels } from '../modules/dashboard-nav.js';
import api from '../modules/api.js';
import { siteUrl } from '../config.js';

function fmtDate(d) {
  try {
    return new Date(d).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(d || '');
  }
}

async function loadBookings(el) {
  if (!el) return;
  el.innerHTML = '<p class="text-muted">Loading bookings…</p>';
  try {
    const payload = await api.get('/bookings', { limit: 20 }, { raw: true });
    const list = payload.bookings || payload.data || [];
    if (!list.length) {
      el.innerHTML = `<div class="glass-panel" style="padding:var(--space-6);"><p class="text-muted">No bookings yet.</p><a class="btn btn--primary btn--sm mt-4" href="${siteUrl('pages/search.html')}">Find a room</a></div>`;
      return;
    }
    el.innerHTML = list.map((b) => `
      <div class="glass-panel mb-4" style="padding:var(--space-6);">
        <p><strong>${b.property?.title || 'Property'}</strong> — ${b.type || 'booking'}</p>
        <p class="text-muted text-sm mt-2">${fmtDate(b.scheduledDate)} · ${formatCurrency(b.amount || 0)}</p>
        <span class="badge badge--verified mt-4">${b.status || 'pending'}</span>
      </div>`).join('');
  } catch (err) {
    el.innerHTML = `<p class="text-muted">${err.message || 'Could not load bookings.'}</p>`;
  }
}

async function loadPayments(el) {
  if (!el) return;
  el.innerHTML = '<p class="text-muted">Loading payments…</p>';
  try {
    const data = await api.get('/payments');
    const list = Array.isArray(data) ? data : data?.payments || data?.data || [];
    if (!list.length) {
      el.innerHTML = '<p class="text-muted">No payments recorded yet. Reserve a room from a property page.</p>';
      return;
    }
    el.innerHTML = `<ul style="list-style:none;padding:0;">${list.map((p) => `
      <li style="padding:var(--space-3) 0;border-bottom:1px solid var(--glass-border);">
        <strong>${formatCurrency(p.amount)}</strong> · ${p.method || 'payment'} · <span class="text-muted">${p.status}</span>
        <div class="text-sm text-muted">${fmtDate(p.createdAt)}</div>
      </li>`).join('')}</ul>`;
  } catch (err) {
    el.innerHTML = `<p class="text-muted">${err.message || 'Could not load payments.'}</p>`;
  }
}

async function loadMessages(el) {
  if (!el) return;
  el.innerHTML = '<p class="text-muted">Loading…</p>';
  try {
    const data = await api.get('/messages');
    const list = Array.isArray(data) ? data : data?.conversations || data?.data || [];
    el.innerHTML = list.length
      ? list.map((c) => {
        const name = c.participant?.profile?.firstName
          || c.otherUser?.profile?.firstName
          || c.lastMessage?.sender?.profile?.firstName
          || 'User';
        const text = c.lastMessage?.content || c.lastMessage?.text || 'Conversation';
        return `<p class="mb-4"><strong>${name}</strong><br><span class="text-muted text-sm">${text}</span></p>`;
      }).join('')
      : '<p class="text-muted">No messages yet. Contact a landlord from a property page.</p>';
  } catch (err) {
    el.innerHTML = `<p class="text-muted">${err.message || 'Could not load messages.'}</p>`;
  }
}

async function loadNotifications(el) {
  if (!el) return;
  el.innerHTML = '<p class="text-muted">Loading…</p>';
  try {
    const data = await api.get('/notifications');
    const list = Array.isArray(data) ? data : data?.data || [];
    if (!list.length) {
      el.innerHTML = '<p class="text-muted">No notifications yet.</p>';
      return;
    }
    el.innerHTML = list.map((n) => `
      <div class="glass-panel mb-4" style="padding:var(--space-4);">
        <strong>${n.title || 'Notice'}</strong>
        <p class="text-muted text-sm mt-2">${n.body || n.message || ''}</p>
        <time class="text-sm text-muted">${fmtDate(n.createdAt)}</time>
      </div>`).join('');
  } catch (err) {
    el.innerHTML = `<p class="text-muted">${err.message || 'Could not load notifications.'}</p>`;
  }
}

async function loadAiRecs(el) {
  if (!el) return;
  el.innerHTML = '<p class="text-muted">Loading…</p>';
  try {
    const data = await api.get('/properties/featured', { limit: 6 });
    const list = normalizeProperties(Array.isArray(data) ? data : data?.data || data || []);
    if (!list.length) {
      el.innerHTML = `<p class="text-muted">No featured listings yet.</p><a class="btn btn--sm btn--outline mt-4" href="${siteUrl('pages/search.html')}">Browse search</a>`;
      return;
    }
    renderPropertyCards(el, list.slice(0, 6));
  } catch (err) {
    el.innerHTML = `<p class="text-muted">${err.message || 'Could not load recommendations. Is the API running?'}</p>`;
  }
}

async function loadSavedSearches(el) {
  if (!el) return;
  try {
    const data = await api.get('/saved-searches');
    const list = Array.isArray(data) ? data : data?.data || [];
    if (!list.length) {
      el.innerHTML = `<p class="text-muted">No saved searches yet.</p><a class="btn btn--sm btn--outline mt-4" href="${siteUrl('pages/search.html')}">Search housing</a>`;
      return;
    }
    el.innerHTML = list.map((s) => `
      <p class="mb-4"><strong>${s.name || 'Saved search'}</strong>
      <a class="btn btn--sm btn--outline mt-2" href="${siteUrl('pages/search.html')}">Run</a></p>`).join('');
  } catch (err) {
    el.innerHTML = `<p class="text-muted">${err.message || 'Could not load saved searches.'}</p>`;
  }
}

async function loadReports(el) {
  if (!el) return;
  try {
    const data = await api.get('/reports');
    const list = Array.isArray(data) ? data : data?.data || [];
    if (!list.length) {
      el.innerHTML = `<p class="text-muted mb-4">You have not filed any reports yet.</p>
        <a class="btn btn--outline" href="${siteUrl('pages/safety.html')}">Safety &amp; refunds</a>`;
      return;
    }
    el.innerHTML = list.map((r) => `
      <div class="mb-4"><strong>${r.type || 'report'}</strong> — <span class="text-muted">${r.status || 'open'}</span>
      <p class="text-sm text-muted">${r.description || ''}</p></div>`).join('');
  } catch {
    el.innerHTML = `<p class="text-muted mb-4">Report a listing mismatch from a property page or safety hub.</p>
      <a class="btn btn--outline" href="${siteUrl('pages/safety.html')}">Safety &amp; refunds</a>`;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth() || !requireRole('student', siteUrl('pages/auth/login.html'))) return;
  const user = getUser();
  document.querySelector('[data-dashboard-name]')?.textContent = user?.firstName || user?.profile?.firstName || 'Student';

  initDashboardNavIcons();
  bindDashboardPanels();

  const form = document.getElementById('student-profile-form');
  if (form) {
    form.firstName.value = user?.firstName || user?.profile?.firstName || '';
    form.lastName.value = user?.lastName || user?.profile?.lastName || '';
    form.phone.value = user?.profile?.phone || '';
    form.city.value = user?.profile?.city || '';
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const updated = await api.patch('/auth/me', {
          profile: {
            firstName: form.firstName.value.trim(),
            lastName: form.lastName.value.trim(),
            phone: form.phone.value.trim(),
            city: form.city.value.trim(),
          },
        });
        setUser({ ...user, ...updated, firstName: updated?.profile?.firstName || form.firstName.value });
        showToast('Profile saved.', 'success');
      } catch (err) {
        showToast(err.message || 'Could not save profile.', 'error');
      }
    });
  }

  document.querySelector('[data-logout]')?.addEventListener('click', (e) => { e.preventDefault(); logout(); });

  await syncWishlistFromApi();
  initWishlistPage(document.getElementById('dash-favourites'));
  initComparePage(document.getElementById('dash-compare'));
  loadNotifications(document.getElementById('dash-notifications'));
  loadBookings(document.getElementById('dash-bookings'));
  loadPayments(document.getElementById('dash-payments'));
  loadMessages(document.getElementById('dash-messages'));
  loadAiRecs(document.getElementById('dash-ai-recs'));
  loadSavedSearches(document.getElementById('dash-saved-searches'));
  loadReports(document.getElementById('dash-reports'));

  const reviews = document.getElementById('dash-reviews');
  if (reviews) reviews.innerHTML = '<p class="text-muted">Write reviews from a property page after your stay. Your submitted reviews will appear against those listings.</p>';
});
