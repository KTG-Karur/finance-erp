import fp from 'fastify-plugin';
import mysql from 'mysql2/promise';

// Central Master DB (`master_erp_db`) seed store with company_code
const masterSeedData = {
  companies: [
    { id: 1, company_code: 'ALPHA', name: 'Alpha Financial Services Ltd', db_name: 'tenant_alpha_db', is_active: 1, created_at: '2026-01-15' },
    { id: 2, company_code: 'BETA', name: 'Beta Microfinance Pvt Ltd', db_name: 'tenant_beta_db', is_active: 1, created_at: '2026-03-20' },
    { id: 3, company_code: 'GAMMA', name: 'Gamma Capital Loans Ltd', db_name: 'tenant_gamma_db', is_active: 0, created_at: '2026-06-10' }
  ],
  master_users: [
    { id: 99, company_id: null, email: 'superadmin@erp.com', password_hash: 'super123', role: 'SUPER_ADMIN', name: 'Global Super Admin', isGlobalAdmin: true },
    { id: 1, company_id: 1, email: 'admin@alpha.com', password_hash: 'admin123', role: 'COMPANY_ADMIN', name: 'John Admin' },
    { id: 2, company_id: 1, email: 'sarah@alpha.com', password_hash: 'sarah123', role: 'COLLECTOR', name: 'Sarah Collector' },
    { id: 3, company_id: 2, email: 'admin@beta.com', password_hash: 'beta123', role: 'COMPANY_ADMIN', name: 'Beta Admin' }
  ],
  superadmin_audit_logs: []
};

async function masterDbPlugin(fastify, options) {
  let masterPool = null;

  try {
    const connection = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.MASTER_DB_NAME || 'master_erp_db',
      waitForConnections: true,
      connectionLimit: 5
    });

    const conn = await connection.getConnection();
    conn.release();
    masterPool = connection;
    console.log('✅ Connected to Central Master Database (master_erp_db).');
  } catch (err) {
    console.warn('⚠️ Master DB connection fallback (In-Memory Master DB Pool active):', err.message);
    masterPool = createMockMasterPool();
  }

  fastify.decorate('masterDb', masterPool);
}

function createMockMasterPool() {
  return {
    async query(sql, params = []) {
      return executeMockMasterQuery(sql, params);
    },
    async execute(sql, params = []) {
      return executeMockMasterQuery(sql, params);
    }
  };
}

function executeMockMasterQuery(sql, params) {
  const cleanSql = sql.trim().toLowerCase();

  // Audit Logs Insert
  if (cleanSql.startsWith('insert into superadmin_audit_logs')) {
    const [superadmin_id, target_tenant_id, action, details, ip_address] = params;
    const newLog = {
      id: masterSeedData.superadmin_audit_logs.length + 1,
      superadmin_id,
      target_tenant_id,
      action,
      details: typeof details === 'string' ? JSON.parse(details) : details,
      ip_address: ip_address || '127.0.0.1',
      created_at: new Date().toISOString()
    };
    masterSeedData.superadmin_audit_logs.push(newLog);
    return [{ insertId: newLog.id, affectedRows: 1 }];
  }

  if (cleanSql.includes('from superadmin_audit_logs')) {
    return [masterSeedData.superadmin_audit_logs];
  }

  // Company Code Lookup
  if (cleanSql.includes('from companies') && cleanSql.includes('company_code')) {
    const [code] = params;
    const company = masterSeedData.companies.find(c => c.company_code.toUpperCase() === String(code).toUpperCase());
    if (!company) return [[]];
    return [[company]];
  }

  if (cleanSql.includes('from master_users')) {
    const [email] = params;
    const user = masterSeedData.master_users.find(u => u.email === email);
    if (!user) return [[]];
    const company = masterSeedData.companies.find(c => c.id === user.company_id);
    return [[{ ...user, company_name: company?.name || 'Central Master System', db_name: company?.db_name || 'master_erp_db', company_code: company?.company_code || null }]];
  }

  if (cleanSql.includes('from companies')) {
    return [masterSeedData.companies];
  }

  if (cleanSql.startsWith('insert into companies')) {
    const [company_code, name, db_name] = params;
    const newId = masterSeedData.companies.length + 1;
    const comp = { id: newId, company_code: company_code.toUpperCase(), name, db_name, is_active: 1, created_at: new Date().toISOString().slice(0, 10) };
    masterSeedData.companies.push(comp);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (cleanSql.startsWith('update companies')) {
    const [status, companyId] = params;
    const comp = masterSeedData.companies.find(c => c.id == companyId);
    if (comp) comp.is_active = status;
    return [{ affectedRows: 1 }];
  }

  return [[]];
}

export { masterSeedData };
export default fp(masterDbPlugin, { name: 'masterDb' });
