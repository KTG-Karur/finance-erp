import fp from 'fastify-plugin';
import mysql from 'mysql2/promise';

const tenantPoolsMap = new Map();
const poolLastAccessedMap = new Map();
const IDLE_POOL_TTL_MS = 15 * 60 * 1000; // 15 Minutes Idle Eviction TTL

// Eviction interval to auto-close idle dynamic pools
setInterval(() => {
  const now = Date.now();
  for (const [dbName, lastAccess] of poolLastAccessedMap.entries()) {
    if (now - lastAccess > IDLE_POOL_TTL_MS) {
      const pool = tenantPoolsMap.get(dbName);
      if (pool && typeof pool.end === 'function') {
        pool.end().catch(() => {});
      }
      tenantPoolsMap.delete(dbName);
      poolLastAccessedMap.delete(dbName);
      console.log(`🧹 Idle tenant pool evicted from memory: ${dbName}`);
    }
  }
}, 60000);

// In-Memory Seed Storage for isolated tenant databases (Fallback for offline execution)
const tenantSeedDatabases = {
  'tenant_alpha_db': {
    users: [
      { id: 1, name: 'John Admin', email: 'admin@alpha.com', role: 'ADMIN' },
      { id: 2, name: 'Sarah Collector', email: 'sarah@alpha.com', role: 'COLLECTOR' }
    ],
    employees: [
      { id: 1, employee_code: 'EMP-001', first_name: 'John', last_name: 'Admin', email: 'admin@alpha.com', department: 'Executive' },
      { id: 2, employee_code: 'EMP-002', first_name: 'Sarah', last_name: 'Collector', email: 'sarah@alpha.com', department: 'Field Recovery' }
    ],
    chart_of_accounts: [
      { id: 1001, account_code: '1010', account_name: 'Branch Vault Cash', account_type: 'ASSET' },
      { id: 1002, account_code: '1200', account_name: 'Loan Portfolio Outstanding', account_type: 'ASSET' },
      { id: 1003, account_code: '4010', account_name: 'Loan Interest Income', account_type: 'REVENUE' },
      { id: 1004, account_code: '5010', account_name: 'NPA Bad Debt Provision Expense', account_type: 'EXPENSE' }
    ],
    journal_entries: [],
    journal_lines: [],
    user_module_permissions: [
      { id: 1, user_id: 2, can_access_loan: 1, can_access_chit: 0, can_access_gold_loan: 0 }
    ],
    borrowers: [
      { id: 1, borrower_code: 'BR-001', full_name: 'Rajesh Kumar', phone_number: '9876543210', address: 'Main St 123' },
      { id: 2, borrower_code: 'BR-002', full_name: 'Priya Sharma', phone_number: '9812345678', address: 'Market Road 45' }
    ],
    loans: [
      { id: 101, borrower_id: 1, loan_account_no: 'LN-2026-001', borrower_name: 'Rajesh Kumar', phone: '9876543210', principal_amount: 50000, total_payable: 55000, collected_amount: 22000, pending_amount: 33000, installment_amount: 500, tenure_days: 110, days_past_due: 0, asset_classification: 'STANDARD', status: 'ACTIVE' },
      { id: 102, borrower_id: 2, loan_account_no: 'LN-2026-002', borrower_name: 'Priya Sharma', phone: '9812345678', principal_amount: 100000, total_payable: 112000, collected_amount: 60000, pending_amount: 52000, installment_amount: 1000, tenure_days: 112, days_past_due: 45, asset_classification: 'SMA_1', status: 'OVERDUE' }
    ],
    collections: [
      { id: 501, loan_id: 101, collected_by: 2, amount: 500, payment_mode: 'CASH', receipt_no: 'REC-20260723-01', collection_date: '2026-07-23' }
    ]
  },
  'tenant_beta_db': {
    users: [{ id: 10, name: 'Beta Admin', email: 'admin@beta.com', role: 'ADMIN' }],
    employees: [],
    chart_of_accounts: [],
    journal_entries: [],
    journal_lines: [],
    user_module_permissions: [],
    borrowers: [],
    loans: [],
    collections: []
  }
};

export function getTenantDbPool(dbName = 'tenant_alpha_db') {
  poolLastAccessedMap.set(dbName, Date.now());

  if (tenantPoolsMap.has(dbName)) {
    return tenantPoolsMap.get(dbName);
  }

  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10
    });
    tenantPoolsMap.set(dbName, pool);
    return pool;
  } catch (err) {
    const mockPool = createMockTenantPool(dbName);
    tenantPoolsMap.set(dbName, mockPool);
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
    }
  };
}

function executeMockTenantQuery(dbName, sql, params) {
  const db = tenantSeedDatabases[dbName] || tenantSeedDatabases['tenant_alpha_db'];
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

    // Update loan pending & collected
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
