import { requireAuth, requireRole, logout } from '../modules/auth.js';
import { showToast } from '../modules/ui.js';
import api from '../modules/api.js';
import { siteUrl } from '../config.js';

const PLACEHOLDER_IMG = `${siteUrl('icons/logo.png')}`;

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

let revenueChart;

// Sidebar navigation
function initSidebarNavigation() {
  const sidebarLinks = document.querySelectorAll('.landlord-sidebar__link');
  const sections = document.querySelectorAll('.landlord-section');
  const sidebar = document.getElementById('landlordSidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const main = document.querySelector('.landlord-main');

  // Handle section switching
  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      
      // Update active link
      sidebarLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      // Show corresponding section
      sections.forEach(s => s.classList.remove('active'));
      const targetSection = document.getElementById(`section-${section}`);
      if (targetSection) {
        targetSection.classList.add('active');
        
        // Load section-specific data
        if (section === 'payments') {
          initRevenueChart();
        }
      }
    });
  });

  // Handle sidebar toggle
  sidebarToggle?.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    main.classList.toggle('expanded');
  });

  // Mobile sidebar toggle
  if (window.innerWidth <= 1024) {
    sidebar.classList.add('collapsed');
    main.classList.add('expanded');
  }
}

// Load properties
async function loadProperties() {
  const container = document.getElementById('propertiesGrid');
  if (!container) return;

  try {
    const data = await api.get('/properties/mine', { limit: 50 });
    const list = Array.isArray(data) ? data : data?.properties || data?.data || [];
    
    if (!list.length) {
      container.innerHTML = '<div class="landlord-placeholder"><p>No properties yet. Click "+ Add Property" to list your first room.</p></div>';
      return;
    }

    container.innerHTML = list.map((p) => {
      const id = p._id || p.id;
      const verified = p.verification?.status === 'verified';
      const firstMedia = p.media?.images?.[0] || {};
      const img = p.primaryImage || firstMedia.url || firstMedia.secure_url || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=250&fit=crop';
      
      return `<div class="landlord-property-card">
        <div class="landlord-property-card__image">
          <img src="${img}" alt="${p.title}" onerror="this.src='${PLACEHOLDER_IMG}'">
          <span class="landlord-property-card__badge landlord-property-card__badge--${verified ? 'verified' : 'pending'}">${verified ? 'Verified Property ✓' : 'Pending Verification'}</span>
        </div>
        <div class="landlord-property-card__content">
          <h3 class="landlord-property-card__title">${p.title}</h3>
          <p class="landlord-property-card__location">${p.location?.city || 'Location'}, ${p.university?.name || 'Near University'}</p>
          <div class="landlord-property-card__stats">
            <div class="landlord-property-card__stat">
              <span class="landlord-property-card__stat-value">48</span>
              <span class="landlord-property-card__stat-label">Rooms</span>
            </div>
            <div class="landlord-property-card__stat">
              <span class="landlord-property-card__stat-value">36</span>
              <span class="landlord-property-card__stat-label">Occupied</span>
            </div>
            <div class="landlord-property-card__stat">
              <span class="landlord-property-card__stat-value">12</span>
              <span class="landlord-property-card__stat-label">Available</span>
            </div>
          </div>
          <div class="landlord-property-card__rent">${formatMoney(p.rent)}</div>
          <div class="landlord-property-card__rating">★★★★★ 4.8</div>
          <div class="landlord-property-card__actions">
            <button class="btn btn--primary btn--sm" data-action="manage" data-id="${id}">Manage Property</button>
            <button class="btn btn--outline btn--sm" data-action="view" data-id="${id}">View Listing</button>
          </div>
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="landlord-placeholder"><p>${err.message || 'Could not load properties.'}</p></div>`;
  }
}

// Load applications
async function loadApplications() {
  const container = document.getElementById('applicationsList');
  if (!container) return;

  try {
    const data = await api.get('/applications');
    const list = Array.isArray(data) ? data : data?.data || [];
    
    if (!list.length) {
      container.innerHTML = '<div class="landlord-placeholder"><p>No applications yet.</p></div>';
      return;
    }

    container.innerHTML = list.map((app) => {
      const id = app._id || app.id;
      const student = app.student || {};
      
      return `<div class="landlord-application-card">
        <div class="landlord-application-card__profile">
          <img src="https://ui-avatars.com/api/?name=${student.profile?.firstName || 'S'}&background=10b981&color=fff" alt="${student.profile?.firstName || 'Student'}">
          <div class="landlord-application-card__info">
            <div class="landlord-application-card__name">${student.profile?.firstName || ''} ${student.profile?.lastName || ''}</div>
            <div class="landlord-application-card__details">${student.university || 'University'} • ${student.course || 'Course'}</div>
          </div>
        </div>
        <div class="landlord-application-card__details">
          <div class="landlord-application-card__detail">
            <span class="landlord-application-card__label">Preferred Room:</span>
            <span>${app.preferredRoom || 'Single Room'}</span>
          </div>
          <div class="landlord-application-card__detail">
            <span class="landlord-application-card__label">Budget:</span>
            <span>${formatMoney(app.budget)}</span>
          </div>
          <div class="landlord-application-card__detail">
            <span class="landlord-application-card__label">Move-in:</span>
            <span>${fmtDate(app.moveInDate)}</span>
          </div>
        </div>
        <div class="landlord-application-card__status">
          <span class="badge badge--${app.status === 'approved' ? 'success' : app.status === 'rejected' ? 'danger' : 'pending'}">${app.status || 'New'}</span>
        </div>
        <div class="landlord-application-card__actions">
          <button class="btn btn--ghost btn--sm" data-action="view-profile" data-id="${id}">View Profile</button>
          <button class="btn btn--primary btn--sm" data-action="accept" data-id="${id}">Accept</button>
          <button class="btn btn--danger btn--sm" data-action="reject" data-id="${id}">Reject</button>
          <button class="btn btn--outline btn--sm" data-action="message" data-id="${id}">Message</button>
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="landlord-placeholder"><p>${err.message || 'Could not load applications.'}</p></div>`;
  }
}

// Initialize revenue chart
function initRevenueChart() {
  const ctx = document.getElementById('landlordRevenueChart');
  if (!ctx || !window.Chart) return;

  if (revenueChart) revenueChart.destroy();

  revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      datasets: [{
        label: 'Revenue (KSh)',
        data: [180000, 195000, 210000, 225000, 234000, 248000, 234000],
        borderColor: '#0B3D2E',
        backgroundColor: 'rgba(11, 61, 46, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth() || !requireRole('landlord', siteUrl('pages/landlord/login.html'))) return;

  // Initialize sidebar navigation
  initSidebarNavigation();
  
  // Load properties
  await loadProperties();
  
  // Load applications
  await loadApplications();

  // Handle logout
  document.querySelector('[data-logout]')?.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });

  // Handle property actions
  document.getElementById('propertiesGrid')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    
    switch (action) {
      case 'view':
        window.location.href = `${siteUrl('pages/property.html')}?id=${id}`;
        break;
      case 'manage':
        showToast('Property management coming soon', 'info');
        break;
    }
  });

  // Handle application actions
  document.getElementById('applicationsList')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    
    switch (action) {
      case 'accept':
        try {
          await api.patch(`/applications/${id}`, { status: 'approved' });
          showToast('Application accepted', 'success');
          await loadApplications();
        } catch (err) {
          showToast(err.message || 'Could not accept application', 'error');
        }
        break;
      case 'reject':
        try {
          await api.patch(`/applications/${id}`, { status: 'rejected' });
          showToast('Application rejected', 'success');
          await loadApplications();
        } catch (err) {
          showToast(err.message || 'Could not reject application', 'error');
        }
        break;
      case 'message':
        showToast('Messaging coming soon', 'info');
        break;
      case 'view-profile':
        showToast('Profile view coming soon', 'info');
        break;
    }
  });

  // Handle quick actions
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'add-property') {
        showToast('Add property modal coming soon', 'info');
      } else if (action === 'view-applications') {
        // Switch to applications section
        document.querySelector('[data-section="applications"]')?.click();
      } else {
        showToast(`${action} functionality coming soon`, 'info');
      }
    });
  });

  // Handle message icon click
  document.querySelector('[aria-label="Messages"]')?.addEventListener('click', () => {
    showToast('Messages feature coming soon', 'info');
  });

  // Handle notification icon click
  document.querySelector('[aria-label="Notifications"]')?.addEventListener('click', () => {
    showToast('Notifications feature coming soon', 'info');
  });

  // Handle search
  document.getElementById('globalSearch')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    console.log('Searching for:', query);
  });
});
