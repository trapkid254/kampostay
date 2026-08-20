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
  console.log('Admin dashboard loading...');
  
  const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || '{}');
  const token = localStorage.getItem(STORAGE_KEYS.token);
  console.log('User from localStorage:', user);
  console.log('User role:', user?.role);
  console.log('Token from localStorage:', token ? 'exists' : 'missing');
  console.log('Expected token key:', STORAGE_KEYS.token);
  console.log('Expected user key:', STORAGE_KEYS.user);
  
  // Check authentication and role
  if (!token) {
    console.log('No token found, redirecting to login');
    window.location.href = siteUrl('pages/admin/login.html');
    return;
  }
  
  if (user?.role !== 'admin') {
    console.log('User is not admin, redirecting to login');
    window.location.href = siteUrl('pages/admin/login.html');
    return;
  }
  
  console.log('Auth checks passed, loading dashboard...');

  // Initialize sidebar navigation
  initSidebarNavigation();
  
  // Update greeting
  updateGreeting();
  
  // Load properties
  await loadProperties();
  
  // Load universities
  await loadUniversities();
  
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
    console.log('Searching for:', query);
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
      console.log('Navigating to section:', section);
      
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
        container.innerHTML = '<tr><td colspan="7">No tenants found</td></tr>';
        return;
      }

      container.innerHTML = tenants.map(t => `
        <tr>
          <td>${t.profile?.firstName || ''} ${t.profile?.lastName || t.email?.split('@')[0]}</td>
          <td>${t.email}</td>
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
      container.innerHTML = `<tr><td colspan="7">${err.message || 'Could not load tenants'}</td></tr>`;
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
      const data = await api.get('/verifications/pending');
      const verifications = Array.isArray(data) ? data : data?.verifications || data?.data || [];
      
      if (!verifications.length) {
        container.innerHTML = '<div class="admin-placeholder"><p>No pending verifications</p></div>';
        return;
      }

      container.innerHTML = verifications.map(v => `
        <div class="admin-verification-item">
          <div class="admin-verification-item__info">
            <h3>${v.user?.name || v.user?.email || 'User'}</h3>
            <p>${v.type} verification</p>
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
    document.getElementById(modalId).style.display = 'block';
  }

  function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
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
    console.log('Found add-property button:', btn);
    btn.addEventListener('click', async (e) => {
      console.log('Add property button clicked');
      e.preventDefault();
      e.stopPropagation();
      
      // Open modal first
      const modal = document.getElementById('addPropertyModal');
      console.log('Modal element:', modal);
      if (modal) {
        modal.style.display = 'block';
        console.log('Modal display set to block');
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
    
    const amenities = [];
    form.querySelectorAll('input[name="amenities"]:checked').forEach(cb => {
      amenities.push(cb.value);
    });

    const propertyData = {
      title: formData.get('title'),
      description: formData.get('description'),
      landlord: formData.get('landlord'),
      propertyType: formData.get('propertyType'),
      university: formData.get('university'),
      location: {
        city: formData.get('city'),
        walkingTimeMinutes: parseInt(formData.get('walkingTime'))
      },
      rent: parseInt(formData.get('rent')),
      totalRooms: parseInt(formData.get('totalRooms')),
      amenities: amenities
    };

    try {
      showToast('Adding property...', 'info');
      await api.post('/properties', propertyData);
      showToast('Property added successfully!', 'success');
      closeModal('addPropertyModal');
      form.reset();
      await loadProperties();
    } catch (err) {
      showToast(err.message || 'Failed to add property', 'error');
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
});
