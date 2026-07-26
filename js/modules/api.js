import { API_BASE_URL, STORAGE_KEYS } from '../config.js';

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.csrfTokenFetched = false;
  }

  getToken() {
    return localStorage.getItem(STORAGE_KEYS.token);
  }

  getRefreshToken() {
    return localStorage.getItem(STORAGE_KEYS.refreshToken);
  }

  getCsrfToken() {
    const name = 'csrf_token';
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  async ensureCsrfToken() {
    if (this.csrfTokenFetched || this.getCsrfToken()) return;

    try {
      await fetch(`${this.baseUrl}/csrf-token`, {
        method: 'GET',
        credentials: 'include',
      });
      this.csrfTokenFetched = true;
    } catch {
      // Silently fail, the backend might not require CSRF
    }
  }

  setTokens(access, refresh) {
    if (access) localStorage.setItem(STORAGE_KEYS.token, access);
    if (refresh) localStorage.setItem(STORAGE_KEYS.refreshToken, refresh);
  }

  clearTokens() {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.user);
  }

  unwrap(payload) {
    if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
      return payload.data;
    }
    return payload;
  }

  async refreshAccessToken() {
    const refresh = this.getRefreshToken();
    if (!refresh) return false;

    console.debug('[api] refreshAccessToken: attempting refresh, hasRefresh=', Boolean(refresh));
    await this.ensureCsrfToken();

    try {
      const csrfToken = this.getCsrfToken();
      const headers = { 'Content-Type': 'application/json' };
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ refreshToken: refresh }),
      });

      if (!res.ok) {
        this.clearTokens();
        console.debug('[api] refreshAccessToken: refresh failed, status=', res.status);
        return false;
      }

      const payload = await res.json();
      const data = this.unwrap(payload) || payload;
      this.setTokens(data.accessToken || data.token, data.refreshToken);
      console.debug('[api] refreshAccessToken: refreshed OK, hasAccess=', Boolean(data.accessToken || data.token));
      return Boolean(data.accessToken || data.token);
    } catch {
      this.clearTokens();
      return false;
    }
  }

  async request(endpoint, options = {}) {
    const method = options.method?.toUpperCase() || 'GET';
    const isStateChanging = !['GET', 'HEAD', 'OPTIONS'].includes(method);

    if (isStateChanging) {
      await this.ensureCsrfToken();
    }

    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = { ...options.headers };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const csrfToken = this.getCsrfToken();
    if (csrfToken && isStateChanging) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    let response;
    try {
      response = await fetch(url, { ...options, headers, credentials: 'include' });
    } catch {
      const isPages = typeof location !== 'undefined' && location.hostname.includes('github.io');
      const hint = isPages
        ? 'GitHub Pages cannot reach localhost. Deploy the API (e.g. Render) and set kampostay-api-base to that URL.'
        : 'Cannot reach the KampoStay API. Start it with: cd backend && npm run dev (http://localhost:5000).';
      throw new ApiError(hint, 0, { code: 'NETWORK_ERROR' });
    }

    if (response.status === 401) {
      console.debug('[api] request received 401 for', url, 'hasToken=', Boolean(token), 'tokenLen=', token ? token.length : 0, 'hasRefresh=', Boolean(this.getRefreshToken()));

      // Try to refresh access token when a refresh token exists.
      if (this.getRefreshToken()) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          headers.Authorization = `Bearer ${this.getToken()}`;
          response = await fetch(url, { ...options, headers, credentials: 'include' });
        } else {
          // Refresh failed: clear tokens and force login
          this.clearTokens();
          try { window.location.href = '/pages/auth/login.html'; } catch (e) { /* ignore when not in browser */ }
          throw new ApiError('Not authorized. Please sign in again.', 401, { code: 'UNAUTHORIZED' });
        }
      } else {
        // No refresh token available: clear tokens and force login
        this.clearTokens();
        try { window.location.href = '/pages/auth/login.html'; } catch (e) { /* ignore when not in browser */ }
        throw new ApiError('Not authorized. Please sign in.', 401, { code: 'UNAUTHORIZED' });
      }
    }

    if (!response.ok) {
      let error;
      try {
        error = await response.json();
      } catch {
        error = { message: response.statusText };
      }
      throw new ApiError(error.message || 'Request failed', response.status, error);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const payload = await response.json();
      if (options.raw) return payload;
      return this.unwrap(payload);
    }
    return response;
  }

  get(endpoint, params, options = {}) {
    const cleaned = {};
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') cleaned[key] = value;
      });
    }
    const query = Object.keys(cleaned).length ? `?${new URLSearchParams(cleaned)}` : '';
    return this.request(`${endpoint}${query}`, { method: 'GET', ...options });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...options,
    });
  }

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
      ...options,
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const api = new ApiClient(API_BASE_URL);

export default api;
