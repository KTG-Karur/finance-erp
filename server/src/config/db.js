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
    { id: 3, company_id: 1, name: 'Mike Manager', email: 'mike@alpha.com', role: 'BRANCH_ADMIN', status: 'ACTIVE' },
    { id: 4, company_id: 1, name: 'Kumar Karur', email: 'kumar@alpha.com', role: 'BRANCH_ADMIN', status: 'ACTIVE' },
    { id: 5, company_id: 1, name: 'Ravi Namakkal', email: 'ravi@alpha.com', role: 'BRANCH_ADMIN', status: 'ACTIVE' }
  ],
  employee_permissions: [
    { id: 1, company_id: 1, user_id: 2, module: 'LOANS', action: 'VIEW', allowed: 1 },
    { id: 2, company_id: 1, user_id: 2, module: 'COLLECTIONS', action: 'COLLECT', allowed: 1 },
    { id: 3, company_id: 1, user_id: 3, module: 'LOANS', action: 'CREATE', allowed: 1 },
    { id: 4, company_id: 1, user_id: 3, module: 'EMPLOYEES', action: 'MANAGE', allowed: 1 }
  ],
  borrowers: [
    { id: 1, company_id: 1, borrower_code: 'BR-0001', full_name: 'Rajesh Kumar', phone: '9876543210', alt_phone: '', email: '', dob: '1985-04-12', gender: 'MALE', address_line1: 'Main St 123', address_line2: '', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001', aadhaar_number: '458912348971', pan_number: 'ABCDE1234F', occupation: 'Business', monthly_income: 45000, employer_name: '', guarantor_name: 'Mahesh Kumar', guarantor_phone: '9876500001', nominee_name: '', nominee_relation: '', branch: 'Main Branch', kyc_status: 'VERIFIED', kyc_verified_at: '2026-05-01', kyc_expiry_date: '2028-05-01', kyc_rejection_reason: null, kyc_reviewed_by: 'John Admin', kyc_reviewed_at: '2026-05-01', status: 'ACTIVE', notes: '', created_at: new Date(), updated_at: new Date() },
    { id: 2, company_id: 1, borrower_code: 'BR-0002', full_name: 'Priya Sharma', phone: '9812345678', alt_phone: '', email: '', dob: '1990-09-23', gender: 'FEMALE', address_line1: 'Market Road 45', address_line2: '', city: 'Chennai', state: 'Tamil Nadu', pincode: '600002', aadhaar_number: '891234567890', pan_number: 'XYZPD9876K', occupation: 'Salaried', monthly_income: 38000, employer_name: 'ABC Textiles', guarantor_name: 'Sunil Sharma', guarantor_phone: '9812300002', nominee_name: '', nominee_relation: '', branch: 'Main Branch', kyc_status: 'VERIFIED', kyc_verified_at: '2026-04-15', kyc_expiry_date: '2028-04-15', kyc_rejection_reason: null, kyc_reviewed_by: 'John Admin', kyc_reviewed_at: '2026-04-15', status: 'ACTIVE', notes: '', created_at: new Date(), updated_at: new Date() },
    { id: 3, company_id: 1, borrower_code: 'BR-0003', full_name: 'Suresh Patel', phone: '9988776655', alt_phone: '', email: '', dob: '1992-01-18', gender: 'MALE', address_line1: '', address_line2: '', city: '', state: '', pincode: '', aadhaar_number: '776655443322', pan_number: 'MNBVC9876L', occupation: 'Business', monthly_income: null, employer_name: '', guarantor_name: 'Dinesh Patel', guarantor_phone: '9988700002', nominee_name: '', nominee_relation: '', branch: 'Main Branch', kyc_status: 'PENDING', kyc_verified_at: null, kyc_expiry_date: null, kyc_rejection_reason: null, kyc_reviewed_by: null, kyc_reviewed_at: null, status: 'ACTIVE', notes: '', created_at: new Date(), updated_at: new Date() }
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
  ],
  sub_companies: [
    { id: 1, company_id: 1, name: 'Sub-Company A1', code: 'A1', is_active: 1, created_at: new Date() },
    { id: 2, company_id: 1, name: 'Sub-Company A2', code: 'A2', is_active: 1, created_at: new Date() }
  ],
  branches: [
    { id: 1, company_id: 1, sub_company_id: 1, name: 'Karur Branch', code: 'KRM', address: '', is_active: 1, created_at: new Date() },
    { id: 2, company_id: 1, sub_company_id: 1, name: 'Namakkal Branch', code: 'NKL', address: '', is_active: 1, created_at: new Date() },
    { id: 3, company_id: 1, sub_company_id: 1, name: 'Salem Branch', code: 'SLM', address: '', is_active: 1, created_at: new Date() },
    { id: 4, company_id: 1, sub_company_id: 2, name: 'Chennai Branch', code: 'CHN', address: '', is_active: 1, created_at: new Date() },
    { id: 5, company_id: 1, sub_company_id: 2, name: 'Madurai Branch', code: 'MDU', address: '', is_active: 1, created_at: new Date() }
  ],
  // Every branch-scoped user (admin or employee) belongs to exactly ONE branch.
  // Company Admins (GLOBAL_SCOPE_ROLES) have no row here — they manage all branches.
  user_branches: [
    { id: 1, company_id: 1, user_id: 2, branch_id: 1 }, // Sarah Collector -> Karur (employee)
    { id: 2, company_id: 1, user_id: 4, branch_id: 1 }, // Kumar Karur -> Karur (branch admin)
    { id: 3, company_id: 1, user_id: 5, branch_id: 2 }, // Ravi Namakkal -> Namakkal (branch admin)
    { id: 4, company_id: 1, user_id: 3, branch_id: 4 }  // Mike Manager -> Chennai (branch admin)
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

  // SELECT borrowers (list)
  if (cleanSql.startsWith('select') && cleanSql.includes('from borrowers') && cleanSql.includes('where company_id')) {
    const companyId = params[0];
    return [mockDB.borrowers.filter(b => b.company_id == companyId)];
  }

  // SELECT single borrower by id
  if (cleanSql.startsWith('select') && cleanSql.includes('from borrowers') && cleanSql.includes('id = ?')) {
    const [id, companyId] = params;
    return [mockDB.borrowers.filter(b => b.id == id && b.company_id == companyId)];
  }

  // INSERT borrower
  if (cleanSql.startsWith('insert into borrowers')) {
    const [
      company_id, borrower_code, full_name, phone, alt_phone, email, dob, gender,
      address_line1, address_line2, city, state, pincode, aadhaar_number, pan_number,
      occupation, monthly_income, employer_name, guarantor_name, guarantor_phone,
      nominee_name, nominee_relation, branch, kyc_status, notes
    ] = params;
    const newId = mockDB.borrowers.length
      ? Math.max(...mockDB.borrowers.map(b => b.id)) + 1
      : 1;
    const record = {
      id: newId, company_id, borrower_code, full_name, phone, alt_phone, email, dob, gender,
      address_line1, address_line2, city, state, pincode, aadhaar_number, pan_number,
      occupation, monthly_income: monthly_income != null ? parseFloat(monthly_income) : null,
      employer_name, guarantor_name, guarantor_phone, nominee_name, nominee_relation,
      branch, kyc_status: kyc_status || 'PENDING', kyc_verified_at: null, kyc_expiry_date: null,
      status: 'ACTIVE', notes, created_at: new Date(), updated_at: new Date()
    };
    mockDB.borrowers.push(record);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  // UPDATE borrower KYC status (verify/reject)
  if (cleanSql.startsWith('update borrowers set kyc_status')) {
    const [kyc_status, kyc_verified_at, kyc_expiry_date, kyc_rejection_reason, kyc_reviewed_by, kyc_reviewed_at, id, companyId] = params;
    const record = mockDB.borrowers.find(b => b.id == id && b.company_id == companyId);
    if (!record) return [{ affectedRows: 0 }];
    record.kyc_status = kyc_status;
    record.kyc_verified_at = kyc_verified_at;
    record.kyc_expiry_date = kyc_expiry_date;
    record.kyc_rejection_reason = kyc_rejection_reason;
    record.kyc_reviewed_by = kyc_reviewed_by;
    record.kyc_reviewed_at = kyc_reviewed_at;
    record.updated_at = new Date();
    return [{ affectedRows: 1 }];
  }

  // UPDATE borrower (full profile edit)
  if (cleanSql.startsWith('update borrowers')) {
    // Last two params are always id, company_id (per updateBorrower query below)
    const id = params[params.length - 2];
    const companyId = params[params.length - 1];
    const record = mockDB.borrowers.find(b => b.id == id && b.company_id == companyId);
    if (!record) return [{ affectedRows: 0 }];

    const fieldNames = [
      'full_name', 'phone', 'alt_phone', 'email', 'dob', 'gender',
      'address_line1', 'address_line2', 'city', 'state', 'pincode', 'aadhaar_number', 'pan_number',
      'occupation', 'monthly_income', 'employer_name', 'guarantor_name', 'guarantor_phone',
      'nominee_name', 'nominee_relation', 'branch', 'kyc_status', 'status', 'notes'
    ];
    fieldNames.forEach((field, idx) => {
      record[field] = field === 'monthly_income' && params[idx] != null ? parseFloat(params[idx]) : params[idx];
    });
    record.updated_at = new Date();
    return [{ affectedRows: 1 }];
  }

  // DELETE borrower
  if (cleanSql.startsWith('delete from borrowers')) {
    const [id, companyId] = params;
    const idx = mockDB.borrowers.findIndex(b => b.id == id && b.company_id == companyId);
    if (idx === -1) return [{ affectedRows: 0 }];
    mockDB.borrowers.splice(idx, 1);
    return [{ affectedRows: 1 }];
  }

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

  // INSERT employee/user
  if (cleanSql.startsWith('insert into users')) {
    const [company_id, name, email, role, status] = params;
    const newId = mockDB.users.length ? Math.max(...mockDB.users.map(u => u.id)) + 1 : 1;
    mockDB.users.push({ id: newId, company_id, name, email, role, status: status || 'ACTIVE' });
    return [{ insertId: newId, affectedRows: 1 }];
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

  // ── Sub-Companies ──────────────────────────────────────────
  if (cleanSql.startsWith('select') && cleanSql.includes('from sub_companies')) {
    const companyId = params[0];
    return [mockDB.sub_companies.filter(s => s.company_id == companyId)];
  }
  if (cleanSql.startsWith('insert into sub_companies')) {
    const [company_id, name, code] = params;
    const newId = mockDB.sub_companies.length ? Math.max(...mockDB.sub_companies.map(s => s.id)) + 1 : 1;
    const record = { id: newId, company_id, name, code, is_active: 1, created_at: new Date() };
    mockDB.sub_companies.push(record);
    return [{ insertId: newId, affectedRows: 1 }];
  }
  if (cleanSql.startsWith('update sub_companies')) {
    const [name, code, is_active, id, companyId] = params;
    const record = mockDB.sub_companies.find(s => s.id == id && s.company_id == companyId);
    if (!record) return [{ affectedRows: 0 }];
    record.name = name; record.code = code; record.is_active = is_active ? 1 : 0;
    return [{ affectedRows: 1 }];
  }
  if (cleanSql.startsWith('delete from sub_companies')) {
    const [id, companyId] = params;
    const idx = mockDB.sub_companies.findIndex(s => s.id == id && s.company_id == companyId);
    if (idx === -1) return [{ affectedRows: 0 }];
    mockDB.sub_companies.splice(idx, 1);
    return [{ affectedRows: 1 }];
  }

  // ── Branches ───────────────────────────────────────────────
  if (cleanSql.startsWith('select') && cleanSql.includes('from branches')) {
    const companyId = params[0];
    return [mockDB.branches.filter(b => b.company_id == companyId)];
  }
  if (cleanSql.startsWith('insert into branches')) {
    const [company_id, sub_company_id, name, code, address] = params;
    const newId = mockDB.branches.length ? Math.max(...mockDB.branches.map(b => b.id)) + 1 : 1;
    const record = { id: newId, company_id, sub_company_id: sub_company_id || null, name, code, address: address || '', is_active: 1, created_at: new Date() };
    mockDB.branches.push(record);
    return [{ insertId: newId, affectedRows: 1 }];
  }
  if (cleanSql.startsWith('update branches')) {
    const [sub_company_id, name, code, address, is_active, id, companyId] = params;
    const record = mockDB.branches.find(b => b.id == id && b.company_id == companyId);
    if (!record) return [{ affectedRows: 0 }];
    record.sub_company_id = sub_company_id || null;
    record.name = name; record.code = code; record.address = address || ''; record.is_active = is_active ? 1 : 0;
    return [{ affectedRows: 1 }];
  }
  if (cleanSql.startsWith('delete from branches')) {
    const [id, companyId] = params;
    const idx = mockDB.branches.findIndex(b => b.id == id && b.company_id == companyId);
    if (idx === -1) return [{ affectedRows: 0 }];
    mockDB.branches.splice(idx, 1);
    return [{ affectedRows: 1 }];
  }

  // ── User <-> Branch Assignments ───────────────────────────
  if (cleanSql.startsWith('select') && cleanSql.includes('from user_branches')) {
    if (cleanSql.includes('user_id = ?')) {
      const [userId, companyId] = params;
      return [mockDB.user_branches.filter(ub => ub.user_id == userId && ub.company_id == companyId)];
    }
    const companyId = params[0];
    return [mockDB.user_branches.filter(ub => ub.company_id == companyId)];
  }
  if (cleanSql.startsWith('insert into user_branches')) {
    const [company_id, user_id, branch_id] = params;
    const newId = mockDB.user_branches.length ? Math.max(...mockDB.user_branches.map(ub => ub.id)) + 1 : 1;
    mockDB.user_branches.push({ id: newId, company_id, user_id, branch_id });
    return [{ insertId: newId, affectedRows: 1 }];
  }
  if (cleanSql.startsWith('delete from user_branches where user_id')) {
    const [userId, companyId] = params;
    mockDB.user_branches = mockDB.user_branches.filter(ub => !(ub.user_id == userId && ub.company_id == companyId));
    return [{ affectedRows: 1 }];
  }

  return [[]];
}

export { mockDB };
