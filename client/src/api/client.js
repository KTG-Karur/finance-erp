import axios from 'axios';
import { emitApiError } from './errorBus';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to attach Authorization JWT token and Tenant Company Code headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('financial_erp_token');
  const companyCode = localStorage.getItem('financial_erp_company_code') || 'ALPHA';
  const tenantId = localStorage.getItem('financial_erp_tenant_id') || '1';
  const dbName = localStorage.getItem('financial_erp_db_name') || 'tenant_alpha_db';

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['X-Company-Code'] = companyCode;
  config.headers['X-Company-ID'] = tenantId;
  config.headers['X-Tenant-DB'] = dbName;
  return config;
}, (error) => Promise.reject(error));

// Every screen already handles its own 4xx responses inline (wrong password,
// duplicate name, validation messages — real, specific feedback a user can act on).
// What nothing currently surfaces is the class of failure where the backend itself
// is the problem: it crashed (5xx), a DB query blew up, or the request never even
// reached a server (network drop, backend not running). Those get funneled to the
// global banner here instead of leaving the screen looking like it just did nothing.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
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
