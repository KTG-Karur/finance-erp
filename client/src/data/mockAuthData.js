// Mock data for the login flow only — no backend involved.
//
// Hierarchy:
//   Knock The Globe Technologies (platform/super admin, not part of this list)
//     -> Company (tenant, e.g. Alpha Financial Services Ltd)
//          -> exactly ONE Company Admin (company-wide, no branch)
//          -> Branches (e.g. Karur, Namakkal)
//               -> exactly ONE Branch Admin per branch
//               -> Employees, each tied to exactly ONE branch

// Super Admin (Knock The Globe Technologies) provisions each tenant with a fixed
// set of subscribed modules — only these appear on that company's module selector.
export const MOCK_COMPANIES = [
  {
    companyId: 1,
    companyCode: 'ALPHA',
    companyName: 'Alpha Financial Services Ltd',
    dbName: 'tenant_alpha_db',
    subscribedModules: ['financial-erp', 'gold-loan', 'chit-fund'],
    branches: [
      { id: 1, name: 'Karur Branch', code: 'KRM' },
      { id: 2, name: 'Namakkal Branch', code: 'NKL' },
      { id: 3, name: 'Salem Branch', code: 'SLM' }
    ]
  },
  {
    companyId: 2,
    companyCode: 'BETA',
    companyName: 'Beta Microfinance Pvt Ltd',
    dbName: 'tenant_beta_db',
    subscribedModules: ['financial-erp'],
    branches: [
      { id: 4, name: 'Chennai Branch', code: 'CHN' }
    ]
  }
];

// role: 'COMPANY_ADMIN' (no branchId) | 'BRANCH_ADMIN' (one branchId) | 'EMPLOYEE' (one branchId)
export const MOCK_USERS = [
  { userId: 1, companyCode: 'ALPHA', email: 'admin@alpha.com', password: 'admin123', name: 'John Admin', role: 'COMPANY_ADMIN', branchId: null },
  { userId: 2, companyCode: 'ALPHA', email: 'karuradmin@alpha.com', password: 'karur123', name: 'Kumar Karur', role: 'BRANCH_ADMIN', branchId: 1 },
  { userId: 3, companyCode: 'ALPHA', email: 'sarah@alpha.com', password: 'sarah123', name: 'Sarah Collector', role: 'EMPLOYEE', branchId: 1 },
  { userId: 4, companyCode: 'ALPHA', email: 'namakkaladmin@alpha.com', password: 'namakkal123', name: 'Ravi Namakkal', role: 'BRANCH_ADMIN', branchId: 2 },
  { userId: 5, companyCode: 'ALPHA', email: 'mani@alpha.com', password: 'mani123', name: 'Mani Kumar', role: 'EMPLOYEE', branchId: 2 },
  { userId: 6, companyCode: 'BETA', email: 'admin@beta.com', password: 'beta123', name: 'Divya Admin', role: 'COMPANY_ADMIN', branchId: null },
  { userId: 7, companyCode: 'BETA', email: 'chennaiadmin@beta.com', password: 'chennai123', name: 'Arjun Chennai', role: 'BRANCH_ADMIN', branchId: 4 }
];

export function findCompanyByCode(code) {
  if (!code) return null;
  const upper = code.trim().toUpperCase();
  return MOCK_COMPANIES.find(c => c.companyCode === upper) || null;
}

export function findUser(companyCode, email, password) {
  return MOCK_USERS.find(u =>
    u.companyCode === companyCode &&
    u.email.toLowerCase() === email.trim().toLowerCase() &&
    u.password === password
  ) || null;
}
