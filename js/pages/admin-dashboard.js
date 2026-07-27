import { requireAuth, requireRole, logout } from '../modules/auth.js';
import { openModal, closeModal, showToast, formatCurrency } from '../modules/ui.js';
import { initDashboardNavIcons, bindDashboardPanels } from '../modules/dashboard-nav.js';
import api from '../modules/api.js';
import { siteUrl } from '../config.js';

function userName(u) {
  const first = u.profile?.firstName || u.firstName || '';
  const last = u.profile?.lastName || u.lastName || '';
  return `${first} ${last}`.trim() || u.email;
}

function fmtDate(d) {
  try {
    return new Date(d).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(d || '');
  }
}

let overviewChart;

async function loadUniversities(select) {
  if (!select) return;
  try {
    const data = await api.get('/universities', { limit: 100 });
    const list = Array.isArray(data) ? data : data?.data || [];
    select.innerHTML = '<option value="">Select university…</option>'
      + list.map((u) => `<option value="${u._id || u.id}">${u.name}</option>`).join('');
  } catch {
    select.innerHTML = '<option value="">Could not load universities</option>';
  }
}

async function loadLandlordsSelect(select) {
  if (!select) return;
  try {
    const payload = await api.get('/users', { role: 'landlord', limit: 100 }, { raw: true });
    const users = payload.data || payload.users || [];
    select.innerHTML = '<option value="">Select landlord…</option>'
      + users.map((u) => `<option value="${u._id || u.id}">${userName(u)} (${u.email})</option>`).join('');
  } catch {
    select.innerHTML = '<option value="">Could not load landlords</option>';
  }
}

async function loadUsers(role = '') {
  const tableId = role === 'landlord' ? 'admin-landlords-table' : 'admin-users-table';
  const tbody = document.querySelector(`#${tableId} tbody`);
  const countEl = document.getElementById('admin-users-count');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5">Loading…</td></tr>';
  try {
    const params = { limit: 50 };
    if (role) params.role = role;
    const payload = await api.get('/users', params, { raw: true });
    const users = payload.data || payload.users || payload || [];
    const total = payload.pagination?.total ?? users.length;
    if (countEl && role !== 'landlord') countEl.textContent = `${total} registered`;

    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="5">No users found.</td></tr>';
      return;
    }

    tbody.innerHTML = users.map((u) => {
      const id = u._id || u.id;
      const active = u.isActive !== false;
      return `<tr data-user-id="${id}">
        <td>${userName(u)}</td>
        <td>${u.email}</td>
        <td>${u.role}</td>
        <td>${active ? 'Active' : 'Suspended'}</td>
        <td>
          ${active && u.role !== 'admin' ? `<button type="button" class="btn btn--sm btn--outline" data-suspend="${id}">Suspend</button>` : '—'}
        </td>
      </tr>`;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5">${err.message || 'Failed to load users. Is the API running?'}</td></tr>`;
  }
}

async function loadPendingProperties() {
  const container = document.getElementById('admin-properties-list');
  if (!container) return;
  container.innerHTML = '<p class="text-muted">Loading listings…</p>';

  try {
    const payload = await api.get('/properties/search', { status: 'draft', limit: 50 }, { raw: true });
    let list = payload?.data || payload?.properties || [];
    if (!list.length) {
      const pending = await api.get('/properties/search', { limit: 50 }, { raw: true }).catch(() => ({ data: [] }));
      list = (pending.data || pending.properties || []).filter(
        (p) => p.status === 'draft' || p.verification?.status === 'pending'
      );
    }

    if (!list.length) {
      container.innerHTML = '<p class="text-muted">No pending draft listings. Use <strong>+ Add Property</strong> to create one for a landlord.</p>';
      return;
    }

    container.innerHTML = list.map((p) => {
      const id = p._id || p.id;
      const img = p.primaryImage || p.media?.images?.[0]?.url || 'https://via.placeholder.com/400x300?text=No+Image';
      return `<div class="glass-panel" style="padding:var(--space-6);margin-bottom:var(--space-4);">
        <div class="flex gap-4">
          <img src="${img}" alt="" style="width:120px;height:90px;object-fit:cover;border-radius:8px;background:var(--color-bg-elevated);">
          <div style="flex:1;">
            <h3>${p.title}</h3>
            <p class="text-muted text-sm">KSh ${Number(p.rent || 0).toLocaleString()}/mo · ${p.status || 'draft'} · ${p.verification?.status || 'pending'}</p>
            <div class="flex gap-4 mt-4">
              <button type="button" class="btn btn--sm btn--primary" data-verify="${id}">Verify &amp; Publish</button>
              <a class="btn btn--sm btn--outline" href="${siteUrl('pages/property.html')}?id=${id}">Preview</a>
            </div>
          </div>
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = `<p class="text-muted">${err.message || 'Could not load properties.'}</p>`;
  }
}

async function loadOverviewStats() {
  try {
    const stats = await api.get('/admin/dashboard');
    const s = stats?.data || stats || {};
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val ?? '—';
    };
    const users = s.users?.total ?? s.totalUsers ?? 0;
    const landlords = s.users?.landlords ?? s.landlords ?? 0;
    const properties = s.properties?.published ?? s.properties?.total ?? 0;
    const bookings = s.bookings?.total ?? s.totalBookings ?? 0;
    set('stat-users', users);
    set('stat-landlords', landlords);
    set('stat-properties', properties);
    set('stat-bookings', bookings);

  const analyticsCtx = document.getElementById('admin-analytics-chart');
  if (analyticsCtx && window.Chart) {
      if (overviewChart) overviewChart.destroy();
      overviewChart = new Chart(analyticsCtx, {
      type: 'bar',
      data: {
        labels: ['Users', 'Landlords', 'Properties', 'Bookings'],
          datasets: [{
            label: 'Platform Metrics',
            data: [users, landlords, properties, bookings],
            backgroundColor: ['#0B3D2E', '#145A44', '#D4A017', '#1A6B52'],
          }],
      },
      options: { responsive: true, maintainAspectRatio: false },
    });
  }
  } catch {
    // keep placeholders
  }
}

async function loadUniversitiesPanel() {
  const el = document.getElementById('admin-universities');
  if (!el) return;
  try {
    const data = await api.get('/universities', { limit: 100 });
    const list = Array.isArray(data) ? data : data?.data || [];
    el.innerHTML = list.length
      ? list.map((u) => `<span class="badge badge--featured">${u.name}</span>`).join('')
      : '<p class="text-muted">No universities yet.</p>';
  } catch (err) {
    el.innerHTML = `<p class="text-muted">${err.message || 'Could not load universities.'}</p>`;
  }
}

async function loadBookings() {
  const el = document.getElementById('admin-bookings');
  if (!el) return;
  el.innerHTML = '<p class="text-muted">Loading…</p>';
  try {
    const payload = await api.get('/bookings', { limit: 50 }, { raw: true });
    const list = payload.bookings || payload.data || [];
    el.innerHTML = list.length
      ? list.map((b) => `<div class="glass-panel mb-4" style="padding:var(--space-4);">
          <strong>${b.property?.title || 'Property'}</strong> · ${b.status}
          <p class="text-sm text-muted">${fmtDate(b.scheduledDate)} · ${formatCurrency(b.amount || 0)}</p>
        </div>`).join('')
      : '<p class="text-muted">No bookings in the database.</p>';
  } catch (err) {
    el.innerHTML = `<p class="text-muted">${err.message || 'Could not load bookings.'}</p>`;
  }
}

async function loadPayments() {
  const el = document.getElementById('admin-payments');
  if (!el) return;
  try {
    const data = await api.get('/payments');
    const list = Array.isArray(data) ? data : data?.data || [];
    el.innerHTML = list.length
      ? `<ul style="list-style:none;padding:0;">${list.map((p) => `
        <li style="padding:var(--space-3) 0;border-bottom:1px solid var(--glass-border);">
          <strong>${formatCurrency(p.amount)}</strong> · ${p.method || 'payment'} · ${p.status}
          <div class="text-sm text-muted">${fmtDate(p.createdAt)}</div>
        </li>`).join('')}</ul>`
      : '<p class="text-muted">No payments recorded.</p>';
  } catch (err) {
    el.innerHTML = `<p class="text-muted">${err.message || 'Could not load payments.'}</p>`;
  }
}

async function loadReviews() {
  const el = document.getElementById('admin-reviews');
  if (!el) return;
  try {
    const data = await api.get('/reviews');
    const list = Array.isArray(data) ? data : data?.data || [];
    el.innerHTML = list.length
      ? list.map((r) => `<div class="glass-panel mb-4" style="padding:var(--space-4);">
          <strong>${r.property?.title || 'Property'}</strong> · ${r.ratings?.overall || '—'}/5
          <p class="mt-2">${r.text || ''}</p>
          <p class="text-sm text-muted">${userName(r.author || {})} · ${fmtDate(r.createdAt)}</p>
        </div>`).join('')
      : '<p class="text-muted">No reviews yet.</p>';
  } catch (err) {
    el.innerHTML = `<p class="text-muted">${err.message || 'Could not load reviews.'}</p>`;
  }
}

async function loadReports() {
  const el = document.getElementById('admin-reports');
  if (!el) return;
  try {
    const data = await api.get('/reports');
    const list = Array.isArray(data) ? data : data?.data || [];
    el.innerHTML = list.length
      ? list.map((r) => {
        const id = r._id || r.id;
        return `<div class="glass-panel mb-4" style="padding:var(--space-4);">
          <strong>${r.type || 'report'}</strong> · ${r.status || 'open'}
          <p class="text-sm mt-2">${r.description || ''}</p>
          ${r.status === 'open' || r.status === 'investigating' ? `
            <button type="button" class="btn btn--sm btn--outline mt-2" data-resolve-report="${id}">Mark resolved</button>` : ''}
        </div>`;
      }).join('')
      : '<p class="text-muted">No open reports.</p>';
  } catch (err) {
    el.innerHTML = `<p class="text-muted">${err.message || 'Could not load reports.'}</p>`;
  }
}

async function loadBlogs() {
  const el = document.getElementById('admin-blogs');
  if (!el) return;
  try {
    const data = await api.get('/blogs');
    const list = Array.isArray(data) ? data : data?.data || [];
    el.innerHTML = list.length
      ? list.map((b) => `<p class="mb-4"><strong>${b.title}</strong> <span class="text-muted text-sm">${b.status || 'draft'}</span></p>`).join('')
      : '<p class="text-muted">No blog posts yet.</p>';
  } catch (err) {
    el.innerHTML = `<p class="text-muted">${err.message || 'Could not load blogs.'}</p>`;
  }
}

async function loadAds() {
  const el = document.getElementById('admin-ads');
  const campaigns = document.getElementById('admin-campaigns');
  try {
    const data = await api.get('/ads');
    const list = Array.isArray(data) ? data : data?.data || [];
    const html = list.length
      ? list.map((a) => `<div class="glass-panel mb-4" style="padding:var(--space-4);">
          <strong>${a.title}</strong> · ${a.placement} · ${a.isActive ? 'active' : 'inactive'}
          <p class="text-sm text-muted">${a.impressions || 0} impressions · ${a.clicks || 0} clicks</p>
        </div>`).join('')
      : '<p class="text-muted">No ads yet.</p>';
    if (el) el.innerHTML = html;
    if (campaigns) {
      const active = list.filter((a) => a.isActive);
      campaigns.innerHTML = active.length
        ? active.map((a) => `<p class="mb-2"><strong>${a.title}</strong> — ${a.placement}</p>`).join('')
        : '<p class="text-muted">No active campaigns.</p>';
    }
  } catch (err) {
    if (el) el.innerHTML = `<p class="text-muted">${err.message || 'Could not load ads.'}</p>`;
    if (campaigns) campaigns.innerHTML = `<p class="text-muted">${err.message || 'Could not load campaigns.'}</p>`;
  }
}

async function loadNotifications() {
  const el = document.getElementById('admin-notifications');
  if (!el) return;
  try {
    const data = await api.get('/notifications');
    const list = Array.isArray(data) ? data : data?.data || [];
    el.innerHTML = list.length
      ? list.map((n) => `<div class="glass-panel mb-4" style="padding:var(--space-4);">
          <strong>${n.title || 'Notice'}</strong>
          <p class="text-sm text-muted mt-2">${n.body || n.message || ''}</p>
        </div>`).join('')
      : '<p class="text-muted">No notifications for this account.</p>';
  } catch (err) {
    el.innerHTML = `<p class="text-muted">${err.message || 'Could not load notifications.'}</p>`;
  }
}

async function loadFaqs() {
  const el = document.getElementById('admin-faqs');
  if (!el) return;
  try {
    const data = await api.get('/faqs');
    const list = Array.isArray(data) ? data : data?.data || [];
    el.innerHTML = list.length
      ? list.map((f) => `<div class="glass-panel mb-4" style="padding:var(--space-4);"><strong>${f.question}</strong><p class="text-sm mt-2">${f.answer}</p></div>`).join('')
      : '<p class="text-muted">No FAQs yet.</p>';
  } catch (err) {
    el.innerHTML = `<p class="text-muted">${err.message || 'Could not load FAQs.'}</p>`;
  }
}

async function loadCoupons() {
  const el = document.getElementById('admin-coupons');
  if (!el) return;
  try {
    const data = await api.get('/coupons');
    const list = Array.isArray(data) ? data : data?.data || [];
    el.innerHTML = list.length
      ? list.map((c) => `<p class="mb-2"><strong>${c.code}</strong> — ${c.discountType} ${c.discountValue} · ${c.isActive ? 'active' : 'off'}</p>`).join('')
      : '<p class="text-muted">No coupons yet.</p>';
  } catch (err) {
    el.innerHTML = `<p class="text-muted">${err.message || 'Could not load coupons.'}</p>`;
  }
}

async function loadFraud() {
  const el = document.getElementById('admin-fraud');
  if (!el) return;
  try {
    const payload = await api.get('/properties/search', { limit: 100 }, { raw: true });
    const list = (payload.data || payload.properties || []).filter((p) => Number(p.fraudScore || 0) >= 40);
    el.innerHTML = list.length
      ? list.map((p) => `<div class="glass-panel mb-4" style="padding:var(--space-4);">
          <strong>${p.title}</strong> · fraud score ${p.fraudScore}
          <a class="btn btn--sm btn--outline mt-2" href="${siteUrl('pages/property.html')}?id=${p._id || p.id}">Review</a>
        </div>`).join('')
      : '<p class="text-muted">No high-risk listings flagged.</p>';
  } catch (err) {
    el.innerHTML = `<p class="text-muted">${err.message || 'Could not load fraud data.'}</p>`;
  }
}

async function loadAudit() {
  const el = document.getElementById('admin-audit');
  if (!el) return;
  try {
    const data = await api.get('/admin/audit-logs');
    const list = Array.isArray(data) ? data : data?.data || [];
    el.innerHTML = list.length
      ? list.map((log) => `<div class="glass-panel mb-2" style="padding:var(--space-3);">
          <code class="text-sm">${fmtDate(log.createdAt)} — ${log.action || log.type || 'event'} ${log.user?.email || ''}</code>
        </div>`).join('')
      : '<p class="text-muted">No audit log entries yet.</p>';
  } catch (err) {
    el.innerHTML = `<p class="text-muted">${err.message || 'Could not load audit logs.'}</p>`;
  }
}

async function loadSettings() {
  const listEl = document.getElementById('admin-settings-list');
  const input = document.getElementById('setting-platform');
  try {
    const data = await api.get('/admin/settings');
    const list = Array.isArray(data) ? data : data?.data || [];
    const platform = list.find((s) => s.key === 'platformName' || s.key === 'platform_name');
    if (input && platform) input.value = platform.value || '';
    if (listEl) {
      listEl.innerHTML = list.length
        ? list.map((s) => `<p>${s.key}: ${typeof s.value === 'object' ? JSON.stringify(s.value) : s.value}</p>`).join('')
        : '<p>No settings stored yet. Saving will create platformName.</p>';
    }
  } catch (err) {
    if (listEl) listEl.textContent = err.message || 'Could not load settings.';
  }
}

function buildPropertyPayload(fd) {
  const lng = Number(fd.get('lng') || 36.8219);
  const lat = Number(fd.get('lat') || -1.2921);
  const imageUrl = String(fd.get('imageUrl') || '').trim();
  return {
    landlord: fd.get('landlord'),
    title: String(fd.get('title') || '').trim(),
    description: String(fd.get('description') || '').trim(),
    university: fd.get('university'),
    rent: Number(fd.get('rent')),
    deposit: Number(fd.get('deposit') || fd.get('rent') || 0),
    roomType: fd.get('roomType'),
    roomSize: 12,
    walkingTimeMinutes: Number(fd.get('walkingTimeMinutes') || 15),
    distanceFromCampus: 1,
    amenities: {
      wifi: fd.get('wifi') === 'on',
      water: fd.get('water') === 'on',
      furnished: fd.get('furnished') === 'on',
      parking: fd.get('parking') === 'on',
      laundry: fd.get('laundry') === 'on',
      kitchen: fd.get('kitchen') === 'on',
      electricityType: 'prepaid',
      bathrooms: 1,
      genderRestriction: 'none',
    },
    location: {
      address: String(fd.get('address') || '').trim(),
      estate: String(fd.get('estate') || '').trim(),
      city: String(fd.get('city') || 'Nairobi').trim(),
      county: String(fd.get('county') || 'Nairobi').trim(),
      coordinates: { type: 'Point', coordinates: [lng, lat] },
    },
    media: { images: imageUrl ? [{ url: imageUrl, isPrimary: true }] : [] },
    houseRules: String(fd.get('houseRules') || '').split('\n').map((r) => r.trim()).filter(Boolean),
    status: 'draft',
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth() || !requireRole('admin', siteUrl('index.html'))) return;

  initDashboardNavIcons();
  bindDashboardPanels(async (panel) => {
    if (panel === 'users') await loadUsers('');
    if (panel === 'landlords') await loadUsers('landlord');
    if (panel === 'properties') await loadPendingProperties();
    if (panel === 'universities') await loadUniversitiesPanel();
    if (panel === 'bookings') await loadBookings();
    if (panel === 'payments') await loadPayments();
    if (panel === 'reviews') await loadReviews();
    if (panel === 'reports') await loadReports();
    if (panel === 'blogs') await loadBlogs();
    if (panel === 'ads' || panel === 'campaigns') await loadAds();
    if (panel === 'notifications') await loadNotifications();
    if (panel === 'faqs') await loadFaqs();
    if (panel === 'coupons') await loadCoupons();
    if (panel === 'fraud') await loadFraud();
    if (panel === 'audit') await loadAudit();
    if (panel === 'settings') await loadSettings();
  });

  document.querySelector('[data-logout]')?.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });

  await loadUniversities(document.getElementById('property-university'));
  await loadLandlordsSelect(document.getElementById('property-landlord'));
  await loadOverviewStats();
  await loadUsers();

  document.querySelector('[data-add-property]')?.addEventListener('click', async () => {
    await loadLandlordsSelect(document.getElementById('property-landlord'));
    await loadUniversities(document.getElementById('property-university'));
    openModal('add-property-modal');
  });

  async function suspendUser(id, roleFilter = '') {
    if (!confirm('Suspend this user?')) return;
    try {
      await api.patch(`/admin/users/${id}/suspend`, {});
      showToast('User suspended.', 'success');
      await loadUsers(roleFilter);
    } catch (err) {
      try {
        await api.patch(`/users/${id}/status`, { isActive: false });
        showToast('User suspended.', 'success');
        await loadUsers(roleFilter);
      } catch (err2) {
        showToast(err2.message || err.message || 'Could not suspend user.', 'error');
      }
    }
  }

  document.getElementById('admin-users-table')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-suspend]');
    if (btn) suspendUser(btn.dataset.suspend, document.getElementById('filter-role')?.value || '');
  });
  document.getElementById('admin-landlords-table')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-suspend]');
    if (btn) suspendUser(btn.dataset.suspend, 'landlord');
  });

  document.getElementById('admin-properties-list')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-verify]');
    if (!btn) return;
    try {
      await api.patch(`/admin/properties/${btn.dataset.verify}/verify`, { status: 'verified' });
      showToast('Property verified and published.', 'success');
      await loadPendingProperties();
    } catch (err) {
      showToast(err.message || 'Could not verify property.', 'error');
    }
  });

  document.getElementById('admin-reports')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-resolve-report]');
    if (!btn) return;
    try {
      await api.patch(`/reports/${btn.dataset.resolveReport}`, { status: 'resolved' });
      showToast('Report resolved.', 'success');
      await loadReports();
    } catch (err) {
      showToast(err.message || 'Could not update report.', 'error');
    }
  });

  document.getElementById('filter-role')?.addEventListener('change', (e) => {
    loadUsers(e.target.value);
  });

  document.getElementById('admin-uni-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api.post('/universities', {
        name: String(fd.get('name') || '').trim(),
        location: { city: String(fd.get('city') || '').trim(), county: 'Kenya' },
      });
      showToast('University added.', 'success');
      e.target.reset();
      await loadUniversitiesPanel();
      await loadUniversities(document.getElementById('property-university'));
    } catch (err) {
      showToast(err.message || 'Could not add university.', 'error');
    }
  });

  document.getElementById('admin-ad-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api.post('/ads', {
        title: String(fd.get('title') || '').trim(),
        placement: fd.get('placement'),
        linkUrl: String(fd.get('linkUrl') || '').trim() || undefined,
        isActive: true,
      });
      showToast('Ad created.', 'success');
      e.target.reset();
      await loadAds();
    } catch (err) {
      showToast(err.message || 'Could not create ad.', 'error');
    }
  });

  document.getElementById('admin-faq-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api.post('/faqs', {
        question: String(fd.get('question') || '').trim(),
        answer: String(fd.get('answer') || '').trim(),
        isPublished: true,
      });
      showToast('FAQ added.', 'success');
      e.target.reset();
      await loadFaqs();
    } catch (err) {
      showToast(err.message || 'Could not add FAQ.', 'error');
    }
  });

  document.getElementById('admin-coupon-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api.post('/coupons', {
        code: String(fd.get('code') || '').trim().toUpperCase(),
        discountType: fd.get('discountType'),
        discountValue: Number(fd.get('discountValue')),
        isActive: true,
      });
      showToast('Coupon created.', 'success');
      e.target.reset();
      await loadCoupons();
    } catch (err) {
      showToast(err.message || 'Could not create coupon.', 'error');
    }
  });

  document.getElementById('admin-settings-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
    const value = document.getElementById('setting-platform')?.value?.trim() || 'KampoStay';
    try {
      await api.put('/admin/settings/platformName', { value });
      showToast('Settings saved.', 'success');
      await loadSettings();
    } catch (err) {
      showToast(err.message || 'Could not save settings.', 'error');
    }
  });

  document.getElementById('add-property-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = buildPropertyPayload(fd);
    if (!payload.landlord || !payload.title || !payload.university || !payload.rent) {
      showToast('Fill in landlord, title, university, and rent.', 'error');
      return;
    }
    const submitBtn = document.querySelector('button[form="add-property-form"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving…';
    }
    try {
      await api.post('/properties', payload);
      showToast('Property created for landlord (draft). Verify it to publish.', 'success');
      e.target.reset();
      closeModal('add-property-modal');
      await loadPendingProperties();
    } catch (err) {
      showToast(err.message || 'Could not create property.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit listing';
      }
    }
  });
});
