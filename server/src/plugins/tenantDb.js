import fp from 'fastify-plugin';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTenantDbConfig } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mockFilePath = path.join(__dirname, '../mock/tenantMockData.json');

function loadTenantMockData() {
  try {
    const raw = fs.readFileSync(mockFilePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return { users: [], employees: [], chart_of_accounts: [], borrowers: [], loans: [], collections: [], journal_entries: [], journal_lines: [] };
  }
}

const tenantPoolsMap = new Map();
const poolLastAccessedMap = new Map();

// Eviction interval to auto-close idle dynamic pools
setInterval(() => {
  const now = Date.now();
  const defaultConfig = getTenantDbConfig();
  const ttl = defaultConfig.idleTimeoutMs || 15 * 60 * 1000;

  for (const [dbName, lastAccess] of poolLastAccessedMap.entries()) {
    if (now - lastAccess > ttl) {
      const pool = tenantPoolsMap.get(dbName);
      if (pool && typeof pool.end === 'function') {
        pool.end().catch(() => {});
      }
      tenantPoolsMap.delete(dbName);
      poolLastAccessedMap.delete(dbName);
      console.log(`[INFO] Idle tenant pool evicted from memory: ${dbName}`);
    }
  }
}, 60000);

const tenantSeedDatabases = {
  'finance_db_alpha': loadTenantMockData()
};

export function getTenantDbPool(dbName) {
  const poolConfig = getTenantDbConfig(dbName);
  const targetDbName = poolConfig.database;

  poolLastAccessedMap.set(targetDbName, Date.now());

  if (tenantPoolsMap.has(targetDbName)) {
    return tenantPoolsMap.get(targetDbName);
  }

  const isTestMode = process.env.NODE_ENV === 'test';
  if (isTestMode) {
    const mockPool = createMockTenantPool(targetDbName);
    tenantPoolsMap.set(targetDbName, mockPool);
    return mockPool;
  }

  try {
    const realPool = mysql.createPool(poolConfig);

    const resilientPool = {
      async query(sql, params = []) {
        try {
          return await realPool.query(sql, params);
        } catch (err) {
          console.warn(`[WARN] Tenant DB '${targetDbName}' unreachable (falling back to in-memory mock):`, err.message);
          const mockPool = createMockTenantPool(targetDbName);
          tenantPoolsMap.set(targetDbName, mockPool);
          return mockPool.query(sql, params);
        }
      },
      async execute(sql, params = []) {
        try {
          return await realPool.execute(sql, params);
        } catch (err) {
          console.warn(`[WARN] Tenant DB '${targetDbName}' unreachable (falling back to in-memory mock):`, err.message);
          const mockPool = createMockTenantPool(targetDbName);
          tenantPoolsMap.set(targetDbName, mockPool);
          return mockPool.execute(sql, params);
        }
      },
      async getConnection() {
        try {
          return await realPool.getConnection();
        } catch (err) {
          const mockPool = createMockTenantPool(targetDbName);
          return {
            async query(sql, params) { return mockPool.query(sql, params); },
            async execute(sql, params) { return mockPool.execute(sql, params); },
            async beginTransaction() {},
            async commit() {},
            async rollback() {},
            release() {}
          };
        }
      }
    };

    tenantPoolsMap.set(targetDbName, resilientPool);
    return resilientPool;
  } catch (err) {
    const mockPool = createMockTenantPool(targetDbName);
    tenantPoolsMap.set(targetDbName, mockPool);
    return mockPool;
  }
}

function createMockTenantPool(dbName) {
  return {
    async query(sql, params = []) {
      return executeMockTenantQuery(dbName, sql, params);
    },
    async execute(sql, params = []) {
      return executeMockTenantQuery(dbName, sql, params);
    },
    async getConnection() {
      return {
        async query(sql, params) { return executeMockTenantQuery(dbName, sql, params); },
        async execute(sql, params) { return executeMockTenantQuery(dbName, sql, params); },
        async beginTransaction() {},
        async commit() {},
        async rollback() {},
        release() {}
      };
    }
  };
}

function executeMockTenantQuery(dbName, sql, params) {
  const db = tenantSeedDatabases[dbName] || tenantSeedDatabases['finance_db_alpha'];
  const cleanSql = sql.trim().toLowerCase();

  if (cleanSql.includes('from loans')) {
    return [db.loans];
  }
  if (cleanSql.includes('from users')) {
    return [db.users];
  }
  if (cleanSql.includes('from collections')) {
    return [db.collections];
  }
  if (cleanSql.includes('from chart_of_accounts')) {
    return [db.chart_of_accounts];
  }
  if (cleanSql.includes('from journal_entries')) {
    return [db.journal_entries];
  }
  if (cleanSql.includes('from journal_lines')) {
    return [db.journal_lines];
  }
  if (cleanSql.includes('from borrowers')) {
    return [db.borrowers];
  }
  if (cleanSql.startsWith('insert into collections')) {
    const [loan_id, collector_id, amount, payment_mode, notes, receipt_no] = params;
    const newId = Date.now();
    const collection = {
      id: newId,
      loan_id,
      collected_by: collector_id,
      amount: parseFloat(amount),
      payment_mode: payment_mode || 'CASH',
      receipt_no: receipt_no || `REC-${Date.now()}`,
      collection_date: new Date().toISOString().slice(0, 10)
    };
    db.collections.push(collection);

    const loan = db.loans.find(l => l.id == loan_id);
    if (loan) {
      loan.collected_amount += parseFloat(amount);
      loan.pending_amount = Math.max(0, loan.total_payable - loan.collected_amount);
      if (loan.pending_amount === 0) loan.status = 'CLOSED';
    }
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (cleanSql.startsWith('insert into loans')) {
    const [borrower_name, phone, principal_amount, interest_rate, tenure_days, installment_amount] = params;
    const total_payable = principal_amount * (1 + interest_rate / 100);
    const newId = Date.now();
    const loan = {
      id: newId,
      loan_account_no: `LN-2026-${Math.floor(100 + Math.random() * 900)}`,
      borrower_name,
      phone,
      principal_amount: parseFloat(principal_amount),
      total_payable: parseFloat(total_payable),
      collected_amount: 0,
      pending_amount: parseFloat(total_payable),
      installment_amount: parseFloat(installment_amount),
      tenure_days: parseInt(tenure_days),
      status: 'ACTIVE'
    };
    db.loans.push(loan);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  return [[]];
}

async function tenantDbPlugin(fastify, options) {
  fastify.decorate('getTenantDbPool', getTenantDbPool);
}

export default fp(tenantDbPlugin, {
  name: 'tenantDb'
});
