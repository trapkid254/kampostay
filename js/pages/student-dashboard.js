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
          <div class="student-property-card__rating">★★★★★ 4.8</div>
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
          <div class="student-property-card__rating">★★★★★ 4.8</div>
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
      const id = p._id || p.id;
      const firstMedia = p.media?.images?.[0] || {};
      const img = p.primaryImage || firstMedia.url || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=250&fit=crop';
      
      return `<div class="student-property-card">
        <div class="student-property-card__image">
          <img src="${img}" alt="${p.title}">
          <button class="student-property-card__favorite student-property-card__favorite--active" data-action="unfavorite" data-id="${id}">♥</button>
        </div>
        <div class="student-property-card__content">
          <h3 class="student-property-card__title">${p.title}</h3>
          <p class="student-property-card__location">📍 ${p.location?.city || 'Location'}</p>
          <div class="student-property-card__price">${formatMoney(p.rent)}/month</div>
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
          ${app.status === 'pending' ? '<button class="btn btn--danger btn--sm" data-action="cancel" data-id="${id}">Cancel</button>' : ''}
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

  // Handle logout
  document.querySelector('[data-logout]')?.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
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
    showToast('Messages feature coming soon', 'info');
  });

  // Handle notification icon click
  document.querySelector('[aria-label="Notifications"]')?.addEventListener('click', () => {
    showToast('Notifications feature coming soon', 'info');
  });

  // Handle edit profile button
  document.querySelector('.student-profile__card .btn--outline')?.addEventListener('click', () => {
    showToast('Edit profile feature coming soon', 'info');
  });

  // Handle review form submission
  document.querySelector('.student-review-form form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showToast('Review submission feature coming soon', 'info');
  });

  // Handle maintenance form submission
  document.querySelector('.student-maintenance form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showToast('Maintenance request feature coming soon', 'info');
  });

  // Handle My Home section buttons
  document.querySelector('.student-my-home__actions')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    
    const text = btn.textContent.trim();
    switch (text) {
      case 'Pay Rent':
        showToast('Payment feature coming soon', 'info');
        break;
      case 'View Lease':
        showToast('Lease viewing feature coming soon', 'info');
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

  // Handle payment button
  document.querySelector('.student-payment-card .btn--primary')?.addEventListener('click', () => {
    showToast('Payment feature coming soon', 'info');
  });

  // Handle property actions
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    
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
          await api.patch(`/bookings/${id}`, { status: 'cancelled' });
          showToast('Application cancelled', 'success');
          await loadApplications();
        } catch (err) {
          showToast(err.message || 'Could not cancel application', 'error');
        }
        break;
    }
  });
});
