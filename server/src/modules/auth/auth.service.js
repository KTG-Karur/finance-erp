export async function lookupCompanyByCode(masterDb, companyCode) {
  if (!companyCode) {
    throw new Error('Company Code is required.');
  }

  const [rows] = await masterDb.execute(
    'SELECT id, company_code, name, db_name, is_active FROM companies WHERE company_code = ?',
    [companyCode.toUpperCase()]
  );

  if (!rows || rows.length === 0) {
    throw new Error(`Company Code '${companyCode}' not found. Please check and try again.`);
  }

  const company = rows[0];

  if (company.is_active !== 1) {
    throw new Error(`Company '${company.name}' (${company.company_code}) is currently inactive. Contact administrator.`);
  }

  return {
    companyId: company.id,
    companyCode: company.company_code,
    companyName: company.name,
    dbName: company.db_name
  };
}

export async function authenticateTenantUserByCode(masterDb, db, companyCode, email, password) {
  if (!companyCode || !email || !password) {
    throw new Error('Company Code, Email, and Password are required.');
  }

  // Step 1: Query master_erp_db.companies for tenant DB name by company_code
  const company = await lookupCompanyByCode(masterDb, companyCode);

  // Step 2: Query the tenant's user directory for a matching account
  const [companyUsers] = await db.query(
    'SELECT id, company_id, name, email, password, role, status FROM users WHERE company_id = ?',
    [company.companyId]
  );
  const userData = companyUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!userData || userData.password !== password) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  return {
    userId: userData.id,
    companyId: company.companyId,
    companyCode: company.companyCode,
    companyName: company.companyName,
    dbName: company.dbName,
    role: userData.role || 'COMPANY_ADMIN',
    name: userData.name || 'Company User',
    email: userData.email,
    isGlobalAdmin: false
  };
}

export async function resolveUserBranches(db, companyId, userId) {
  const [assignments] = await db.query('SELECT * FROM user_branches WHERE user_id = ? AND company_id = ?', [userId, companyId]);
  const [allBranches] = await db.query('SELECT * FROM branches WHERE company_id = ?', [companyId]);
  return assignments
    .map(a => allBranches.find(b => b.id == a.branch_id))
    .filter(Boolean)
    .map(b => ({ id: b.id, name: b.name, code: b.code, sub_company_id: b.sub_company_id }));
}

export async function authenticateSuperAdmin(masterDb, email, password) {
  if (!email || !password) {
    throw new Error('Super Admin Email and Password are required.');
  }

  const [rows] = await masterDb.execute(
    'SELECT u.id, u.email, u.password_hash, u.role, u.name ' +
    'FROM master_users u WHERE u.email = ? AND u.role = "SUPER_ADMIN"',
    [email]
  );

  if (!rows || rows.length === 0) {
    throw new Error('Invalid Super Admin credentials.');
  }

  const user = rows[0];

  if (user.password_hash !== password) {
    throw new Error('Invalid Super Admin credentials.');
  }

  return {
    userId: user.id,
    companyId: null,
    companyCode: 'GLOBAL',
    companyName: 'Central Master System',
    dbName: 'master_erp_db',
    role: 'SUPER_ADMIN',
    name: user.name || 'Global Super Admin',
    email: user.email,
    isGlobalAdmin: true
  };
}

export async function authenticateMasterUser(masterDb, email, password) {
  return authenticateSuperAdmin(masterDb, email, password);
}
