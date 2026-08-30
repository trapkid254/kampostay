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

function getListData(data, fallback = []) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.properties)) return data.properties;
  if (Array.isArray(data?.items)) return data.items;
  return fallback;
}

function getCount(data, fallback = 0) {
  if (typeof data === 'number') return Number.isFinite(data) ? data : fallback;
  if (Array.isArray(data)) return data.length;
  if (typeof data?.count === 'number') return data.count;
  if (typeof data?.total === 'number') return data.total;
  if (Array.isArray(data?.data)) return data.data.length;
  if (Array.isArray(data?.properties)) return data.properties.length;
  return fallback;
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

// Load properties
async function loadProperties() {
  const containers = [
    document.getElementById('propertiesGrid'),
    document.getElementById('dashboardPropertiesGrid')
  ].filter(Boolean);

  if (!containers.length) return;

  try {
    const data = await api.get('/properties/mine', { limit: 50 });
    const list = getListData(data, []);
    const emptyMarkup = '<div class="landlord-placeholder"><p>No properties yet. Click "+ Add Property" to list your first room.</p></div>';

    containers.forEach(container => {
      if (!list.length) {
        container.innerHTML = emptyMarkup;
        return;
      }

      const items = container.id === 'dashboardPropertiesGrid' ? list.slice(0, 3) : list;
      container.innerHTML = items.map((p) => {
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
                <span class="landlord-property-card__stat-value">${p.rooms?.length || 0}</span>
                <span class="landlord-property-card__stat-label">Rooms</span>
              </div>
              <div class="landlord-property-card__stat">
                <span class="landlord-property-card__stat-value">${p.rooms?.filter(r => r.status === 'occupied')?.length || 0}</span>
                <span class="landlord-property-card__stat-label">Occupied</span>
              </div>
              <div class="landlord-property-card__stat">
                <span class="landlord-property-card__stat-value">${p.rooms?.filter(r => r.status === 'available')?.length || 0}</span>
                <span class="landlord-property-card__stat-label">Available</span>
              </div>
            </div>
            <div class="landlord-property-card__rent">${formatMoney(p.rent)}</div>
            <div class="landlord-property-card__rating">${p.averageRating ? `★${'★'.repeat(Math.round(p.averageRating))} ${p.averageRating.toFixed(1)}` : 'No ratings yet'}</div>
            <div class="landlord-property-card__actions">
              <button class="btn btn--primary btn--sm" data-action="manage" data-id="${id}">Manage Property</button>
              <button class="btn btn--outline btn--sm" data-action="view" data-id="${id}">View Listing</button>
            </div>
          </div>
        </div>`;
      }).join('');
    });
  } catch (err) {
    containers.forEach(container => {
      container.innerHTML = `<div class="landlord-placeholder"><p>${err.message || 'Could not load properties.'}</p></div>`;
    });
  }
}

// Load applications
async function loadApplications() {
  const containers = [
    document.getElementById('applicationsList'),
    document.getElementById('dashboardApplicationsList')
  ].filter(Boolean);

  if (!containers.length) return;

  containers.forEach(container => {
    container.innerHTML = '<div class="landlord-placeholder"><p>No applications yet.</p></div>';
  });
}

// Initialize revenue chart
async function initRevenueChart() {
  const ctx = document.getElementById('landlordRevenueChart');
  if (!ctx || !window.Chart) return;

  if (revenueChart) revenueChart.destroy();

  try {
    const paymentsData = await api.get('/payments', { limit: 100 });
    const payments = Array.isArray(paymentsData) ? paymentsData : paymentsData?.data || [];

    const monthlyRevenue = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();

    payments.forEach(p => {
      if (p.amount && p.createdAt) {
        const date = new Date(p.createdAt);
        const monthDiff = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
        if (monthDiff >= 0 && monthDiff < 7) {
          monthlyRevenue[6 - monthDiff] += p.amount;
        }
      }
    });

    revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        datasets: [{
          label: 'Revenue (KSh)',
          data: monthlyRevenue,
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
          legend: { display: false }
        }
      }
    });
  } catch (err) {
    // No mock fallback data. Show empty state instead of fake numbers.
    revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        datasets: [{
          label: 'Revenue (KSh)',
          data: [0, 0, 0, 0, 0, 0, 0],
          borderColor: '#D1D5DB',
          backgroundColor: 'rgba(209, 213, 219, 0.2)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        },
        scales: {
          y: { display: false },
          x: { display: false }
        }
      }
    });
  }
}

// Load dashboard statistics
async function loadDashboardStats() {
  try {
    // Load landlord profile
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.profile) {
      const firstName = user.profile.firstName || '';
      const lastName = user.profile.lastName || '';
      const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
      
      // Update profile image in header
      document.getElementById('landlordProfileImg').src = `https://ui-avatars.com/api/?name=${initials}&background=0B3D2E&color=fff`;
      
      // Update welcome message with real name
      const welcomeEl = document.getElementById('welcomeMessage');
      if (welcomeEl) {
        welcomeEl.textContent = `Welcome back, ${firstName || 'Landlord'} 👋`;
      }
    }

    // Load properties count
    try {
      const propertiesData = await api.get('/properties/mine', { limit: 1 });
      const propertiesCount = getCount(propertiesData?.pagination?.total ?? propertiesData, 0);
      document.getElementById('statProperties').textContent = propertiesCount;
    } catch (err) {
      document.getElementById('statProperties').textContent = '0';
    }

    // No applications endpoint is available yet; show a clean empty state.
    document.getElementById('statApplications').textContent = '0';

    // Load messages count
    try {
      const messagesData = await api.get('/messages');
      const messages = getListData(messagesData, []);
      const unreadCount = messages.filter(item => !item.read).length;
      const messageBadge = document.getElementById('messageBadge');
      if (unreadCount > 0 && messageBadge) {
        messageBadge.textContent = unreadCount;
        messageBadge.style.display = 'inline-flex';
      } else if (messageBadge) {
        messageBadge.style.display = 'none';
      }
    } catch (err) {
      // Endpoint may not exist yet or user has no messages.
    }

    // Load notifications count
    try {
      const notificationsData = await api.get('/notifications');
      const notifications = getListData(notificationsData, []);
      const unreadCount = notifications.filter(item => !item.read).length;
      const notificationBadge = document.getElementById('notificationBadge');
      if (unreadCount > 0 && notificationBadge) {
        notificationBadge.textContent = unreadCount;
        notificationBadge.style.display = 'inline-flex';
      } else if (notificationBadge) {
        notificationBadge.style.display = 'none';
      }
    } catch (err) {
      // Endpoint may not exist yet or user has no notifications.
    }

    // For now, set other stats to 0 (rooms, income, maintenance need proper backend endpoints)
    document.getElementById('statAvailableRooms').textContent = '0';
    document.getElementById('statOccupiedRooms').textContent = '0';
    document.getElementById('statIncome').textContent = 'KSh 0';
    document.getElementById('statMaintenance').textContent = '0';

  } catch (err) {
    console.error('Failed to load dashboard stats:', err);
  }
}

// Load message and notification counts
async function loadNotificationCounts() {
  try {
    const [messagesData, notificationsData] = await Promise.all([
      api.get('/messages'),
      api.get('/notifications')
    ]);

    const messages = getListData(messagesData, []);
    const notifications = getListData(notificationsData, []);

    const unreadMessages = messages.filter(m => !m.read).length;
    const unreadNotifications = notifications.filter(n => !n.read).length;

    const messageBadge = document.getElementById('messageBadge');
    const notificationBadge = document.getElementById('notificationBadge');

    if (messageBadge) {
      messageBadge.textContent = unreadMessages;
      messageBadge.style.display = unreadMessages > 0 ? 'block' : 'none';
    }

    if (notificationBadge) {
      notificationBadge.textContent = unreadNotifications;
      notificationBadge.style.display = unreadNotifications > 0 ? 'block' : 'none';
    }
  } catch (err) {
    console.error('Failed to load notification counts:', err);
  }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth() || !requireRole('landlord', siteUrl('pages/landlord/login.html'))) return;

  // Initialize sidebar navigation
  initSidebarNavigation();
  
  // Load dashboard statistics
  await loadDashboardStats();
  
  // Load properties
  await loadProperties();
  
  // Load applications
  await loadApplications();

  // Handle profile dropdown
  document.getElementById('landlordProfileDropdown')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const dropdown = document.getElementById('landlordDropdownMenu');
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    const dropdown = document.getElementById('landlordDropdownMenu');
    if (dropdown) dropdown.style.display = 'none';
  });

  // Handle profile button click
  document.getElementById('btnProfile')?.addEventListener('click', () => {
    document.querySelector('[data-section="analytics"]')?.click();
  });

  // Handle logout
  document.querySelector('[data-logout]')?.addEventListener('click', () => {
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
        showToast('Applications are not available yet.', 'info');
        break;
      case 'reject':
        showToast('Applications are not available yet.', 'info');
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
      if (action === 'view-applications') {
        // Switch to applications section
        document.querySelector('[data-section="applications"]')?.click();
      } else if (action === 'add-property') {
        // This is handled by the specific add-property listener
        return;
      } else {
        showToast(`${action} functionality coming soon`, 'info');
      }
    });
  });

  // Handle message icon click
  document.querySelector('[data-action="messages"]')?.addEventListener('click', () => {
    // Switch to messages section
    document.querySelector('[data-section="messages"]')?.click();
  });

  // Handle notification icon click
  document.querySelector('[data-action="notifications"]')?.addEventListener('click', async () => {
    await loadNotifications();
    openModal('notificationsModal');
  });

  // Load notifications
  async function loadNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container) return;

    try {
      const data = await api.get('/notifications');
      const notifications = Array.isArray(data) ? data : data?.notifications || data?.data || [];
      
      if (!notifications.length) {
        container.innerHTML = '<div class="landlord-placeholder"><p>No notifications yet.</p></div>';
        return;
      }

      container.innerHTML = notifications.map(n => `
        <div class="notification-item ${n.read ? 'notification-item--read' : 'notification-item--unread'}">
          <div class="notification-item__content">
            <h4>${n.title || 'Notification'}</h4>
            <p>${n.message || n.body || ''}</p>
            <small class="text-muted">${fmtDate(n.createdAt)}</small>
          </div>
          ${!n.read ? '<span class="notification-item__unread-indicator"></span>' : ''}
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<div class="landlord-placeholder"><p>${err.message || 'Could not load notifications'}</p></div>`;
    }
  }

  // Handle search
  document.getElementById('globalSearch')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    // Implement search functionality
  });

  // Make dashboard stat cards clickable shortcuts
  document.getElementById('statProperties')?.closest('.landlord-stat-card')?.addEventListener('click', () => {
    document.querySelector('[data-section="properties"]')?.click();
  });

  document.getElementById('statAvailableRooms')?.closest('.landlord-stat-card')?.addEventListener('click', () => {
    document.querySelector('[data-section="properties"]')?.click();
  });

  document.getElementById('statOccupiedRooms')?.closest('.landlord-stat-card')?.addEventListener('click', () => {
    // Navigate to tenants section if exists, otherwise properties
    const tenantsSection = document.querySelector('[data-section="tenants"]');
    if (tenantsSection) {
      tenantsSection.click();
    } else {
      document.querySelector('[data-section="properties"]')?.click();
    }
  });

  document.getElementById('statApplications')?.closest('.landlord-stat-card')?.addEventListener('click', () => {
    document.querySelector('[data-section="applications"]')?.click();
  });

  document.getElementById('statIncome')?.closest('.landlord-stat-card')?.addEventListener('click', () => {
    // Navigate to payments section if exists
    const paymentsSection = document.querySelector('[data-section="payments"]');
    if (paymentsSection) {
      paymentsSection.click();
    } else {
      showToast('Payments section coming soon', 'info');
    }
  });

  document.getElementById('statMaintenance')?.closest('.landlord-stat-card')?.addEventListener('click', () => {
    // Navigate to maintenance section if exists
    const maintenanceSection = document.querySelector('[data-section="maintenance"]');
    if (maintenanceSection) {
      maintenanceSection.click();
    } else {
      showToast('Maintenance section coming soon', 'info');
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
    btn.addEventListener('click', () => openModal('addPropertyModal'));
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
      
      console.log('Submitting property data:', propertyData);
      const response = await api.post('/properties', propertyData);
      console.log('Property added successfully:', response);
      showToast('Property added successfully!', 'success');
      closeModal('addPropertyModal');
      form.reset();
      await loadProperties();
    } catch (err) {
      console.error('Property creation error:', err);
      console.error('Error details:', err.response || err.message);
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

  // Add Room Modal
  document.querySelectorAll('[data-action="add-room"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      // Load properties into select
      const select = document.getElementById('propertySelect');
      try {
        const data = await api.get('/properties/mine');
        const properties = getListData(data, []);
        select.innerHTML = '<option value="">Select property</option>' + 
          properties.map(p => `<option value="${p._id}">${p.title}</option>`).join('');
        openModal('addRoomModal');
      } catch (err) {
        showToast('Failed to load your properties', 'error');
      }
    });
  });

  // Add Room Form Submission
  document.getElementById('addRoomForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    const amenities = [];
    form.querySelectorAll('input[name="amenities"]:checked').forEach(cb => {
      amenities.push(cb.value);
    });

    const roomData = {
      propertyId: formData.get('propertyId'),
      roomNumber: formData.get('roomNumber'),
      roomType: formData.get('roomType'),
      capacity: parseInt(formData.get('capacity')),
      rent: parseInt(formData.get('rent')),
      status: formData.get('status'),
      amenities: amenities
    };

    try {
      showToast('Adding room...', 'info');
      await api.post('/rooms', roomData);
      showToast('Room added successfully!', 'success');
      closeModal('addRoomModal');
      form.reset();
    } catch (err) {
      showToast(err.message || 'Failed to add room', 'error');
    }
  });

  // View Application Modal
  document.querySelectorAll('[data-action="view-application"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const applicationId = btn.dataset.id;
      try {
        const details = document.getElementById('applicationDetails');
        details.innerHTML = `
          <div class="application-detail">
            <h3>Application</h3>
            <p><strong>Status:</strong> Not available yet</p>
            <p><strong>Message:</strong> Applications are not enabled for this portal yet.</p>
          </div>
        `;
        
        const actions = document.getElementById('applicationActions');
        if (application.status === 'pending') {
          actions.innerHTML = `
            <button type="button" class="btn btn--success" data-action="accept" data-id="${applicationId}">Accept</button>
            <button type="button" class="btn btn--danger" data-action="reject" data-id="${applicationId}">Reject</button>
            <button type="button" class="btn btn--outline" data-close-modal>Close</button>
          `;
        } else {
          actions.innerHTML = `<button type="button" class="btn btn--outline" data-close-modal>Close</button>`;
        }
        
        openModal('viewApplicationModal');
      } catch (err) {
        showToast('Failed to load application details', 'error');
      }
    });
  });

  // Settings Forms
  document.getElementById('profileSettingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    try {
      showToast('Updating profile...', 'info');
      await api.patch('/users/profile', {
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        phone: formData.get('phone')
      });
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    }
  });

  document.getElementById('notificationSettingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    
    try {
      showToast('Saving preferences...', 'info');
      await api.patch('/users/notifications', {
        emailNotifications: form.querySelector('[name="emailNotifications"]').checked,
        smsNotifications: form.querySelector('[name="smsNotifications"]').checked,
        paymentReminders: form.querySelector('[name="paymentReminders"]').checked
      });
      showToast('Preferences saved successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save preferences', 'error');
    }
  });

  document.getElementById('securityForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    if (formData.get('newPassword') !== formData.get('confirmPassword')) {
      showToast('Passwords do not match', 'error');
      return;
    }
    
    try {
      showToast('Updating password...', 'info');
      await api.patch('/users/password', {
        currentPassword: formData.get('currentPassword'),
        newPassword: formData.get('newPassword')
      });
      showToast('Password updated successfully!', 'success');
      form.reset();
    } catch (err) {
      showToast(err.message || 'Failed to update password', 'error');
    }
  });
});
