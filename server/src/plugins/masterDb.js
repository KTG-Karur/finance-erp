import fp from 'fastify-plugin';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMasterDbConfig } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mockFilePath = path.join(__dirname, '../mock/masterMockData.json');

function loadMasterMockData() {
  try {
    const raw = fs.readFileSync(mockFilePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return { companies: [], master_users: [], superadmin_audit_logs: [] };
  }
}

const masterSeedData = loadMasterMockData();

async function masterDbPlugin(fastify, options) {
  let masterPool = null;
  const isTestMode = process.env.NODE_ENV === 'test';

  if (isTestMode) {
    console.log('[INFO] TEST NODE_ENV detected: Using central JSON mock data store.');
    masterPool = createMockMasterPool();
  } else {
    try {
      const config = getMasterDbConfig();
      const connection = mysql.createPool(config);

      const conn = await connection.getConnection();
      conn.release();
      masterPool = connection;
      console.log(`Connected to Central Master Database (${config.database}).`);
    } catch (err) {
      console.warn('[WARN] Master DB connection fallback (In-Memory Master DB Pool active):', err.message);
      masterPool = createMockMasterPool();
    }
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
    return [[{ ...user, company_name: company?.name || 'Central Master System', db_name: company?.db_name || 'finance_master_db', company_code: company?.company_code || null }]];
  }

  if (cleanSql.includes('from companies')) {
    return [masterSeedData.companies];
  }

  if (cleanSql.startsWith('insert into companies')) {
    const [company_code, name, db_name] = params;
    const newId = masterSeedData.companies.length + 1;
    const comp = { id: newId, company_code: company_code.toUpperCase(), name, db_name: db_name || `finance_db_${company_code.toLowerCase()}`, is_active: 1, created_at: new Date().toISOString().slice(0, 10) };
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
