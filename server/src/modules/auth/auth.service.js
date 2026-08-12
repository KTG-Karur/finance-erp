import { getTenantDbPool } from '../../plugins/tenantDb.js';
import { assertMaxFileSize } from '../../shared/validators/fileSize.js';

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

export async function lookupCompanyByCode(masterDb, companyCode) {
  if (!companyCode) {
    throw new Error('Company Code is required.');
  }

  const [rows] = await masterDb.execute(
    'SELECT id, company_code, name, db_name, is_active, max_branches, allowed_modules FROM companies WHERE company_code = ?',
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
    dbName: company.db_name,
    maxBranches: company.max_branches ?? null,
    allowedModules: parseAllowedModules(company.allowed_modules)
  };
}

// MySQL's JSON column type returns an already-parsed value via mysql2, but this
// keeps lookupCompanyByCode safe regardless of driver/column-type quirks.
function parseAllowedModules(value) {
  if (value == null) return null;
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function authenticateTenantUserByCode(masterDb, companyCode, email, password) {
  if (!companyCode || !email || !password) {
    throw new Error('Company Code, Email, and Password are required.');
  }

  // Step 1: Query master_erp_db.companies for tenant DB name by company_code
  const company = await lookupCompanyByCode(masterDb, companyCode);

  // Step 2: Query the tenant's own user directory for a matching account.
  // This MUST be the tenant pool for company.dbName, not fastify's `db`
  // decorator — that's permanently aliased to masterDb (see plugins/db.js),
  // so passing it here was silently authenticating against the wrong
  // database (master, which has no `users` table matching this schema).
  // Filter by the tenant-DB-local convention (always 1 — see tenantGuard.js's
  // request.tenantCompanyId comment), NOT company.companyId (the master DB's
  // numeric id, which varies per tenant and would only ever match by coincidence
  // for whichever tenant happens to be master id 1).
  const tenantDb = getTenantDbPool(company.dbName);
  const [companyUsers] = await tenantDb.query(
    'SELECT id, company_id, name, email, password, role, status FROM users WHERE company_id = ?',
    [1]
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
    maxBranches: company.maxBranches,
    allowedModules: company.allowedModules,
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

// ── SuperAdmin tenant management ────────────────────────────────────────────

export async function listCompanies(masterDb) {
  const [rows] = await masterDb.query(
    'SELECT id, name, company_code, db_name, plan_tier, max_branches, allowed_modules, phone, address, logo, is_active, created_at FROM companies ORDER BY id'
  );
  const result = [];
  for (const row of rows) {
    let userCount = 0;
    try {
      const tenantDb = getTenantDbPool(row.db_name);
      const [uRows] = await tenantDb.query('SELECT COUNT(*) as cnt FROM users');
      userCount = uRows[0]?.cnt || 0;
    } catch {
      userCount = 1;
    }
    result.push({
      ...row,
      users_count: userCount,
      allowed_modules: parseAllowedModules(row.allowed_modules)
    });
  }
  return result;
}

export async function updateCompanyStatus(masterDb, id, isActive) {
  const [result] = await masterDb.execute('UPDATE companies SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
  if (!result.affectedRows) {
    const err = new Error('Tenant company not found.');
    err.statusCode = 404;
    throw err;
  }
}

export async function updateCompanyAccess(masterDb, id, { name, phone, address, max_branches, allowed_modules }) {
  const [result] = await masterDb.execute(
    'UPDATE companies SET name = COALESCE(?, name), phone = COALESCE(?, phone), address = COALESCE(?, address), max_branches = ?, allowed_modules = ? WHERE id = ?',
    [name ?? null, phone ?? null, address ?? null, max_branches ?? null, allowed_modules ? JSON.stringify(allowed_modules) : null, id]
  );
  if (!result.affectedRows) {
    const err = new Error('Tenant company not found.');
    err.statusCode = 404;
    throw err;
  }
}

export async function getOwnCompanyProfile(masterDb, companyId) {
  const [rows] = await masterDb.query(
    'SELECT id, name, company_code, gstin, pan, address, phone, logo, theme_color FROM companies WHERE id = ?',
    [companyId]
  );
  if (!rows.length) {
    const err = new Error('Company not found.');
    err.statusCode = 404;
    throw err;
  }
  return rows[0];
}

// Self-service Company Profile edit (tenant's own Company Admin) — deliberately
// separate from updateCompanyAccess above (SuperAdmin-only): a tenant can rename
// itself / update its GSTIN / logo / theme color, but can never touch
// max_branches or allowed_modules through this path — those stay exclusively
// SuperAdmin-managed. theme_color is a DB column (not client localStorage) so
// every user of this tenant — any device, any browser — sees the same brand
// color, matching how gstin/logo/etc already work.
export async function updateOwnCompanyProfile(masterDb, companyId, { name, gstin, pan, address, phone, logo, theme_color }) {
  assertMaxFileSize(logo, MAX_LOGO_BYTES, 'Company logo');
  const [result] = await masterDb.execute(
    `UPDATE companies SET
      name = COALESCE(?, name), gstin = COALESCE(?, gstin), pan = COALESCE(?, pan),
      address = COALESCE(?, address), phone = COALESCE(?, phone), logo = COALESCE(?, logo),
      theme_color = COALESCE(?, theme_color)
     WHERE id = ?`,
    [name ?? null, gstin ?? null, pan ?? null, address ?? null, phone ?? null, logo ?? null, theme_color ?? null, companyId]
  );
  if (!result.affectedRows) {
    const err = new Error('Company not found.');
    err.statusCode = 404;
    throw err;
  }
  const [rows] = await masterDb.query(
    'SELECT id, name, company_code, gstin, pan, address, phone, logo, theme_color FROM companies WHERE id = ?',
    [companyId]
  );
  return rows[0];
}

export async function resetTenantAdminPassword(masterDb, id, newPassword) {
  const [rows] = await masterDb.query('SELECT db_name, company_code FROM companies WHERE id = ?', [id]);
  if (!rows.length) {
    const err = new Error('Tenant company not found.');
    err.statusCode = 404;
    throw err;
  }
  const tenant = rows[0];
  const tenantDb = getTenantDbPool(tenant.db_name);
  await tenantDb.query(
    "UPDATE users SET password = ? WHERE role = 'COMPANY_ADMIN' OR id = 1",
    [newPassword]
  );
  return { success: true, message: `Admin password updated for company '${tenant.company_code}'.` };
}

export async function insertSuperAdminAuditLog(masterDb, { superadminId, targetTenantId, action, details, ipAddress }) {
  try {
    await masterDb.execute(
      'INSERT INTO superadmin_audit_logs (superadmin_id, target_tenant_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)',
      [superadminId, targetTenantId ?? null, action, JSON.stringify(details || {}), ipAddress || null]
    );
  } catch (err) {
    console.warn('[WARN] Failed to write superadmin audit log:', err.message);
  }
}

export async function getAuditLogs(masterDb, limit = 100) {
  // Inlined rather than parameterized — mysql2's prepared-statement protocol
  // (execute()) doesn't reliably bind LIMIT as a placeholder across versions.
  // Safe here since `safeLimit` is clamped to an actual integer, never raw input.
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const [rows] = await masterDb.query(
    'SELECT l.id, l.action, l.details, l.ip_address, l.created_at, l.target_tenant_id, u.email AS actor_email, c.name AS target_company_name, c.company_code AS target_company_code ' +
    'FROM superadmin_audit_logs l ' +
    'LEFT JOIN master_users u ON u.id = l.superadmin_id ' +
    'LEFT JOIN companies c ON c.id = l.target_tenant_id ' +
    `ORDER BY l.created_at DESC LIMIT ${safeLimit}`
  );
  return rows.map(row => ({
    ...row,
    details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details
  }));
}

let isSixMonthColumnChecked = false;
async function ensureSixMonthPriceColumn(masterDb) {
  if (isSixMonthColumnChecked) return;
  try {
    await masterDb.query('ALTER TABLE plans ADD COLUMN six_month_price DECIMAL(10,2) DEFAULT 0.00');
  } catch (err) {
    // Column already exists (ER_DUP_FIELDNAME / ER_CANT_DROP_FIELD_OR_KEY)
  }
  isSixMonthColumnChecked = true;
}

export async function listPlans(masterDb) {
  await ensureSixMonthPriceColumn(masterDb);
  const [rows] = await masterDb.query(
    'SELECT id, name, code, max_branches, allowed_modules, monthly_price, six_month_price, yearly_price, is_active, created_at FROM plans WHERE is_active = 1 ORDER BY id'
  );
  return rows.map(row => ({ ...row, allowed_modules: parseAllowedModules(row.allowed_modules) }));
}

export async function createPlan(masterDb, { name, code, max_branches, allowed_modules, monthly_price, six_month_price, yearly_price }) {
  await ensureSixMonthPriceColumn(masterDb);
  const codeUpper = String(code).trim().toUpperCase();
  const [res] = await masterDb.execute(
    'INSERT INTO plans (name, code, max_branches, allowed_modules, monthly_price, six_month_price, yearly_price, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
    [name, codeUpper, max_branches ?? null, allowed_modules ? JSON.stringify(allowed_modules) : null, monthly_price || 0.00, six_month_price || 0.00, yearly_price || 0.00]
  );
  return { id: res.insertId, name, code: codeUpper, max_branches, allowed_modules, monthly_price, six_month_price, yearly_price };
}

export async function updatePlan(masterDb, id, { name, code, max_branches, allowed_modules, monthly_price, six_month_price, yearly_price }) {
  await ensureSixMonthPriceColumn(masterDb);
  const codeUpper = String(code).trim().toUpperCase();
  const [res] = await masterDb.execute(
    'UPDATE plans SET name = ?, code = ?, max_branches = ?, allowed_modules = ?, monthly_price = ?, six_month_price = ?, yearly_price = ? WHERE id = ?',
    [name, codeUpper, max_branches ?? null, allowed_modules ? JSON.stringify(allowed_modules) : null, monthly_price || 0.00, six_month_price || 0.00, yearly_price || 0.00, id]
  );
  if (!res.affectedRows) {
    const err = new Error('Subscription plan not found.');
    err.statusCode = 404;
    throw err;
  }
  return { id, name, code: codeUpper, max_branches, allowed_modules, monthly_price, six_month_price, yearly_price };
}
