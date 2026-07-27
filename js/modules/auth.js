import api from './api.js';
import { STORAGE_KEYS, ROUTES } from '../config.js';
import { showToast } from './ui.js';

export function getUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUser(user) {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.user);
  }
}

export function isAuthenticated() {
  const token = localStorage.getItem(STORAGE_KEYS.token);
  if (!token) return false;
  // Check if token is expired (JWT tokens have expiration)
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      // Token expired, clear it
      localStorage.removeItem(STORAGE_KEYS.token);
      localStorage.removeItem(STORAGE_KEYS.user);
      return false;
    }
  } catch {
    // Invalid token format, clear it
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.user);
    return false;
  }
  return true;
}

export function getFirstName(user) {
  if (!user) return '';
  return (
    user.firstName
    || user.profile?.firstName
    || String(user.name || '').split(' ').filter(Boolean)[0]
    || ''
  );
}

export function normalizeUser(user) {
  if (!user) return null;
  return {
    ...user,
    firstName: user.firstName || user.profile?.firstName || '',
    lastName: user.lastName || user.profile?.lastName || '',
    name: user.name
      || [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ')
      || user.email,
  };
}

export function dashboardForRole(role) {
  if (role === 'admin') return ROUTES.adminDashboard;
  if (role === 'landlord') return ROUTES.landlordDashboard;
  return ROUTES.studentDashboard;
}

export async function login(email, password) {
  const data = await api.post('/auth/login', { email, password });
  api.setTokens(data.accessToken || data.token, data.refreshToken);
  const user = normalizeUser(data.user);
  setUser(user);
  const firstName = getFirstName(user) || 'friend';
  showToast(`Karibu, ${firstName}!`, 'success');
  return user;
}

export async function register(payload) {
  const body = {
    email: payload.email,
    password: payload.password,
    role: payload.role || 'student',
    profile: {
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone,
      university: payload.university,
    },
    firstName: payload.firstName,
    lastName: payload.lastName,
    university: payload.university,
  };
  const data = await api.post('/auth/register', body);
  if (data.accessToken || data.token) {
    api.setTokens(data.accessToken || data.token, data.refreshToken);
    setUser(normalizeUser(data.user));
  }
  showToast('Account created. Check your email to verify.', 'success');
  return data;
}

export async function verifyEmail(token) {
  return api.post('/auth/verify-email', { token });
}

export async function forgotPassword(email) {
  return api.post('/auth/forgot-password', { email });
}

export async function resetPassword(token, password) {
  return api.post('/auth/reset-password', { token, password });
}

export function logout() {
  api.clearTokens();
  showToast('You have been signed out.', 'success');
  window.location.href = ROUTES.home;
}

export function requireAuth(redirectUrl) {
  if (!isAuthenticated()) {
    const returnTo = redirectUrl || window.location.pathname;
    window.location.href = `${ROUTES.login}?return=${encodeURIComponent(returnTo)}`;
    return false;
  }
  return true;
}

export function requireRole(role, redirectUrl = ROUTES.home) {
  const user = getUser();
  if (!user || user.role !== role) {
    window.location.href = redirectUrl;
    return false;
  }
  return true;
}

export function updateAuthUI() {
  const user = getUser();
  const isAuth = isAuthenticated();
  const authLinks = document.querySelectorAll('[data-auth="guest"]');
  const userLinks = document.querySelectorAll('[data-auth="user"]');
  const userNameEls = document.querySelectorAll('[data-user-name]');

  // Clear user data if not authenticated
  if (!isAuth && user) {
    localStorage.removeItem(STORAGE_KEYS.user);
  }

  authLinks.forEach((el) => {
    el.hidden = isAuth;
  });
  userLinks.forEach((el) => {
    el.hidden = !isAuth;
  });
  userNameEls.forEach((el) => {
    if (user) el.textContent = getFirstName(user) || user.name || user.email;
  });

  const dashHref = user?.role ? dashboardForRole(user.role) : ROUTES.studentDashboard;
  document.querySelectorAll('[data-dashboard-link]').forEach((el) => {
    el.setAttribute('href', dashHref);
  });
}

export function getReturnUrl(user) {
  const params = new URLSearchParams(window.location.search);
  const explicit = params.get('return');
  if (explicit) return explicit;
  if (user?.role) return dashboardForRole(user.role);
  return ROUTES.home;
}
