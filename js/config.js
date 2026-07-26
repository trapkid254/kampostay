/**
 * KampoStay API Configuration
 * Override via window.KAMPOSTAY_API_BASE or meta[name="kampostay-api-base"]
 */
const metaApi = document.querySelector('meta[name="kampostay-api-base"]');

const PRODUCTION_API = 'https://kampostayback.onrender.com/api/v1';
const LOCAL_API = 'http://localhost:5000/api/v1';

function resolveApiBaseUrl() {
  if (window.KAMPOSTAY_API_BASE) return window.KAMPOSTAY_API_BASE;

  const meta = metaApi?.content?.trim();
  const host = window.location.hostname;
  const onGitHubPages = host.endsWith('github.io');
  const onLocal = host === 'localhost' || host === '127.0.0.1';

  // GitHub Pages must never call localhost on the visitor's machine
  if (onGitHubPages) return PRODUCTION_API;

  if (meta && !meta.includes('localhost')) return meta.replace(/\/$/, '');
  if (onLocal) return meta?.includes('localhost') ? meta.replace(/\/$/, '') : LOCAL_API;

  return meta?.replace(/\/$/, '') || PRODUCTION_API;
}

export const API_BASE_URL = resolveApiBaseUrl();

export const APP_NAME = 'KampoStay';
export const CURRENCY = 'KSh';
export const DEFAULT_LOCALE = 'en-KE';

export const STORAGE_KEYS = {
  theme: 'kampostay-theme',
  token: 'kampostay-token',
  refreshToken: 'kampostay-refresh-token',
  user: 'kampostay-user',
  wishlist: 'kampostay-wishlist',
  compare: 'kampostay-compare',
  notifications: 'kampostay-notifications',
};

/**
 * Site root for GitHub Pages project sites and local Live Server.
 * Live: https://trapkid254.github.io/kampostay/
 */
function getSiteBase() {
  const { hostname, pathname } = window.location;
  const parts = pathname.split('/').filter(Boolean);

  // Project Pages: username.github.io/<repo>/…
  if (hostname.endsWith('github.io')) {
    const repo = parts[0] || 'kampostay';
    return `/${repo}/`;
  }

  // Local path includes …/frontend/…
  const frontendIdx = parts.indexOf('frontend');
  if (frontendIdx >= 0) {
    return `/${parts.slice(0, frontendIdx + 1).join('/')}/`;
  }

  return null;
}

/**
 * Resolve a frontend-root path from the current page.
 * Works on GitHub Pages (/kampostay/), Live Server root = frontend, or repo paths.
 */
export function siteUrl(path = '') {
  const clean = String(path).replace(/^\//, '');
  const absoluteBase = getSiteBase();
  if (absoluteBase) return absoluteBase + clean;

  const pathname = window.location.pathname;
  const dir = pathname.endsWith('/') ? pathname : pathname.replace(/\/[^/]*$/, '/');
  const parts = dir.split('/').filter(Boolean);
  const depthFromRoot = parts.length;
  const prefix = depthFromRoot === 0 ? './' : '../'.repeat(depthFromRoot);
  return prefix + clean;
}

export const ROUTES = {
  get home() {
    return siteUrl('index.html');
  },
  get search() {
    return siteUrl('pages/search.html');
  },
  get property() {
    return siteUrl('pages/property.html');
  },
  get login() {
    return siteUrl('pages/auth/login.html');
  },
  get register() {
    return siteUrl('pages/auth/register.html');
  },
  get studentDashboard() {
    return siteUrl('pages/dashboard/student.html');
  },
  get landlordDashboard() {
    return siteUrl('pages/dashboard/landlord.html');
  },
  get adminDashboard() {
    return siteUrl('pages/dashboard/admin.html');
  },
  get download() {
    return siteUrl('pages/download.html');
  },
};
