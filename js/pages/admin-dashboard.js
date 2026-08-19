import { requireAuth, requireRole, logout } from '../modules/auth.js';
import { showToast, formatCurrency } from '../modules/ui.js';
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

// Chart instances
let listingsChart, registrationsChart, revenueChart, universitiesChart;

// Initialize charts
function initCharts() {
  if (!window.Chart) return;

  // Listings Chart
  const listingsCtx = document.getElementById('listingsChart');
  if (listingsCtx) {
    listingsChart = new Chart(listingsCtx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        datasets: [{
          label: 'Property Listings',
          data: [120, 190, 300, 500, 200, 300, 450],
          borderColor: '#0B3D2E',
          backgroundColor: 'rgba(11, 61, 46, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }

  // Registrations Chart
  const registrationsCtx = document.getElementById('registrationsChart');
  if (registrationsCtx) {
    registrationsChart = new Chart(registrationsCtx, {
      type: 'bar',
      data: {
        labels: ['Students', 'Landlords'],
        datasets: [{
          label: 'Registrations',
          data: [28640, 3284],
          backgroundColor: ['#0B3D2E', '#10b981']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }

  // Revenue Chart
  const revenueCtx = document.getElementById('revenueChart');
  if (revenueCtx) {
    revenueChart = new Chart(revenueCtx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        datasets: [{
          label: 'Revenue (KSh)',
          data: [1200000, 1900000, 3000000, 5000000, 2000000, 3000000, 4820000],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }

  // Universities Chart
  const universitiesCtx = document.getElementById('universitiesChart');
  if (universitiesCtx) {
    universitiesChart = new Chart(universitiesCtx, {
      type: 'doughnut',
      data: {
        labels: ['JKUAT', 'UoN', 'Kenyatta', 'Strathmore', 'MKU'],
        datasets: [{
          data: [35, 25, 20, 12, 8],
          backgroundColor: ['#0B3D2E', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }
}

// Sidebar navigation
function initSidebarNavigation() {
  const sidebarLinks = document.querySelectorAll('.admin-sidebar__link');
  const sections = document.querySelectorAll('.admin-section');
  const sidebar = document.getElementById('adminSidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const main = document.querySelector('.admin-main');

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
        
        // Initialize charts when analytics section is shown
        if (section === 'analytics') {
          initCharts();
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

// Load properties table
async function loadProperties() {
  const tbody = document.getElementById('propertiesTableBody');
  if (!tbody) return;

  try {
    const payload = await api.get('/properties/search', { limit: 50 }, { raw: true });
    const list = payload?.data || payload?.properties || [];
    
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="9">No properties found.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map((p) => {
      const id = p._id || p.id;
      const firstMedia = p.media?.images?.[0] || {};
      const img = p.primaryImage || firstMedia.url || firstMedia.secure_url || 'https://via.placeholder.com/60';
      const verified = p.verification?.status === 'verified';
      const active = p.status === 'published' || p.status === 'active';
      
      return `<tr>
        <td>
          <div class="admin-table__property">
            <img src="${img}" alt="Property">
            <span>${p.title}</span>
          </div>
        </td>
        <td>${userName(p.landlord || {})}</td>
        <td>${p.university?.name || '—'}</td>
        <td>${p.location?.city || '—'}</td>
        <td>KSh ${Number(p.rent || 0).toLocaleString()}</td>
        <td>${p.roomCount || '—'}</td>
        <td><span class="badge badge--${verified ? 'verified' : 'pending'}">${verified ? 'Verified' : 'Pending'}</span></td>
        <td><span class="badge badge--${active ? 'active' : 'warning'}">${active ? 'Active' : 'Inactive'}</span></td>
        <td>
          <div class="admin-table__actions">
            <button class="btn btn--ghost btn--sm" data-action="view" data-id="${id}">View</button>
            <button class="btn btn--ghost btn--sm" data-action="edit" data-id="${id}">Edit</button>
            <button class="btn btn--ghost btn--sm" data-action="suspend" data-id="${id}">Suspend</button>
            <button class="btn btn--ghost btn--sm" data-action="delete" data-id="${id}">Delete</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9">${err.message || 'Failed to load properties.'}</td></tr>`;
  }
}

// Update greeting based on time
function updateGreeting() {
  const hour = new Date().getHours();
  let greeting = 'Good morning';
  
  if (hour >= 12 && hour < 17) {
    greeting = 'Good afternoon';
  } else if (hour >= 17) {
    greeting = 'Good evening';
  }

  const greetingEl = document.querySelector('.admin-header__user span');
  if (greetingEl) {
    greetingEl.textContent = `${greeting}, Admin 👋`;
  }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth() || !requireRole('admin', siteUrl('index.html'))) return;

  // Initialize sidebar navigation
  initSidebarNavigation();
  
  // Update greeting
  updateGreeting();
  
  // Load properties
  await loadProperties();
  
  // Initialize charts on dashboard view
  initCharts();

  // Handle logout
  document.querySelector('[data-logout]')?.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });

  // Handle property table actions
  document.getElementById('propertiesTableBody')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    
    switch (action) {
      case 'view':
        window.location.href = `${siteUrl('pages/property.html')}?id=${id}`;
        break;
      case 'edit':
        showToast('Edit functionality coming soon', 'info');
        break;
      case 'suspend':
        if (confirm('Suspend this property?')) {
          try {
            await api.patch(`/admin/properties/${id}/suspend`, {});
            showToast('Property suspended.', 'success');
            await loadProperties();
          } catch (err) {
            showToast(err.message || 'Could not suspend property.', 'error');
          }
        }
        break;
      case 'delete':
        if (confirm('Delete this property? This action cannot be undone.')) {
          try {
            await api.delete(`/properties/${id}`);
            showToast('Property deleted.', 'success');
            await loadProperties();
          } catch (err) {
            showToast(err.message || 'Could not delete property.', 'error');
          }
        }
        break;
    }
  });

  // Handle verification card actions
  document.querySelectorAll('.admin-verification-card button').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      showToast(`${action} functionality coming soon`, 'info');
    });
  });

  // Handle quick actions
  document.querySelectorAll('[data-action]').forEach(btn => {
    if (btn.dataset.action === 'add-property') {
      btn.addEventListener('click', () => {
        showToast('Add property modal coming soon', 'info');
      });
    } else if (btn.dataset.action === 'view-reports') {
      btn.addEventListener('click', () => {
        // Navigate to reports section
        document.querySelector('[data-section="reports"]')?.click();
      });
    }
  });

  // Handle search
  document.getElementById('globalSearch')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    // Implement search functionality
    console.log('Searching for:', query);
  });

  // Handle filters
  document.querySelectorAll('.admin-filter select').forEach(select => {
    select.addEventListener('change', () => {
      loadProperties();
    });
  });
});
