import axios from 'axios';
import { emitApiError } from './errorBus';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// Backend origin stripped from VITE_API_BASE_URL. When the API lives on its own
// host (https://ktgfinanceapi.nidhimfi.com/api), uploaded-file paths stored by
// the backend (/uploads/<COMPANY>/.../file.png) must be re-hosted back onto that
// same API host — otherwise the browser resolves them against the SPA host and
// the image 404s. In dev the base is relative (/api) and Vite proxies both /api
// and /uploads to the backend, so origins resolve to the SPA itself.
const API_ORIGIN = /^https?:\/\//.test(API_BASE) ? new URL(API_BASE).origin : '';

function resolveAssetUrl(value) {
  if (typeof value === 'string' && value.startsWith('/uploads/')) {
    return API_ORIGIN ? `${API_ORIGIN}${value}` : value;
  }
  return value;
}

// Deep-walks an API response and rewrites every relative /uploads/... path into
// a full backend URL, so <img src=...> and window.open() get the real file.
function absolutizeUploads(value) {
  if (Array.isArray(value)) {
    return value.map(absolutizeUploads);
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value)) {
      out[key] = absolutizeUploads(value[key]);
    }
    return out;
  }
  return resolveAssetUrl(value);
}

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to attach the Authorization JWT token. Which tenant/company a
// request belongs to is resolved server-side from the verified token itself
// (see tenantGuard.js) — it used to also trust client-sent X-Company-Code /
// X-Company-ID / X-Tenant-DB headers, but those were never populated with the
// real tenant's values (always a hardcoded 'ALPHA' fallback) and, worse, a
// client header should never be able to override what the signed JWT says
// about which tenant a request belongs to.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('financial_erp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Every screen already handles its own 4xx responses inline (wrong password,
// duplicate name, validation messages — real, specific feedback a user can act on).
// What nothing currently surfaces is the class of failure where the backend itself
// is the problem: it crashed (5xx), a DB query blew up, or the request never even
// reached a server (network drop, backend not running). Those get funneled to the
// global banner here instead of leaving the screen looking like it just did nothing.
api.interceptors.response.use(
  (response) => {
    if (response && response.data !== undefined && response.data !== null) {
      response.data = absolutizeUploads(response.data);
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const responseData = error.response?.data;

    // Subscription expired — the server sets a specific `code` field so we
    // can show a targeted message rather than a generic auth error.
    if (status === 403 && responseData?.code === 'SUBSCRIPTION_EXPIRED') {
      localStorage.removeItem('financial_erp_token');
      localStorage.removeItem('financial_erp_user');
      localStorage.removeItem('financial_erp_tenant_id');
      // Give the browser a moment to flush storage, then force re-login.
      setTimeout(() => {
        window.location.href = '/';
        window.sessionStorage.setItem(
          'erp_session_msg',
          responseData.message || 'Your company subscription has expired. Please renew to continue.'
        );
      }, 100);
      return Promise.reject(error);
    }

    // JWT expired or invalid — clean session and redirect to login.
    if (status === 401) {
      const msg = responseData?.message || '';
      if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')) {
        localStorage.removeItem('financial_erp_token');
        localStorage.removeItem('financial_erp_user');
        localStorage.removeItem('financial_erp_tenant_id');
        setTimeout(() => { window.location.href = '/'; }, 100);
        return Promise.reject(error);
      }
    }

    const isBackendFailure = !error.response || status >= 500;
    if (isBackendFailure) {
      emitApiError({
        status: status || null,
        message: !error.response
          ? "Can't reach the server. Check your connection and try again."
          : 'Something went wrong on our end. Please try again in a moment.',
        url: error.config?.url
      });
    }
    return Promise.reject(error);
  }
);

export default api;
