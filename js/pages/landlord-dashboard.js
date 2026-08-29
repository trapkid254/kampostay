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

// Load dashboard statistics
async function loadDashboardStats() {
  try {
    // Load landlord profile
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.profile) {
      document.getElementById('landlordName').textContent = `${user.profile.firstName || ''} ${user.profile.lastName || ''}`;
      document.getElementById('landlordRole').textContent = user.verification?.adminApproved ? 'Verified Landlord ✓' : 'Landlord';
      document.getElementById('welcomeMessage').textContent = `Welcome back, ${user.profile.firstName || ''} 👋`;
      
      const initials = `${user.profile.firstName?.[0] || ''}${user.profile.lastName?.[0] || ''}`;
      document.getElementById('headerProfileImg').src = `https://ui-avatars.com/api/?name=${initials}&background=0B3D2E&color=fff`;
    }

    // Load properties count
    const propertiesData = await api.get('/properties/mine', { limit: 1 });
    const propertiesCount = propertiesData?.pagination?.total || Array.isArray(propertiesData) ? propertiesData.length : 0;
    document.getElementById('statProperties').textContent = propertiesCount;

    // Load applications count
    const applicationsData = await api.get('/applications');
    const applicationsCount = Array.isArray(applicationsData) ? applicationsData.length : applicationsData?.data?.length || 0;
    document.getElementById('statApplications').textContent = applicationsCount;

    // Load messages count
    try {
      const messagesData = await api.get('/messages');
      const unreadCount = messagesData?.filter?.(m => !m.read)?.length || 0;
      const messageBadge = document.getElementById('messageBadge');
      if (unreadCount > 0) {
        messageBadge.textContent = unreadCount;
        messageBadge.style.display = 'inline-flex';
      }
    } catch (err) {
      // Messages endpoint might not exist yet
    }

    // Load notifications count
    try {
      const notificationsData = await api.get('/notifications');
      const unreadCount = notificationsData?.filter?.(n => !n.read)?.length || 0;
      const notificationBadge = document.getElementById('notificationBadge');
      if (unreadCount > 0) {
        notificationBadge.textContent = unreadCount;
        notificationBadge.style.display = 'inline-flex';
      }
    } catch (err) {
      // Notifications endpoint might not exist yet
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
    console.log('Searching for:', query);
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
    btn.addEventListener('click', () => openModal('addPropertyModal'));
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

  // Add Room Modal
  document.querySelectorAll('[data-action="add-room"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      // Load properties into select
      const select = document.getElementById('propertySelect');
      try {
        const data = await api.get('/properties');
        const properties = Array.isArray(data) ? data : data?.properties || data?.data || [];
        select.innerHTML = '<option value="">Select property</option>' + 
          properties.map(p => `<option value="${p._id}">${p.title}</option>`).join('');
        openModal('addRoomModal');
      } catch (err) {
        showToast('Failed to load properties', 'error');
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
        const application = await api.get(`/applications/${applicationId}`);
        const details = document.getElementById('applicationDetails');
        details.innerHTML = `
          <div class="application-detail">
            <h3>${application.student?.name || 'Student'}</h3>
            <p><strong>Email:</strong> ${application.student?.email || 'N/A'}</p>
            <p><strong>Phone:</strong> ${application.student?.phone || 'N/A'}</p>
            <p><strong>University:</strong> ${application.student?.university || 'N/A'}</p>
            <p><strong>Applied:</strong> ${fmtDate(application.createdAt)}</p>
            <p><strong>Message:</strong> ${application.message || 'No message'}</p>
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
