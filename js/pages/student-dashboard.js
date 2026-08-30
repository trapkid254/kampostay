import { requireAuth, requireRole, logout } from '../modules/auth.js';
import { showToast } from '../modules/ui.js';
import api from '../modules/api.js';
import { siteUrl } from '../config.js';

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

// Sidebar navigation
function initSidebarNavigation() {
  const sidebarLinks = document.querySelectorAll('.student-sidebar__link');
  const sections = document.querySelectorAll('.student-section');
  const sidebar = document.getElementById('studentSidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const main = document.querySelector('.student-main');

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
      }
      
      // Show/hide search bar based on section
      const searchBar = document.querySelector('.student-search');
      if (searchBar) {
        searchBar.style.display = section === 'discover' ? 'block' : 'none';
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

// Mobile navigation
function initMobileNavigation() {
  const mobileLinks = document.querySelectorAll('.student-mobile-nav__link');
  const sections = document.querySelectorAll('.student-section');

  mobileLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      
      // Update active link
      mobileLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      // Show corresponding section
      sections.forEach(s => s.classList.remove('active'));
      const targetSection = document.getElementById(`section-${section}`);
      if (targetSection) {
        targetSection.classList.add('active');
      }
    });
  });
}

// Load properties for discovery
async function loadProperties() {
  const container = document.getElementById('propertyList');
  if (!container) return;

  try {
    const data = await api.get('/properties', { limit: 20 });
    const list = Array.isArray(data) ? data : data?.properties || data?.data || [];
    
    if (!list.length) {
      container.innerHTML = '<div class="student-placeholder"><p>No properties found.</p></div>';
      return;
    }

    container.innerHTML = list.map((p) => {
      const id = p._id || p.id;
      const verified = p.verification?.status === 'verified';
      const firstMedia = p.media?.images?.[0] || {};
      const img = p.primaryImage || firstMedia.url || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=250&fit=crop';
      
      return `<div class="student-property-card">
        <div class="student-property-card__image">
          <img src="${img}" alt="${p.title}" onerror="this.src='https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=250&fit=crop'">
        </div>
        <div class="student-property-card__content">
          <h3 class="student-property-card__title">${p.title}</h3>
          <p class="student-property-card__location">📍 ${p.location?.city || 'Location'} · 🚶 ${p.walkingTimeMinutes || 10} min walk to ${p.university?.name || 'University'}</p>
          <div class="student-property-card__price">${formatMoney(p.rent)}/month</div>
            <div class="student-property-card__rating">${p.averageRating ? `★${'★'.repeat(Math.round(p.averageRating))} ${p.averageRating.toFixed(1)}` : 'No ratings'}</div>
          ${verified ? '<span class="badge badge--verified">✓ Verified Property</span>' : ''}
          <button class="btn btn--primary btn--sm" data-action="view" data-id="${id}">View Details</button>
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="student-placeholder"><p>${err.message || 'Could not load properties.'}</p></div>`;
  }
}

// Load recommended properties
async function loadRecommended() {
  const container = document.getElementById('recommendedGrid');
  if (!container) return;

  try {
    const data = await api.get('/properties/featured', { limit: 6 });
    const list = Array.isArray(data) ? data : data?.data || [];
    
    if (!list.length) {
      container.innerHTML = '<div class="student-placeholder"><p>No recommendations yet.</p></div>';
      return;
    }

    container.innerHTML = list.map((p) => {
      const id = p._id || p.id;
      const firstMedia = p.media?.images?.[0] || {};
      const img = p.primaryImage || firstMedia.url || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=250&fit=crop';
      
      return `<div class="student-property-card">
        <div class="student-property-card__image">
          <img src="${img}" alt="${p.title}">
          <button class="student-property-card__favorite" data-action="favorite" data-id="${id}">♡</button>
        </div>
        <div class="student-property-card__content">
          <h3 class="student-property-card__title">${p.title}</h3>
          <p class="student-property-card__location">📍 ${p.location?.city || 'Location'}</p>
          <div class="student-property-card__price">${formatMoney(p.rent)}/month</div>
            <div class="student-property-card__rating">${p.averageRating ? `★${'★'.repeat(Math.round(p.averageRating))} ${p.averageRating.toFixed(1)}` : 'No ratings'}</div>
          <button class="btn btn--primary btn--sm" data-action="view" data-id="${id}">View Details</button>
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="student-placeholder"><p>${err.message || 'Could not load recommendations.'}</p></div>`;
  }
}

// Load saved properties
async function loadSaved() {
  const container = document.getElementById('savedGrid');
  if (!container) return;

  try {
    const data = await api.get('/wishlist');
    const list = Array.isArray(data) ? data : data?.data || [];
    
    if (!list.length) {
      container.innerHTML = '<div class="student-placeholder"><p>No saved homes yet.</p></div>';
      return;
    }

    container.innerHTML = list.map((p) => {
      // Handle different response structures for wishlist
      const property = p.property || p;
      
      // Skip items with null/missing property
      if (!property || !property._id) {
        console.warn('Skipping wishlist item with missing/invalid property:', p);
        return '';
      }
      
      const id = p._id || p.id || property._id || property.id || p.wishlistId;
      const firstMedia = property.media?.images?.[0] || {};
      const img = property.primaryImage || firstMedia.url || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=250&fit=crop';
      
      if (!id) {
        console.warn('Skipping wishlist item with missing ID:', p);
        return '';
      }
      
      return `<div class="student-property-card">
        <div class="student-property-card__image">
          <img src="${img}" alt="${property.title}">
          <button class="student-property-card__favorite student-property-card__favorite--active" data-action="unfavorite" data-id="${id}">♥</button>
        </div>
        <div class="student-property-card__content">
          <h3 class="student-property-card__title">${property.title}</h3>
          <p class="student-property-card__location">📍 ${property.location?.city || 'Location'}</p>
          <div class="student-property-card__price">${formatMoney(property.rent)}/month</div>
          <div class="student-property-card__rating">★★★★★ 4.8</div>
          <div class="student-property-card__actions">
            <button class="btn btn--primary btn--sm" data-action="view" data-id="${id}">View</button>
            <button class="btn btn--outline btn--sm" data-action="remove" data-id="${id}">Remove</button>
          </div>
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="student-placeholder"><p>${err.message || 'Could not load saved homes.'}</p></div>`;
  }
}

// Load applications
async function loadApplications() {
  const container = document.getElementById('applicationList');
  if (!container) return;

  try {
    const data = await api.get('/bookings');
    const list = Array.isArray(data) ? data : data?.bookings || data?.data || [];
    
    if (!list.length) {
      container.innerHTML = '<div class="student-placeholder"><p>No applications yet.</p></div>';
      return;
    }

    container.innerHTML = list.map((app) => {
      const id = app._id || app.id;
      const property = app.property || {};
      
      if (!id) {
        console.warn('Skipping application with missing ID:', app);
        return '';
      }
      
      return `<div class="student-application-card">
        <div class="student-application-card__property">
          <h3>${property.title || 'Property'}</h3>
          <p>${property.roomType || 'Single Room'} · ${formatMoney(property.rent || 0)}/month</p>
          <p>Applied: ${fmtDate(app.createdAt)}</p>
        </div>
        <div class="student-application-card__status badge badge--${app.status === 'approved' ? 'success' : app.status === 'rejected' ? 'danger' : 'pending'}">${app.status || 'Pending'}</div>
        <div class="student-application-card__actions">
          <button class="btn btn--ghost btn--sm" data-action="view" data-id="${id}">View Application</button>
          <button class="btn btn--outline btn--sm" data-action="message" data-id="${id}">Message Landlord</button>
          ${app.status === 'pending' ? `<button class="btn btn--danger btn--sm" data-action="cancel" data-id="${id}">Cancel</button>` : ''}
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="student-placeholder"><p>${err.message || 'Could not load applications.'}</p></div>`;
  }
}

// Load bookings
async function loadBookings() {
  const container = document.getElementById('bookingList');
  if (!container) return;

  try {
    const payload = await api.get('/bookings', { limit: 20 }, { raw: true });
    const list = payload.bookings || payload.data || [];
    
    if (!list.length) {
      container.innerHTML = '<div class="student-placeholder"><p>No upcoming bookings.</p></div>';
      return;
    }

    container.innerHTML = list.map((b) => {
      const id = b._id || b.id;
      const property = b.property || {};
      
      return `<div class="student-booking-card">
        <h3>${property.title || 'Property'}</h3>
        <p>Room: ${b.room || 'TBD'}</p>
        <p>Viewing: ${fmtDate(b.scheduledDate)}</p>
        <p>Location: ${property.location?.city || 'Location'}</p>
        <div class="student-booking-card__actions">
          <button class="btn btn--primary btn--sm">Get Directions</button>
          <button class="btn btn--outline btn--sm">Message Landlord</button>
          <button class="btn btn--ghost btn--sm">Reschedule</button>
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="student-placeholder"><p>${err.message || 'Could not load bookings.'}</p></div>`;
  }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth() || !requireRole('student', siteUrl('pages/auth/login.html'))) return;

  // Initialize navigation
  initSidebarNavigation();
  initMobileNavigation();
  
  // Load data
  await loadProperties();
  await loadRecommended();
  await loadSaved();
  await loadApplications();
  await loadBookings();
  await loadMyHome();
  await loadProfile();
  await loadNotificationCounts();

  // Handle profile dropdown
  document.getElementById('studentProfileDropdown')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const dropdown = document.getElementById('studentDropdownMenu');
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    const dropdown = document.getElementById('studentDropdownMenu');
    if (dropdown) dropdown.style.display = 'none';
  });

  // Handle profile button click
  document.getElementById('btnProfile')?.addEventListener('click', () => {
    document.querySelector('[data-section="profile"]')?.click();
  });

  // Handle logout
  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  });

  // Handle search
  document.getElementById('globalSearch')?.addEventListener('input', async (e) => {
    const query = e.target.value.toLowerCase();
    if (query.length < 2) {
      // Reset to show recommended
      await loadRecommended();
      return;
    }
    
    try {
      const data = await api.get('/properties/search', { q: query, limit: 20 });
      const results = Array.isArray(data) ? data : data?.properties || data?.data || [];
      
      const container = document.getElementById('recommendedGrid');
      if (!container) return;
      
      if (!results.length) {
        container.innerHTML = '<div class="student-placeholder"><p>No properties found matching your search.</p></div>';
        return;
      }
      
      container.innerHTML = results.map((p) => {
        const id = p._id || p.id;
        const firstMedia = p.media?.images?.[0] || {};
        const img = p.primaryImage || firstMedia.url || firstMedia.secure_url || 'https://via.placeholder.com/300';
        
        return `<div class="student-property-card">
          <div class="student-property-card__image">
            <img src="${img}" alt="${p.title}">
            <button class="student-property-card__favorite" data-action="favorite" data-id="${id}" aria-label="Add to favorites">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
          </div>
          <div class="student-property-card__content">
            <h3 class="student-property-card__title">${p.title}</h3>
            <p class="student-property-card__location">${p.location?.city || 'Location not specified'}</p>
            <div class="student-property-card__price">KSh ${Number(p.rent || 0).toLocaleString()}/month</div>
            <div class="student-property-card__rating">${p.averageRating ? `★${'★'.repeat(Math.round(p.averageRating))} ${p.averageRating.toFixed(1)}` : 'No ratings'}</div>
            <div class="student-property-card__actions">
              <button class="btn btn--primary btn--sm" data-action="view" data-id="${id}">View Details</button>
            </div>
          </div>
        </div>`;
      }).join('');
    } catch (err) {
      console.error('Search error:', err);
    }
  });

  // Handle message icon click
  document.querySelector('[aria-label="Messages"]')?.addEventListener('click', () => {
    // Switch to messages section
    document.querySelector('[data-section="messages"]')?.click();
  });

  // Handle notification icon click
  document.querySelector('[aria-label="Notifications"]')?.addEventListener('click', async () => {
    try {
      const notifications = await api.get('/notifications');
      showToast(`You have ${notifications.length || 0} new notifications`, 'info');
    } catch (err) {
      showToast('Could not load notifications', 'error');
    }
  });

  // Handle edit profile button
  document.querySelector('.student-profile__card .btn--outline')?.addEventListener('click', () => {
    // Switch to profile section
    document.querySelector('[data-section="profile"]')?.click();
  });

  // Handle review form submission
  document.querySelector('.student-review-form form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    try {
      showToast('Submitting review...', 'info');
      await api.post('/reviews', {
        propertyId: formData.get('property'),
        rating: 5,
        comment: formData.get('review')
      });
      showToast('Review submitted successfully!', 'success');
      form.reset();
    } catch (err) {
      showToast(err.message || 'Failed to submit review', 'error');
    }
  });

  // Handle maintenance form submission
  document.querySelector('.student-maintenance form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    try {
      showToast('Submitting maintenance request...', 'info');
      await api.post('/maintenance', {
        category: formData.get('category'),
        description: formData.get('description'),
        priority: formData.get('priority')
      });
      showToast('Maintenance request submitted!', 'success');
      form.reset();
    } catch (err) {
      showToast(err.message || 'Failed to submit request', 'error');
    }
  });

  // Handle safety support modal actions
  document.querySelector('.student-safety-grid')?.addEventListener('click', (e) => {
    const card = e.target.closest('.student-safety-card');
    if (!card) return;
    
    const action = card.dataset.action;
    
    switch (action) {
      case 'report-property':
        openModal('reportPropertyModal');
        break;
      case 'report-landlord':
        openModal('reportLandlordModal');
        break;
      case 'emergency-contacts':
        openModal('emergencyContactsModal');
        break;
      case 'support':
        openModal('supportModal');
        break;
      case 'scam-tips':
        openModal('scamTipsModal');
        break;
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

  // Close modal on overlay click or close button
  document.querySelectorAll('[data-close-modal]').forEach(el => {
    el.addEventListener('click', () => {
      const modal = el.closest('.modal');
      if (modal) modal.style.display = 'none';
    });
  });

  // Handle report property form submission
  document.getElementById('reportPropertyForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    try {
      showToast('Submitting report...', 'info');
      await api.post('/reports/property', {
        propertyId: formData.get('propertyId'),
        reason: formData.get('reason'),
        description: formData.get('description')
      });
      showToast('Report submitted successfully!', 'success');
      closeModal('reportPropertyModal');
      form.reset();
    } catch (err) {
      showToast(err.message || 'Failed to submit report', 'error');
    }
  });

  // Handle report landlord form submission
  document.getElementById('reportLandlordForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    try {
      showToast('Submitting report...', 'info');
      await api.post('/reports/landlord', {
        landlordId: formData.get('landlordId'),
        reason: formData.get('reason'),
        description: formData.get('description')
      });
      showToast('Report submitted successfully!', 'success');
      closeModal('reportLandlordModal');
      form.reset();
    } catch (err) {
      showToast(err.message || 'Failed to submit report', 'error');
    }
  });

  // Handle support form submission
  document.getElementById('supportForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    try {
      showToast('Submitting support request...', 'info');
      await api.post('/support', {
        topic: formData.get('topic'),
        subject: formData.get('subject'),
        message: formData.get('message'),
        email: formData.get('email')
      });
      showToast('Support request submitted! We\'ll get back to you soon.', 'success');
      closeModal('supportModal');
      form.reset();
    } catch (err) {
      showToast(err.message || 'Failed to submit request', 'error');
    }
  });

  // Handle My Home section buttons
  document.querySelector('.student-my-home__actions')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    
    const text = btn.textContent.trim();
    switch (text) {
      case 'Pay Rent':
        handlePayRent();
        break;
      case 'View Lease':
        handleViewLease();
        break;
      case 'Contact Landlord':
        showToast('Messaging feature coming soon', 'info');
        break;
      case 'Report Maintenance':
        // Switch to maintenance section
        document.querySelector('[data-section="maintenance"]')?.click();
        break;
    }
  });

  // Load profile data
  async function loadProfile() {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (user.profile) {
        const firstName = user.profile.firstName || '';
        const lastName = user.profile.lastName || '';
        const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
        
        // Update profile image in header
        document.getElementById('studentProfileImg').src = `https://ui-avatars.com/api/?name=${initials}&background=0B3D2E&color=fff`;
        
        // Update welcome message with real name
        const welcomeEl = document.querySelector('.student-header__welcome h1');
        if (welcomeEl) {
          welcomeEl.textContent = `Find your perfect campus home, ${firstName || 'Student'} 👋`;
        }
        
        document.getElementById('profileAvatar').src = `https://ui-avatars.com/api/?name=${initials}&background=0B3D2E&color=fff`;
        document.getElementById('profileName').textContent = `${firstName} ${lastName}`.trim() || 'Student';
        document.getElementById('profileEmail').textContent = user.email || '—';
        document.getElementById('profileUniversity').textContent = user.profile.university || '—';
        document.getElementById('profileCourse').textContent = user.profile.course || '—';
        document.getElementById('profilePhone').textContent = user.profile.phone || '—';
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
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

      const messageBadge = document.getElementById('studentMessageBadge');
      const notificationBadge = document.getElementById('studentNotificationBadge');
      
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

  // Handle edit profile button
  document.getElementById('btnEditProfile')?.addEventListener('click', () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const firstName = prompt('First Name:', user.profile?.firstName || '');
    const lastName = prompt('Last Name:', user.profile?.lastName || '');
    const phone = prompt('Phone Number:', user.profile?.phone || '');
    const university = prompt('University:', user.profile?.university || '');
    const course = prompt('Course:', user.profile?.course || '');
    
    if (firstName !== null || lastName !== null || phone !== null) {
      // Update local storage for now (in production, this would call an API)
      user.profile = user.profile || {};
      if (firstName !== null) user.profile.firstName = firstName;
      if (lastName !== null) user.profile.lastName = lastName;
      if (phone !== null) user.profile.phone = phone;
      if (university !== null) user.profile.university = university;
      if (course !== null) user.profile.course = course;
      
      localStorage.setItem('user', JSON.stringify(user));
      loadProfile();
      showToast('Profile updated successfully', 'success');
    }
  });

  // Load My Home (active booking) data
  async function loadMyHome() {
    try {
      const bookings = await api.get('/bookings', { status: 'confirmed', type: 'reservation' });
      const activeBooking = Array.isArray(bookings) ? bookings[0] : bookings?.bookings?.[0];
      
      if (!activeBooking) {
        document.getElementById('myHomeTitle').textContent = 'No active booking';
        document.getElementById('myHomeRoom').textContent = '—';
        document.getElementById('myHomeLocation').textContent = '📍 —';
        document.getElementById('myHomeUniversity').textContent = '—';
        document.getElementById('myHomeRent').textContent = 'KSh 0';
        document.getElementById('myHomeNextPayment').textContent = '—';
        document.getElementById('myHomeLeaseStatus').textContent = '—';
        return;
      }

      const property = activeBooking.property;
      const firstMedia = property?.media?.images?.[0] || {};
      const img = property?.primaryImage || firstMedia?.url || firstMedia?.secure_url || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=250&fit=crop';
      
      document.getElementById('myHomeImage').src = img;
      document.getElementById('myHomeTitle').textContent = property?.title || 'My Home';
      document.getElementById('myHomeRoom').textContent = activeBooking.roomNumber || '—';
      document.getElementById('myHomeLocation').textContent = `📍 ${property?.location?.city || '—'}`;
      document.getElementById('myHomeUniversity').textContent = property?.university?.name || '—';
      document.getElementById('myHomeRent').textContent = formatMoney(property?.rent || 0);
      
      // Calculate next payment date (1 month from now or from booking date)
      const nextPayment = new Date(activeBooking.createdAt || Date.now());
      nextPayment.setMonth(nextPayment.getMonth() + 1);
      document.getElementById('myHomeNextPayment').textContent = nextPayment.toLocaleDateString('en-KE', { day: 'numeric', month: 'long' });
      
      const leaseStatus = document.getElementById('myHomeLeaseStatus');
      leaseStatus.textContent = 'Active';
      leaseStatus.className = 'student-my-home__value student-my-home__value--active';
      
      // Store booking ID for payment/lease actions
      document.getElementById('myHomeCard').dataset.bookingId = activeBooking._id;
      document.getElementById('myHomeCard').dataset.propertyId = property._id;
      
    } catch (err) {
      console.error('Failed to load my home data:', err);
    }
  }

  async function handleViewLease() {
    const card = document.getElementById('myHomeCard');
    const bookingId = card?.dataset.bookingId;
    
    if (!bookingId) {
      showToast('No active booking found', 'error');
      return;
    }

    try {
      const booking = await api.get(`/bookings/${bookingId}`);
      
      // Create lease modal content
      const leaseContent = `
        <div class="lease-modal">
          <h3>Lease Agreement</h3>
          <div class="lease-details">
            <p><strong>Property:</strong> ${booking.property?.title || 'N/A'}</p>
            <p><strong>Landlord:</strong> ${booking.landlord?.profile?.firstName || ''} ${booking.landlord?.profile?.lastName || ''}</p>
            <p><strong>Student:</strong> ${booking.student?.profile?.firstName || ''} ${booking.student?.profile?.lastName || ''}</p>
            <p><strong>Monthly Rent:</strong> ${formatMoney(booking.property?.rent || 0)}</p>
            <p><strong>Booking Date:</strong> ${fmtDate(booking.createdAt)}</p>
            <p><strong>Status:</strong> ${booking.status}</p>
            <p><strong>Terms:</strong> This lease agreement is between the landlord and student for the property listed above. Monthly rent must be paid on time.</p>
          </div>
        </div>
      `;
      
      // Show in a simple alert for now (can be upgraded to a proper modal)
      alert(leaseContent.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n'));
      
    } catch (err) {
      showToast(err.message || 'Could not load lease details', 'error');
    }
  }

  async function handlePayRent() {
    const card = document.getElementById('myHomeCard');
    const bookingId = card?.dataset.bookingId;
    const propertyId = card?.dataset.propertyId;
    
    if (!bookingId || !propertyId) {
      showToast('No active booking found', 'error');
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const phoneNumber = user.profile?.phone;
      
      if (!phoneNumber) {
        showToast('Please add your phone number in profile to receive payment prompt', 'error');
        return;
      }

      showToast('Initiating payment...', 'info');
      await api.post('/payments/initiate', {
        phoneNumber,
        amount: 6500, // This should come from the actual rent amount
        bookingId,
        description: 'Monthly Rent Payment'
      });
      showToast('Payment initiated. Check your phone to complete.', 'success');
    } catch (err) {
      showToast(err.message || 'Payment initiation failed', 'error');
    }
  }

  // Handle payment button
  document.querySelector('.student-payment-card .btn--primary')?.addEventListener('click', async () => {
    try {
      showToast('Initiating payment...', 'info');
      // In production, this would integrate with M-Pesa or payment gateway
      await api.post('/payments/initiate', { amount: 6500 });
      showToast('Payment initiated. Check your phone to complete.', 'success');
    } catch (err) {
      showToast(err.message || 'Payment initiation failed', 'error');
    }
  });

  // Handle property actions
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    
    if (!id && ['favorite', 'unfavorite', 'remove', 'cancel', 'view'].includes(action)) {
      console.warn(`No ID found for action: ${action}`);
      return;
    }
    
    switch (action) {
      case 'view':
        window.location.href = `${siteUrl('pages/property.html')}?id=${id}`;
        break;
      case 'favorite':
        try {
          await api.post(`/favorites/${id}`);
          showToast('Added to favorites', 'success');
          await loadRecommended();
        } catch (err) {
          showToast(err.message || 'Could not add to favorites', 'error');
        }
        break;
      case 'unfavorite':
        try {
          await api.delete(`/favorites/${id}`);
          showToast('Removed from favorites', 'success');
          await loadSaved();
        } catch (err) {
          showToast(err.message || 'Could not remove from favorites', 'error');
        }
        break;
      case 'remove':
        try {
          await api.delete(`/favorites/${id}`);
          showToast('Removed from favorites', 'success');
          await loadSaved();
        } catch (err) {
          showToast(err.message || 'Could not remove from favorites', 'error');
        }
        break;
      case 'cancel':
        try {
          if (!id || id === '${id}' || id === 'undefined') {
            showToast('Cannot cancel: missing booking ID', 'error');
            return;
          }
          // Try to cancel the booking/application
          await api.patch(`/bookings/${id}`, { status: 'cancelled' });
          showToast('Application cancelled', 'success');
          await loadApplications();
        } catch (err) {
          console.error('Cancel error:', err);
          if (err.status === 404) {
            showToast('Application not found or already cancelled', 'error');
          } else {
            showToast(err.message || 'Could not cancel application', 'error');
          }
        }
        break;
    }
  });
});
