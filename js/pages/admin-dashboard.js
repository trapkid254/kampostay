import { requireAuth, requireRole, logout } from '../modules/auth.js';
import { showToast } from '../modules/ui.js';
import api from '../modules/api.js';
import { siteUrl, STORAGE_KEYS } from '../config.js';

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
        
        // Load section-specific data
        if (section === 'dashboard') {
          initCharts();
        }
      }
    });
  });

  // Handle sidebar toggle
  sidebarToggle?.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    main.classList.toggle('expanded');
    
    // Update toggle icon
    const isCollapsed = sidebar.classList.contains('collapsed');
    if (isCollapsed) {
      sidebarToggle.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      `;
    } else {
      sidebarToggle.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      `;
    }
  });

  // Mobile sidebar toggle
  if (window.innerWidth <= 1024) {
    sidebar.classList.add('collapsed');
    main.classList.add('expanded');
  }
}

// Initialize charts with data
async function initCharts() {
  // Destroy existing chart instances before creating new ones
  if (listingsChart) listingsChart.destroy();
  if (registrationsChart) registrationsChart.destroy();
  if (revenueChart) revenueChart.destroy();
  if (universitiesChart) universitiesChart.destroy();

  try {
    // Listings Chart - Real data from API
    const listingsCtx = document.getElementById('listingsChart');
    if (listingsCtx) {
      try {
        const propertiesData = await api.get('/properties', { limit: 100 });
        const properties = Array.isArray(propertiesData) ? propertiesData : propertiesData?.data || [];
        
        const activeCount = properties.filter(p => p.status === 'active').length;
        const pendingCount = properties.filter(p => p.status === 'pending').length;
        const suspendedCount = properties.filter(p => p.status === 'suspended').length;
        
        listingsChart = new Chart(listingsCtx, {
          type: 'doughnut',
          data: {
            labels: ['Active', 'Pending', 'Suspended'],
            datasets: [{
              data: [activeCount, pendingCount, suspendedCount],
              backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
          }
        });
      } catch (err) {
        console.debug('Could not load listings chart data:', err);
      }
    }

    // Registrations Chart - Real data from API
    const registrationsCtx = document.getElementById('registrationsChart');
    if (registrationsCtx) {
      try {
        const [studentsData, landlordsData] = await Promise.all([
          api.get('/users/students'),
          api.get('/users/landlords')
        ]);
        
        const students = Array.isArray(studentsData) ? studentsData : studentsData?.data || [];
        const landlords = Array.isArray(landlordsData) ? landlordsData : landlordsData?.data || [];
        
        const studentCount = students.length;
        const landlordCount = landlords.length;
        
        registrationsChart = new Chart(registrationsCtx, {
          type: 'bar',
          data: {
            labels: ['Students', 'Landlords'],
            datasets: [{
              label: 'Registrations',
              data: [studentCount, landlordCount],
              backgroundColor: ['#0B3D2E', '#10b981']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
          }
        });
      } catch (err) {
        console.debug('Could not load registrations chart data:', err);
      }
    }

    // Revenue Chart - Real data from API
    const revenueCtx = document.getElementById('revenueChart');
    if (revenueCtx) {
      try {
        const revenueTrends = await api.get('/admin/trends/revenue?days=30');
        const trends = revenueTrends?.data || revenueTrends;
        const labels = trends?.labels || [];
        const data = trends?.data || [];
        
        revenueChart = new Chart(revenueCtx, {
          type: 'line',
          data: {
            labels: labels.length > 0 ? labels : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
            datasets: [{
              label: 'Revenue (KSh)',
              data: data.length > 0 ? data : [0, 0, 0, 0, 0, 0, 0],
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
      } catch (err) {
        console.debug('Could not load revenue trends:', err);
      }
    }

    // Universities Chart
    const universitiesCtx = document.getElementById('universitiesChart');
    if (universitiesCtx) {
      try {
        const universitiesData = await api.get('/universities', { limit: 100 });
        const unis = Array.isArray(universitiesData) ? universitiesData : universitiesData?.data || [];
        
        if (unis.length > 0) {
          const labels = unis.slice(0, 5).map(u => u.name || u.shortName);
          const data = unis.slice(0, 5).map((u, idx) => [35, 25, 20, 12, 8][idx]);
          
          universitiesChart = new Chart(universitiesCtx, {
            type: 'doughnut',
            data: {
              labels: labels,
              datasets: [{
                data: data,
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
      } catch (err) {
        // Fallback to default universities if API fails
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
  } catch (err) {
    console.error('Error initializing charts:', err);
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
      const img = p.primaryImage || firstMedia.url || firstMedia.secure_url || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=60&h=60&fit=crop';
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

  const greetingEl = document.querySelector('.admin-section__title');
  if (greetingEl) {
    greetingEl.textContent = `${greeting}, Admin 👋`;
  }
}

// Load admin dashboard statistics
async function loadAdminStats() {
  try {
    // Load main dashboard stats
    const dashboardStats = await api.get('/admin/dashboard');
    const stats = dashboardStats?.data || dashboardStats;
    
    // Update user stats
    document.getElementById('statTotalStudents').textContent = stats?.users?.students || 0;
    document.getElementById('statLandlords').textContent = stats?.users?.landlords || 0;
    document.getElementById('statTotalProperties').textContent = stats?.properties?.total || 0;
    document.getElementById('statVerifiedProperties').textContent = stats?.properties?.published || 0;
    document.getElementById('statPendingPropertyVerification').textContent = stats?.properties?.pendingVerification || 0;
    document.getElementById('statActiveBookings').textContent = stats?.bookings?.total || 0;
    document.getElementById('statRevenue').textContent = `KSh ${Number(stats?.payments?.revenue || 0).toLocaleString()}`;

    // Load property statistics
    try {
      const propStats = await api.get('/admin/statistics/properties');
      const pStats = propStats?.data || propStats;
      // Can use this for additional breakdown
    } catch (err) {
      console.debug('Property stats not available');
    }

    // Load report statistics
    try {
      const reportStats = await api.get('/admin/statistics/reports');
      const rStats = reportStats?.data || reportStats;
      const openReports = rStats?.byStatus?.find(s => s._id === 'open')?.count || 0;
      document.getElementById('statReportedListings').textContent = openReports;
    } catch (err) {
      console.debug('Report stats not available');
    }

    // Load user statistics
    try {
      const userStats = await api.get('/admin/statistics/users');
      const uStats = userStats?.data || userStats;
      const suspended = uStats?.suspended?.find(s => s._id === false)?.count || 0;
      document.getElementById('statSuspendedAccounts').textContent = suspended;
    } catch (err) {
      console.debug('User stats not available');
    }

  } catch (err) {
    console.error('Failed to load admin stats:', err);
    // Fallback: Set defaults
    ['statTotalStudents', 'statLandlords', 'statTotalProperties', 'statVerifiedProperties', 
     'statPendingPropertyVerification', 'statActiveBookings', 'statReportedListings', 
     'statSuspendedAccounts'].forEach(id => {
      document.getElementById(id).textContent = '0';
    });
    document.getElementById('statRevenue').textContent = 'KSh 0';
  }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication and admin role
  if (!requireAuth() || !requireRole('admin', siteUrl('pages/admin/login.html'))) {
    return;
  }

  // Initialize sidebar navigation
  initSidebarNavigation();
  
  // Load admin profile
  await loadAdminProfile();
  
  // Load notification counts
  await loadNotificationCounts();
  
  // Handle profile dropdown
  document.getElementById('adminProfileDropdown')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const dropdown = document.getElementById('adminDropdownMenu');
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    const dropdown = document.getElementById('adminDropdownMenu');
    if (dropdown) dropdown.style.display = 'none';
  });

  // Handle profile button click
  document.getElementById('btnProfile')?.addEventListener('click', () => {
    document.querySelector('[data-section="analytics"]')?.click();
  });

  // Handle logout
  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  });
  
  // Update greeting
  updateGreeting();
  
  // Load admin statistics
  await loadAdminStats();
  
  // Load properties
  await loadProperties();
  
  // Load universities
  await loadUniversities();
  
  // Initialize charts on dashboard view
  initCharts();

  // Make admin dashboard stat cards clickable shortcuts
  document.getElementById('statTotalProperties')?.closest('.admin-stat-card')?.addEventListener('click', () => {
    document.querySelector('[data-section="properties"]')?.click();
  });

  document.getElementById('statVerifiedProperties')?.closest('.admin-stat-card')?.addEventListener('click', () => {
    document.querySelector('[data-section="properties"]')?.click();
  });

  document.getElementById('statTotalStudents')?.closest('.admin-stat-card')?.addEventListener('click', () => {
    document.querySelector('[data-section="tenants"]')?.click();
  });

  document.getElementById('statLandlords')?.closest('.admin-stat-card')?.addEventListener('click', () => {
    document.querySelector('[data-section="landlords"]')?.click();
  });

  document.getElementById('statActiveBookings')?.closest('.admin-stat-card')?.addEventListener('click', () => {
    document.querySelector('[data-section="bookings"]')?.click();
  });

  document.getElementById('statRevenue')?.closest('.admin-stat-card')?.addEventListener('click', () => {
    showToast('Revenue/Payments section coming soon', 'info');
  });

  document.getElementById('statPendingPropertyVerification')?.closest('.admin-verification-card')?.addEventListener('click', () => {
    document.querySelector('[data-section="verification"]')?.click();
  });

  document.getElementById('statPendingLandlordVerification')?.closest('.admin-verification-card')?.addEventListener('click', () => {
    document.querySelector('[data-section="verification"]')?.click();
  });

  document.getElementById('statReportedListings')?.closest('.admin-verification-card')?.addEventListener('click', () => {
    document.querySelector('[data-section="reports"]')?.click();
  });

  document.getElementById('statSuspendedAccounts')?.closest('.admin-verification-card')?.addEventListener('click', () => {
    document.querySelector('[data-section="landlords"]')?.click();
  });

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
    if (btn.dataset.action === 'view-reports') {
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
  });

  // Handle filters
  document.querySelectorAll('.admin-filter select').forEach(select => {
    select.addEventListener('change', () => {
      loadProperties();
    });
  });

  // Handle sidebar navigation - ensure all sections work
  document.querySelectorAll('.admin-sidebar__link').forEach(link => {
    link.addEventListener('click', (e) => {
      const section = link.dataset.section;
      
      // Load data for specific sections
      switch (section) {
        case 'landlords':
          loadLandlords();
          break;
        case 'tenants':
          loadTenants();
          break;
        case 'universities':
          loadUniversities();
          break;
        case 'bookings':
          loadAdminBookings();
          break;
        case 'verification':
          loadVerifications();
          break;
        case 'reviews':
          loadReviews();
          break;
        case 'messages':
          loadMessages();
          break;
        case 'notifications':
          loadAdminNotifications();
          break;
      }
    });
  });

  // Load landlords
  async function loadLandlords() {
    const container = document.getElementById('landlordsTableBody');
    if (!container) return;

    try {
      const data = await api.get('/users/landlords');
      const landlords = Array.isArray(data) ? data : data?.landlords || data?.data || [];
      
      if (!landlords.length) {
        container.innerHTML = '<tr><td colspan="7">No landlords found</td></tr>';
        return;
      }

      container.innerHTML = landlords.map(l => `
        <tr>
          <td>${l.profile?.firstName || ''} ${l.profile?.lastName || l.email?.split('@')[0]}</td>
          <td>${l.email}</td>
          <td>${l.profile?.phone || 'N/A'}</td>
          <td>${l.propertyCount || 0}</td>
          <td><span class="badge badge--${l.verification?.adminApproved ? 'verified' : 'pending'}">${l.verification?.adminApproved ? 'Verified' : 'Pending'}</span></td>
          <td>${fmtDate(l.createdAt)}</td>
          <td>
            <button class="btn btn--ghost btn--sm" data-action="view-landlord" data-id="${l._id}">View</button>
            <button class="btn btn--ghost btn--sm" data-action="verify-landlord" data-id="${l._id}">Verify</button>
            <button class="btn btn--ghost btn--sm" data-action="suspend-landlord" data-id="${l._id}">Suspend</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      container.innerHTML = `<tr><td colspan="7">${err.message || 'Could not load landlords'}</td></tr>`;
    }
  }

  // Load tenants
  async function loadTenants() {
    const container = document.getElementById('tenantsTableBody');
    if (!container) return;

    try {
      const data = await api.get('/users/students');
      const tenants = Array.isArray(data) ? data : data?.students || data?.data || [];
      
      if (!tenants.length) {
        container.innerHTML = '<tr><td colspan="8">No tenants found</td></tr>';
        return;
      }

      container.innerHTML = tenants.map(t => `
        <tr>
          <td>${t.profile?.firstName || ''} ${t.profile?.lastName || t.email?.split('@')[0]}</td>
          <td>${t.email}</td>
          <td>${t.profile?.phone || 'N/A'}</td>
          <td>${t.profile?.university || 'N/A'}</td>
          <td>${t.currentProperty || 'None'}</td>
          <td><span class="badge badge--active">Active</span></td>
          <td>${fmtDate(t.createdAt)}</td>
          <td>
            <button class="btn btn--ghost btn--sm" data-action="view-tenant" data-id="${t._id}">View</button>
            <button class="btn btn--ghost btn--sm" data-action="message-tenant" data-id="${t._id}">Message</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      container.innerHTML = `<tr><td colspan="8">${err.message || 'Could not load tenants'}</td></tr>`;
    }
  }

  // Load universities
  async function loadUniversities() {
    const container = document.getElementById('universitiesTableBody');
    if (!container) return;

    try {
      const data = await api.get('/universities');
      const universities = Array.isArray(data) ? data : data?.universities || data?.data || [];
      
      if (!universities.length) {
        container.innerHTML = '<tr><td colspan="6">No universities found</td></tr>';
        return;
      }

      container.innerHTML = universities.map(u => `
        <tr>
          <td>${u.name}</td>
          <td>${u.location?.city || 'N/A'}, ${u.location?.county || 'N/A'}</td>
          <td>${u.propertyCount || 0}</td>
          <td>${u.studentCount || 0}</td>
          <td><span class="badge badge--active">Active</span></td>
          <td>
            <button class="btn btn--ghost btn--sm" data-action="edit-university" data-id="${u._id}">Edit</button>
            <button class="btn btn--ghost btn--sm" data-action="delete-university" data-id="${u._id}">Delete</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      container.innerHTML = `<tr><td colspan="6">${err.message || 'Could not load universities'}</td></tr>`;
    }
  }

  // Load admin bookings
  async function loadAdminBookings() {
    const container = document.getElementById('bookingsTableBody');
    if (!container) return;

    try {
      const data = await api.get('/bookings');
      const bookings = Array.isArray(data) ? data : data?.bookings || data?.data || [];
      
      if (!bookings.length) {
        container.innerHTML = '<tr><td colspan="6">No bookings found</td></tr>';
        return;
      }

      container.innerHTML = bookings.map(b => `
        <tr>
          <td>${b.student?.name || b.student?.email || 'N/A'}</td>
          <td>${b.property?.title || 'N/A'}</td>
          <td>${b.landlord?.name || b.landlord?.email || 'N/A'}</td>
          <td>${fmtDate(b.scheduledDate)}</td>
          <td><span class="badge badge--${b.status}">${b.status}</span></td>
          <td>
            <button class="btn btn--ghost btn--sm" data-action="view-booking" data-id="${b._id}">View</button>
            <button class="btn btn--ghost btn--sm" data-action="cancel-booking" data-id="${b._id}">Cancel</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      container.innerHTML = `<tr><td colspan="6">${err.message || 'Could not load bookings'}</td></tr>`;
    }
  }

  // Load verifications
  async function loadVerifications() {
    const container = document.getElementById('verificationList');
    if (!container) return;

    try {
      // Load landlords with pending verification status
      const data = await api.get('/users/landlords');
      const landlords = Array.isArray(data) ? data : data?.landlords || data?.data || [];
      
      // Filter for pending verifications
      const pendingVerifications = landlords.filter(l => 
        !l.verification?.adminApproved || l.verification?.status === 'pending'
      );
      
      if (!pendingVerifications.length) {
        container.innerHTML = '<div class="admin-placeholder"><p>No pending verifications</p></div>';
        return;
      }

      container.innerHTML = pendingVerifications.map(v => `
        <div class="admin-verification-item">
          <div class="admin-verification-item__info">
            <h3>${v.profile?.firstName || ''} ${v.profile?.lastName || v.email?.split('@')[0]}</h3>
            <p>Landlord verification</p>
            <p>Submitted: ${fmtDate(v.createdAt)}</p>
          </div>
          <div class="admin-verification-item__actions">
            <button class="btn btn--success btn--sm" data-action="approve-verification" data-id="${v._id}">Approve</button>
            <button class="btn btn--danger btn--sm" data-action="reject-verification" data-id="${v._id}">Reject</button>
            <button class="btn btn--outline btn--sm" data-action="view-verification" data-id="${v._id}">View Documents</button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<div class="admin-placeholder"><p>${err.message || 'Could not load verifications'}</p></div>`;
    }
  }

  // Load admin profile data
  async function loadAdminProfile() {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (user.profile) {
        const firstName = user.profile.firstName || '';
        const lastName = user.profile.lastName || '';
        const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
        
        // Update profile image in header
        document.getElementById('adminProfileImg').src = `https://ui-avatars.com/api/?name=${initials}&background=0B3D2E&color=fff`;
        
        // Update greeting with real name
        const greetingEl = document.getElementById('adminGreeting');
        if (greetingEl) {
          const hour = new Date().getHours();
          const timeOfDay = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
          greetingEl.textContent = `${timeOfDay}, ${firstName || 'Admin'} 👋`;
        }
      }
    } catch (err) {
      console.error('Failed to load admin profile:', err);
    }
  }

  // Load message and notification counts
  async function loadNotificationCounts() {
    try {
      const [messagesData, notificationsData] = await Promise.all([
        api.get('/messages'),
        api.get('/notifications')
      ]);
      
      const messages = Array.isArray(messagesData) ? messagesData : messagesData?.messages || messagesData?.data || [];
      const notifications = Array.isArray(notificationsData) ? notificationsData : notificationsData?.notifications || notificationsData?.data || [];
      
      const unreadMessages = messages.filter(m => !m.read).length;
      const unreadNotifications = notifications.filter(n => !n.read).length;
      
      const messageBadges = document.querySelectorAll('.admin-header__badge');
      if (messageBadges.length >= 2) {
        messageBadges[0].textContent = unreadMessages;
        messageBadges[0].style.display = unreadMessages > 0 ? 'block' : 'none';
        
        messageBadges[1].textContent = unreadNotifications;
        messageBadges[1].style.display = unreadNotifications > 0 ? 'block' : 'none';
      }
    } catch (err) {
      console.error('Failed to load notification counts:', err);
    }
  }

  // Load reviews
  async function loadReviews() {
    const container = document.getElementById('reviewsTableBody');
    if (!container) return;

    try {
      const data = await api.get('/reviews');
      const reviews = Array.isArray(data) ? data : data?.reviews || data?.data || [];
      
      if (!reviews.length) {
        container.innerHTML = '<tr><td colspan="7">No reviews found</td></tr>';
        return;
      }

      container.innerHTML = reviews.map(r => `
        <tr>
          <td>${r.property?.title || 'N/A'}</td>
          <td>${r.student?.name || r.student?.email || 'N/A'}</td>
          <td>${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</td>
          <td>${r.comment?.substring(0, 50) || 'N/A'}...</td>
          <td>${fmtDate(r.createdAt)}</td>
          <td><span class="badge badge--active">Visible</span></td>
          <td>
            <button class="btn btn--ghost btn--sm" data-action="hide-review" data-id="${r._id}">Hide</button>
            <button class="btn btn--ghost btn--sm" data-action="delete-review" data-id="${r._id}">Delete</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      container.innerHTML = `<tr><td colspan="7">${err.message || 'Could not load reviews'}</td></tr>`;
    }
  }

  // Load messages
  async function loadMessages() {
    const container = document.getElementById('messageList');
    if (!container) return;

    try {
      const data = await api.get('/messages');
      const messages = Array.isArray(data) ? data : data?.messages || data?.data || [];
      
      if (!messages.length) {
        container.innerHTML = '<div class="admin-placeholder"><p>No messages found</p></div>';
        return;
      }

      container.innerHTML = messages.map(m => `
        <div class="admin-message-item">
          <div class="admin-message-item__header">
            <strong>${m.sender?.name || m.sender?.email || 'Unknown'}</strong>
            <span class="text-muted">${fmtDate(m.createdAt)}</span>
          </div>
          <p>${m.message?.substring(0, 100) || 'N/A'}...</p>
          <button class="btn btn--ghost btn--sm" data-action="reply-message" data-id="${m._id}">Reply</button>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<div class="admin-placeholder"><p>${err.message || 'Could not load messages'}</p></div>`;
    }
  }

  // Load admin notifications
  async function loadAdminNotifications() {
    const container = document.getElementById('notificationList');
    if (!container) return;

    try {
      const data = await api.get('/notifications');
      const notifications = Array.isArray(data) ? data : data?.notifications || data?.data || [];
      
      if (!notifications.length) {
        container.innerHTML = '<div class="admin-placeholder"><p>No notifications found</p></div>';
        return;
      }

      container.innerHTML = notifications.map(n => `
        <div class="admin-notification-item">
          <div class="admin-notification-item__header">
            <strong>${n.title || 'Notification'}</strong>
            <span class="text-muted">${fmtDate(n.createdAt)}</span>
          </div>
          <p>${n.message || 'N/A'}</p>
          <button class="btn btn--ghost btn--sm" data-action="dismiss-notification" data-id="${n._id}">Dismiss</button>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<div class="admin-placeholder"><p>${err.message || 'Could not load notifications'}</p></div>`;
    }
  }

  // Handle settings forms
  document.getElementById('generalSettingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    try {
      showToast('Saving settings...', 'info');
      await api.patch('/admin/settings', {
        platformName: formData.get('platformName'),
        supportEmail: formData.get('supportEmail'),
        platformFee: parseFloat(formData.get('platformFee'))
      });
      showToast('Settings saved successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save settings', 'error');
    }
  });

  document.getElementById('verificationSettingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    
    try {
      showToast('Saving settings...', 'info');
      await api.patch('/admin/settings/verification', {
        autoVerify: form.querySelector('[name="autoVerify"]').checked,
        requireId: form.querySelector('[name="requireId"]').checked,
        requirePhone: form.querySelector('[name="requirePhone"]').checked
      });
      showToast('Settings saved successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save settings', 'error');
    }
  });

  // Modal functionality
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = 'flex';
    modal.classList.add('is-open');
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = 'none';
    modal.classList.remove('is-open');
  }

  // Close modal on overlay click
  document.querySelectorAll('[data-close-modal]').forEach(el => {
    el.addEventListener('click', () => {
      const modal = el.closest('.modal');
      if (modal) modal.style.display = 'none';
    });
  });

  // Add Property Modal
  document.querySelectorAll('[data-action="add-property"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Open modal first
      const modal = document.getElementById('addPropertyModal');
      if (modal) {
        modal.style.display = 'block';
      } else {
        console.error('Modal element not found');
      }
      
      // Load landlords into select
      const select = document.getElementById('landlordSelect');
      try {
        const data = await api.get('/users/landlords');
        const landlords = Array.isArray(data) ? data : data?.landlords || data?.data || [];
        select.innerHTML = '<option value="">Select landlord</option>' + 
          landlords.map(l => `<option value="${l._id}">${l.profile?.firstName || l.firstName} ${l.profile?.lastName || l.lastName} (${l.email})</option>`).join('');
      } catch (err) {
        console.error('Failed to load landlords:', err);
        showToast('Failed to load landlords, but you can still add property', 'warning');
        select.innerHTML = '<option value="">Select landlord</option>';
      }
    });
  });

  // Add Property Form Submission
  document.getElementById('addPropertyForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const submitBtn = document.getElementById('addPropertySubmitBtn');
    
    const amenities = [];
    form.querySelectorAll('input[name="amenities"]:checked').forEach(cb => {
      amenities.push(cb.value);
    });

    const propertyData = {
      title: formData.get('title'),
      description: formData.get('description'),
      landlord: formData.get('landlord'),
      propertyType: formData.get('propertyType'),
      roomType: formData.get('roomType'),
      university: formData.get('university'),
      location: {
        city: formData.get('city'),
        walkingTimeMinutes: parseInt(formData.get('walkingTime')) || 0,
        coordinates: {
          lat: null,
          lng: null
        }
      },
      rent: parseInt(formData.get('rent')) || 0,
      totalRooms: parseInt(formData.get('totalRooms')) || 0,
      amenities: amenities
    };

    try {
      // Add loading state to button
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('btn--loading');
        submitBtn.innerHTML = '<span class="btn--loading-text">Adding property</span>';
      }
      
      await api.post('/properties', propertyData);
      showToast('Property added successfully!', 'success');
      closeModal('addPropertyModal');
      form.reset();
      await loadProperties();
    } catch (err) {
      showToast(err.message || 'Failed to add property', 'error');
    } finally {
      // Remove loading state from button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('btn--loading');
        submitBtn.textContent = 'Add Property';
      }
    }
  });

  // University Modal
  document.querySelectorAll('[data-action="add-university"]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('universityModalTitle').textContent = 'Add University';
      document.getElementById('universityForm').reset();
      document.getElementById('universityId').value = '';
      openModal('universityModal');
    });
  });

  // University Form Submission
  document.getElementById('universityForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const universityId = formData.get('universityId');

    const universityData = {
      name: formData.get('name'),
      location: {
        city: formData.get('city'),
        county: formData.get('county'),
        country: 'Kenya'
      },
      studentCount: parseInt(formData.get('studentCount')) || 0,
      aliases: formData.get('aliases') ? formData.get('aliases').split(',').map(a => a.trim()) : [],
      featured: form.querySelector('[name="featured"]').checked
    };

    try {
      if (universityId) {
        showToast('Updating university...', 'info');
        await api.patch(`/universities/${universityId}`, universityData);
        showToast('University updated successfully!', 'success');
      } else {
        showToast('Adding university...', 'info');
        await api.post('/universities', universityData);
        showToast('University added successfully!', 'success');
      }
      closeModal('universityModal');
      form.reset();
      await loadUniversities();
    } catch (err) {
      showToast(err.message || 'Failed to save university', 'error');
    }
  });

  // Handle university table actions
  document.getElementById('universitiesTableBody')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === 'edit-university') {
      try {
        const data = await api.get(`/universities/${id}`);
        const university = data?.data || data;
        document.getElementById('universityModalTitle').textContent = 'Edit University';
        document.getElementById('universityId').value = id;
        document.querySelector('[name="name"]').value = university.name;
        document.querySelector('[name="city"]').value = university.location?.city || '';
        document.querySelector('[name="county"]').value = university.location?.county || '';
        document.querySelector('[name="studentCount"]').value = university.studentCount || '';
        document.querySelector('[name="aliases"]').value = university.aliases?.join(', ') || '';
        document.querySelector('[name="featured"]').checked = university.featured || false;
        openModal('universityModal');
      } catch (err) {
        showToast('Failed to load university details', 'error');
      }
    } else if (action === 'delete-university') {
      if (confirm('Are you sure you want to delete this university?')) {
        try {
          showToast('Deleting university...', 'info');
          await api.delete(`/universities/${id}`);
          showToast('University deleted successfully!', 'success');
          await loadUniversities();
        } catch (err) {
          showToast(err.message || 'Failed to delete university', 'error');
        }
      }
    }
  });

  // Handle profile dropdown
  document.getElementById('adminProfileDropdown')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const dropdown = document.getElementById('adminDropdownMenu');
    if (dropdown) {
      const isHidden = dropdown.style.display === 'none' || dropdown.style.display === '';
      dropdown.style.display = isHidden ? 'block' : 'none';
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('adminDropdownMenu');
    const profileDropdown = document.getElementById('adminProfileDropdown');
    if (dropdown && !e.target.closest('#adminProfileDropdown')) {
      dropdown.style.display = 'none';
    }
  });

  // Handle profile button click
  document.getElementById('btnProfile')?.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent dropdown from closing immediately
    // Navigate to settings section for profile management
    document.querySelector('[data-section="settings"]')?.click();
  });

  // Handle logout
  document.querySelector('[data-logout]')?.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '/pages/admin/login.html';
  });

  // Load notification counts
  async function loadNotificationCounts() {
    try {
      const [messagesData, notificationsData] = await Promise.all([
        api.get('/messages'),
        api.get('/notifications')
      ]);

      const messages = Array.isArray(messagesData) ? messagesData : messagesData?.messages || messagesData?.data || [];
      const notifications = Array.isArray(notificationsData) ? notificationsData : notificationsData?.notifications || notificationsData?.data || [];

      const unreadMessages = messages.filter(m => !m.read).length;
      const unreadNotifications = notifications.filter(n => !n.read).length;

      const messageBadge = document.getElementById('adminMessageBadge');
      const notificationBadge = document.getElementById('adminNotificationBadge');
      
      if (messageBadge) {
        messageBadge.textContent = unreadMessages;
        messageBadge.style.display = unreadMessages > 0 ? 'inline-flex' : 'none';
      }
      
      if (notificationBadge) {
        notificationBadge.textContent = unreadNotifications;
        notificationBadge.style.display = unreadNotifications > 0 ? 'inline-flex' : 'none';
      }
    } catch (err) {
      console.error('Failed to load notification counts:', err);
    }
  }

  // Load notification counts on initialization
  loadNotificationCounts();
});
