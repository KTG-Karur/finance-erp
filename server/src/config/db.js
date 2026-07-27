import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool = null;
let useMock = false;

// In-Memory Seed Data for Fallback / Immediate Out-Of-The-Box Execution
const mockDB = {
  companies: [
    { id: 1, name: 'Alpha Financial Services', code: 'ALPHA', status: 'ACTIVE', created_at: new Date() },
    { id: 2, name: 'Beta Microfinance Ltd', code: 'BETA', status: 'ACTIVE', created_at: new Date() }
  ],
  users: [
    { id: 1, company_id: 1, name: 'John Admin', email: 'admin@alpha.com', role: 'ADMIN', status: 'ACTIVE' },
    { id: 2, company_id: 1, name: 'Sarah Collector', email: 'sarah@alpha.com', role: 'COLLECTOR', status: 'ACTIVE' },
    { id: 3, company_id: 1, name: 'Mike Manager', email: 'mike@alpha.com', role: 'MANAGER', status: 'ACTIVE' }
  ],
  employee_permissions: [
    { id: 1, company_id: 1, user_id: 2, module: 'LOANS', action: 'VIEW', allowed: 1 },
    { id: 2, company_id: 1, user_id: 2, module: 'COLLECTIONS', action: 'COLLECT', allowed: 1 },
    { id: 3, company_id: 1, user_id: 3, module: 'LOANS', action: 'CREATE', allowed: 1 },
    { id: 4, company_id: 1, user_id: 3, module: 'EMPLOYEES', action: 'MANAGE', allowed: 1 }
  ],
  loans: [
    { id: 101, company_id: 1, loan_account_no: 'LN-2026-001', borrower_name: 'Rajesh Kumar', phone: '9876543210', principal_amount: 50000.00, total_payable: 55000.00, collected_amount: 22000.00, pending_amount: 33000.00, installment_amount: 500.00, tenure_days: 110, status: 'ACTIVE', created_at: new Date() },
    { id: 102, company_id: 1, loan_account_no: 'LN-2026-002', borrower_name: 'Priya Sharma', phone: '9812345678', principal_amount: 100000.00, total_payable: 112000.00, collected_amount: 60000.00, pending_amount: 52000.00, installment_amount: 1000.00, tenure_days: 112, status: 'ACTIVE', created_at: new Date() },
    { id: 103, company_id: 1, loan_account_no: 'LN-2026-003', borrower_name: 'Anil Verma', phone: '9765432109', principal_amount: 30000.00, total_payable: 33000.00, collected_amount: 33000.00, pending_amount: 0.00, installment_amount: 300.00, tenure_days: 110, status: 'CLOSED', created_at: new Date() },
    { id: 104, company_id: 1, loan_account_no: 'LN-2026-004', borrower_name: 'Suresh Patel', phone: '9988776655', principal_amount: 75000.00, total_payable: 82500.00, collected_amount: 15000.00, pending_amount: 67500.00, installment_amount: 750.00, tenure_days: 110, status: 'ACTIVE', created_at: new Date() }
  ],
  collections: [
    { id: 501, company_id: 1, loan_id: 101, collector_id: 2, amount: 500.00, collection_date: '2026-07-23', payment_mode: 'CASH', receipt_no: 'REC-20260723-01', notes: 'Daily installment paid' },
    { id: 502, company_id: 1, loan_id: 102, collector_id: 2, amount: 1000.00, collection_date: '2026-07-23', payment_mode: 'UPI', receipt_no: 'REC-20260723-02', notes: 'UPI reference #89712' }
  ]
};

export async function getDbPool() {
  if (pool) return pool;

  try {
    const connection = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'financial_erp',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Test connection with a quick ping
    const conn = await connection.getConnection();
    conn.release();
    console.log('✅ Connected to MySQL Database successfully.');
    pool = connection;
    return pool;
  } catch (err) {
    console.warn('⚠️ MySQL Connection failed (Using In-Memory Database Fallback for smooth offline testing):', err.message);
    useMock = true;
    pool = createMockPool();
    return pool;
  }
}

function createMockPool() {
  return {
    async query(sql, params = []) {
      return executeMockQuery(sql, params);
    },
    async execute(sql, params = []) {
      return executeMockQuery(sql, params);
    }
  };
}

function executeMockQuery(sql, params) {
  const cleanSql = sql.trim().toLowerCase();

  // SELECT loans
  if (cleanSql.includes('from loans')) {
    let companyId = params[0];
    let rows = mockDB.loans;
    if (companyId) {
      rows = rows.filter(l => l.company_id == companyId);
    }
    return [rows];
  }

  // SELECT users / employees
  if (cleanSql.includes('from users')) {
    let companyId = params[0];
    let rows = mockDB.users;
    if (companyId) {
      rows = rows.filter(u => u.company_id == companyId);
    }
    return [rows];
  }

  // SELECT permissions
  if (cleanSql.includes('from employee_permissions')) {
    let companyId = params[0];
    let rows = mockDB.employee_permissions;
    if (companyId) {
      rows = rows.filter(p => p.company_id == companyId);
    }
    return [rows];
  }

  // SELECT collections
  if (cleanSql.includes('from collections')) {
    let companyId = params[0];
    let rows = mockDB.collections;
    if (companyId) {
      rows = rows.filter(c => c.company_id == companyId);
    }
    return [rows];
  }

  // INSERT collection
  if (cleanSql.startsWith('insert into collections')) {
    const [company_id, loan_id, collector_id, amount, payment_mode, notes, receipt_no] = params;
    const newId = 500 + mockDB.collections.length + 1;
    const record = {
      id: newId,
      company_id,
      loan_id,
      collector_id,
      amount: parseFloat(amount),
      collection_date: new Date().toISOString().split('T')[0],
      payment_mode: payment_mode || 'CASH',
      receipt_no: receipt_no || `REC-${Date.now()}`,
      notes
    };
    mockDB.collections.push(record);

    // Update loan pending amount & collected amount
    const loan = mockDB.loans.find(l => l.id == loan_id && l.company_id == company_id);
    if (loan) {
      loan.collected_amount += parseFloat(amount);
      loan.pending_amount = Math.max(0, loan.total_payable - loan.collected_amount);
      if (loan.pending_amount === 0) {
        loan.status = 'CLOSED';
      }
    }

    return [{ insertId: newId, affectedRows: 1 }];
  }

  // INSERT loan
  if (cleanSql.startsWith('insert into loans')) {
    const [company_id, loan_account_no, borrower_name, phone, principal_amount, interest_rate, tenure_days, installment_amount] = params;
    const total_payable = principal_amount * (1 + (interest_rate || 10) / 100);
    const newId = 100 + mockDB.loans.length + 1;
    const loan = {
      id: newId,
      company_id,
      loan_account_no: loan_account_no || `LN-${Date.now().toString().slice(-4)}`,
      borrower_name,
      phone,
      principal_amount: parseFloat(principal_amount),
      total_payable: parseFloat(total_payable),
      collected_amount: 0,
      pending_amount: parseFloat(total_payable),
      installment_amount: parseFloat(installment_amount),
      tenure_days: parseInt(tenure_days),
      status: 'ACTIVE',
      created_at: new Date()
    };
    mockDB.loans.push(loan);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  // UPDATE / INSERT permission
  if (cleanSql.includes('employee_permissions')) {
    return [{ affectedRows: 1 }];
  }

  return [[]];
}

export { mockDB };
