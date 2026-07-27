import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to attach Authorization JWT token and Tenant DB headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('financial_erp_token');
  const tenantId = localStorage.getItem('financial_erp_tenant_id') || '1';
  const dbName = localStorage.getItem('financial_erp_db_name') || 'tenant_alpha_db';

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['X-Company-ID'] = tenantId;
  config.headers['X-Tenant-DB'] = dbName;
  return config;
}, (error) => Promise.reject(error));

export default api;
