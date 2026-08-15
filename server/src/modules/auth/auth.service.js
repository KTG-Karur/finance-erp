import bcrypt from 'bcryptjs';
import { getTenantDbPool } from '../../plugins/tenantDb.js';
import { assertMaxFileSize } from '../../shared/validators/fileSize.js';
import { saveBase64File, getCompanyStorageStats, getTotalUploadsStorageStats } from '../../shared/utils/fileStorage.js';

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

  // Fetch active subscription end date for token expiry enforcement
  let subscriptionEndDate = null;
  try {
    const [subRows] = await masterDb.execute(
      'SELECT end_date FROM subscriptions WHERE company_id = ? AND status IN ("ACTIVE","TRIAL") ORDER BY end_date DESC LIMIT 1',
      [company.id]
    );
    if (subRows && subRows.length > 0 && subRows[0].end_date) {
      subscriptionEndDate = new Date(subRows[0].end_date);
    }
  } catch { /* non-fatal — proceed without subscription date */ }

  return {
    companyId: company.id,
    companyCode: company.company_code,
    companyName: company.name,
    dbName: company.db_name,
    maxBranches: company.max_branches ?? null,
    allowedModules: parseAllowedModules(company.allowed_modules),
    subscriptionEndDate
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

  const company = await lookupCompanyByCode(masterDb, companyCode);

  // Block login if subscription has already expired (past midnight of end date)
  if (company.subscriptionEndDate) {
    const midnight = new Date(company.subscriptionEndDate);
    midnight.setHours(23, 59, 59, 999);
    if (new Date() > midnight) {
      const err = new Error(
        `Your company subscription expired on ${company.subscriptionEndDate.toISOString().slice(0, 10)}. ` +
        'Please contact your administrator to renew the subscription.'
      );
      err.statusCode = 403;
      throw err;
    }
  }

  const tenantDb = getTenantDbPool(company.dbName);
  const [companyUsers] = await tenantDb.query(
    'SELECT id, company_id, name, email, password, role, status FROM users WHERE company_id = ?',
    [1]
  );
  const userData = companyUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!userData) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  let isValid = false;
  if (userData.password && userData.password.startsWith('$2')) {
    isValid = await bcrypt.compare(password, userData.password);
  } else if (userData.password === password) {
    isValid = true;
    // Transparently upgrade legacy plaintext password to secure bcrypt hash
    const hashed = await bcrypt.hash(password, 10);
    await tenantDb.query('UPDATE users SET password = ? WHERE id = ?', [hashed, userData.id]);
  }

  if (!isValid) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  const [permissions] = await tenantDb.query(
    'SELECT module, action, allowed FROM employee_permissions WHERE user_id = ?',
    [userData.id]
  );

  return {
    userId: userData.id,
    companyId: company.companyId,
    companyCode: company.companyCode,
    companyName: company.companyName,
    dbName: company.dbName,
    maxBranches: company.maxBranches,
    allowedModules: company.allowedModules,
    subscriptionEndDate: company.subscriptionEndDate,
    role: userData.role || 'COMPANY_ADMIN',
    name: userData.name || 'Company User',
    email: userData.email,
    permissions: permissions || [],
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

  let isValid = false;
  if (user.password_hash && user.password_hash.startsWith('$2')) {
    isValid = await bcrypt.compare(password, user.password_hash);
  } else if (user.password_hash === password) {
    isValid = true;
    // Transparently upgrade legacy plaintext password to secure bcrypt hash
    const hashed = await bcrypt.hash(password, 10);
    await masterDb.execute('UPDATE master_users SET password_hash = ? WHERE id = ?', [hashed, user.id]);
  }

  if (!isValid) {
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

export async function changeSuperAdminPassword(masterDb, userId, { currentPassword, newPassword }) {
  if (!newPassword || newPassword.length < 6) {
    const err = new Error('New password must be at least 6 characters long.');
    err.statusCode = 400;
    throw err;
  }

  const [rows] = await masterDb.execute(
    'SELECT id, email, password_hash, role FROM master_users WHERE id = ? AND role = "SUPER_ADMIN"',
    [userId]
  );

  if (!rows || rows.length === 0) {
    const err = new Error('Super Admin account not found.');
    err.statusCode = 404;
    throw err;
  }

  const user = rows[0];

  if (currentPassword) {
    let isValid = false;
    if (user.password_hash && user.password_hash.startsWith('$2')) {
      isValid = await bcrypt.compare(currentPassword, user.password_hash);
    } else if (user.password_hash === currentPassword) {
      isValid = true;
    }
    if (!isValid) {
      const err = new Error('Current password is incorrect.');
      err.statusCode = 400;
      throw err;
    }
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await masterDb.execute('UPDATE master_users SET password_hash = ? WHERE id = ?', [newHash, userId]);

  return { success: true, message: 'Super Admin password updated successfully.' };
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

    const storage = await getCompanyStorageStats(row.company_code);

    let subscription = null;
    try {
      const [subRows] = await masterDb.query(
        'SELECT s.*, p.name AS plan_name, p.code AS plan_code FROM subscriptions s LEFT JOIN plans p ON s.plan_id = p.id WHERE s.company_id = ? ORDER BY s.id DESC LIMIT 1',
        [row.id]
      );
      if (subRows.length > 0) {
        subscription = subRows[0];
      }
    } catch {
      // Ignored
    }

    const subStatus = subscription ? subscription.status : 'TRIAL';

    result.push({
      ...row,
      users_count: userCount,
      storage_bytes: storage.bytes,
      storage_formatted: storage.formatted,
      subscription_status: subStatus,
      subscription_end_date: subscription?.end_date || null,
      subscription_plan_name: subscription?.plan_name || row.plan_tier,
      subscription_plan_code: subscription?.plan_code || row.plan_tier,
      subscription_auto_renew: subscription ? Boolean(subscription.auto_renew) : true,
      allowed_modules: parseAllowedModules(row.allowed_modules)
    });
  }

  const totalStorage = await getTotalUploadsStorageStats();

  // Compute total subscription revenue from all active subscriptions
  let totalRevenue = 0;
  try {
    const [subRows] = await masterDb.query(`
      SELECT s.status, s.start_date, s.end_date, p.monthly_price, p.six_month_price, p.yearly_price
      FROM subscriptions s
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE s.status = 'ACTIVE'
    `);
    for (const sub of subRows) {
      const mPrice = Number(sub.monthly_price) || 2999;
      const yPrice = sub.yearly_price ? Number(sub.yearly_price) : mPrice * 10;
      const hPrice = sub.six_month_price ? Number(sub.six_month_price) : mPrice * 5.5;

      let termDays = 90;
      if (sub.start_date && sub.end_date) {
        const diff = (new Date(sub.end_date) - new Date(sub.start_date)) / (1000 * 60 * 60 * 24);
        if (diff > 0) termDays = Math.round(diff);
      }

      if (termDays >= 300) {
        totalRevenue += yPrice;
      } else if (termDays >= 150) {
        totalRevenue += Math.round(hPrice);
      } else if (termDays >= 60) {
        totalRevenue += (mPrice * 3);
      } else {
        totalRevenue += mPrice;
      }
    }
  } catch (err) {
    // Non-critical fallback
  }

  return {
    companies: result,
    summary: {
      total_companies: result.length,
      active_companies: result.filter(c => c.is_active).length,
      total_users: result.reduce((sum, c) => sum + (c.users_count || 1), 0),
      total_storage_bytes: totalStorage.bytes,
      total_storage_formatted: totalStorage.formatted,
      total_revenue: totalRevenue
    }
  };
}

export async function updateCompanyStatus(masterDb, id, isActive) {
  const [result] = await masterDb.execute('UPDATE companies SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
  if (!result.affectedRows) {
    const err = new Error('Tenant company not found.');
    err.statusCode = 404;
    throw err;
  }
}

export async function updateCompanyAccess(masterDb, id, { name, phone, address, logo, max_branches, allowed_modules, expiry_date, subscription_status, plan_tier }) {
  // Check if company exists first
  const [existingCompany] = await masterDb.query('SELECT id, company_code, plan_tier FROM companies WHERE id = ?', [id]);
  if (!existingCompany.length) {
    const err = new Error('Tenant company not found.');
    err.statusCode = 404;
    throw err;
  }

  let diskLogo = logo;
  if (logo && typeof logo === 'string' && logo.startsWith('data:')) {
    const code = existingCompany[0].company_code || 'default';
    diskLogo = await saveBase64File(logo, code, 'company-info', 'company_logo');
  }

  // Resolve plan_id if plan_tier is provided
  let newPlanId = null;
  if (plan_tier) {
    const [planRows] = await masterDb.query(
      'SELECT id, code FROM plans WHERE UPPER(code) = UPPER(?) OR UPPER(name) = UPPER(?) LIMIT 1',
      [plan_tier, plan_tier]
    );
    if (planRows.length > 0) {
      newPlanId = planRows[0].id;
    }
  }

  const subStatus = subscription_status ? subscription_status.toUpperCase() : undefined;
  const isCompanyActive = subStatus ? (subStatus === 'EXPIRED' || subStatus === 'CANCELLED' ? 0 : 1) : null;

  await masterDb.execute(
    'UPDATE companies SET name = COALESCE(?, name), phone = COALESCE(?, phone), address = COALESCE(?, address), logo = COALESCE(?, logo), max_branches = ?, allowed_modules = ?, plan_tier = COALESCE(?, plan_tier), is_active = COALESCE(?, is_active) WHERE id = ?',
    [
      name ?? null,
      phone ?? null,
      address ?? null,
      diskLogo ?? null,
      max_branches ?? null,
      allowed_modules ? JSON.stringify(allowed_modules) : null,
      plan_tier ?? null,
      isCompanyActive,
      id
    ]
  );

  if (expiry_date !== undefined || subStatus !== undefined || newPlanId !== null) {
    const [subRows] = await masterDb.query(
      'SELECT id FROM subscriptions WHERE company_id = ? ORDER BY id DESC LIMIT 1',
      [id]
    );

    const formattedExpiry = expiry_date ? String(expiry_date).slice(0, 10) : null;

    if (subRows.length > 0) {
      const subId = subRows[0].id;
      const updates = [];
      const params = [];
      if (expiry_date !== undefined && formattedExpiry) {
        updates.push('end_date = ?');
        params.push(formattedExpiry);
      }
      if (subStatus !== undefined) {
        updates.push('status = ?');
        params.push(subStatus);
      }
      if (newPlanId !== null) {
        updates.push('plan_id = ?');
        params.push(newPlanId);
      }
      if (updates.length > 0) {
        params.push(subId);
        await masterDb.execute(`UPDATE subscriptions SET ${updates.join(', ')} WHERE id = ?`, params);
      }
    } else if (formattedExpiry || subStatus || newPlanId) {
      await masterDb.query(
        'INSERT INTO subscriptions (company_id, plan_id, status, start_date, end_date, auto_renew) VALUES (?, ?, ?, NOW(), ?, 1)',
        [id, newPlanId, subStatus || 'ACTIVE', formattedExpiry || new Date().toISOString().slice(0, 10)]
      );
    }
  }
}

export async function getOwnCompanyProfile(masterDb, companyId) {
  const [rows] = await masterDb.query(
    `SELECT c.id, c.name, c.company_code, c.gstin, c.pan, c.address, c.phone, c.logo, c.theme_color, c.plan_tier, c.max_branches, c.allowed_modules, c.is_active,
            s.id as subscription_id, s.status as subscription_status, s.start_date as subscription_start_date, s.end_date as subscription_end_date, s.auto_renew as subscription_auto_renew,
            p.name as plan_name, p.code as plan_code, p.monthly_price, p.yearly_price
     FROM companies c
     LEFT JOIN subscriptions s ON s.company_id = c.id
     LEFT JOIN plans p ON s.plan_id = p.id
     WHERE c.id = ?
     ORDER BY s.id DESC LIMIT 1`,
    [companyId]
  );
  if (!rows.length) {
    const err = new Error('Company not found.');
    err.statusCode = 404;
    throw err;
  }
  const comp = rows[0];
  let remainingDays = null;
  if (comp.subscription_end_date) {
    const diff = Math.ceil((new Date(comp.subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24));
    remainingDays = diff > 0 ? diff : 0;
  }
  return {
    ...comp,
    allowed_modules: parseAllowedModules(comp.allowed_modules),
    remaining_days: remainingDays
  };
}

// Self-service Company Profile edit (tenant's own Company Admin) — deliberately
// separate from updateCompanyAccess above (SuperAdmin-only): a tenant can rename
// itself / update its GSTIN / logo / theme color, but can never touch
// max_branches or allowed_modules through this path — those stay exclusively
// SuperAdmin-managed. theme_color is a DB column (not client localStorage) so
// every user of this tenant — any device, any browser — sees the same brand
// color, matching how gstin/logo/etc already work.
export async function updateOwnCompanyProfile(masterDb, companyId, { name, gstin, pan, address, phone, logo, theme_color }, companyCode = 'default') {
  assertMaxFileSize(logo, MAX_LOGO_BYTES, 'Company logo');

  let diskLogo = logo;
  if (logo && typeof logo === 'string' && logo.startsWith('data:')) {
    diskLogo = await saveBase64File(logo, companyCode, 'company-info', 'company_logo');
  }

  const [result] = await masterDb.execute(
    `UPDATE companies SET
      name = COALESCE(?, name), gstin = COALESCE(?, gstin), pan = COALESCE(?, pan),
      address = COALESCE(?, address), phone = COALESCE(?, phone), logo = COALESCE(?, logo),
      theme_color = COALESCE(?, theme_color)
     WHERE id = ?`,
    [name ?? null, gstin ?? null, pan ?? null, address ?? null, phone ?? null, diskLogo ?? null, theme_color ?? null, companyId]
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
  const hashedPassword = newPassword.startsWith('$2') ? newPassword : await bcrypt.hash(newPassword, 10);
  await tenantDb.query(
    "UPDATE users SET password = ? WHERE role = 'COMPANY_ADMIN' OR id = 1",
    [hashedPassword]
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

// ── SuperAdmin Subscriptions Management ─────────────────────────────────────

export async function listSubscriptions(masterDb) {
  const [rows] = await masterDb.query(`
    SELECT 
      s.id,
      s.company_id,
      s.plan_id,
      s.status,
      s.start_date,
      s.end_date,
      s.auto_renew,
      s.created_at,
      c.name AS company_name,
      c.company_code,
      c.is_active AS company_is_active,
      p.name AS plan_name,
      p.code AS plan_code,
      p.monthly_price,
      p.six_month_price,
      p.yearly_price,
      p.max_branches,
      p.allowed_modules
    FROM subscriptions s
    JOIN companies c ON s.company_id = c.id
    LEFT JOIN plans p ON s.plan_id = p.id
    ORDER BY s.id DESC
  `);

  const now = new Date();
  return rows.map(r => {
    let daysRemaining = null;
    let isExpiringSoon = false;
    let isExpired = false;

    if (r.end_date) {
      const diffMs = new Date(r.end_date).getTime() - now.getTime();
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (daysRemaining <= 0) {
        isExpired = true;
      } else if (daysRemaining <= 15) {
        isExpiringSoon = true;
      }
    }

    return {
      ...r,
      days_remaining: daysRemaining,
      is_expiring_soon: isExpiringSoon,
      is_expired: isExpired,
      allowed_modules: parseAllowedModules(r.allowed_modules)
    };
  });
}

export async function createSubscription(masterDb, { company_id, plan_id, status = 'ACTIVE', start_date, end_date, auto_renew = 0 }) {
  const [res] = await masterDb.query(`
    INSERT INTO subscriptions (company_id, plan_id, status, start_date, end_date, auto_renew)
    VALUES (?, ?, ?, COALESCE(?, NOW()), ?, ?)
  `, [company_id, plan_id, status, start_date || null, end_date || null, auto_renew ? 1 : 0]);

  // Sync plan_tier in companies table
  const [planRows] = await masterDb.query('SELECT code, max_branches, allowed_modules FROM plans WHERE id = ?', [plan_id]);
  if (planRows.length > 0) {
    await masterDb.query('UPDATE companies SET plan_tier = ? WHERE id = ?', [planRows[0].code, company_id]);
  }

  return { id: res.insertId, company_id, plan_id, status, message: 'Subscription assigned successfully.' };
}

export async function updateSubscription(masterDb, id, { plan_id, status, start_date, end_date, auto_renew }) {
  const [existing] = await masterDb.query('SELECT * FROM subscriptions WHERE id = ?', [id]);
  if (!existing.length) {
    const err = new Error('Subscription not found.');
    err.statusCode = 404;
    throw err;
  }

  await masterDb.execute(`
    UPDATE subscriptions SET
      plan_id = COALESCE(?, plan_id),
      status = COALESCE(?, status),
      start_date = COALESCE(?, start_date),
      end_date = COALESCE(?, end_date),
      auto_renew = COALESCE(?, auto_renew)
    WHERE id = ?
  `, [plan_id ?? null, status ?? null, start_date ?? null, end_date ?? null, auto_renew !== undefined ? (auto_renew ? 1 : 0) : null, id]);

  if (plan_id) {
    const [planRows] = await masterDb.query('SELECT code FROM plans WHERE id = ?', [plan_id]);
    if (planRows.length > 0) {
      await masterDb.query('UPDATE companies SET plan_tier = ? WHERE id = ?', [planRows[0].code, existing[0].company_id]);
    }
  }

  if (status) {
    const isCompActive = (status.toUpperCase() === 'ACTIVE' || status.toUpperCase() === 'TRIAL') ? 1 : 0;
    await masterDb.execute('UPDATE companies SET is_active = ? WHERE id = ?', [isCompActive, existing[0].company_id]);
  }

  return { id, message: 'Subscription updated successfully.' };
}

export async function extendSubscription(masterDb, id, { days = 30, status = 'ACTIVE' }) {
  const [existing] = await masterDb.query('SELECT * FROM subscriptions WHERE id = ?', [id]);
  if (!existing.length) {
    const err = new Error('Subscription not found.');
    err.statusCode = 404;
    throw err;
  }

  const currentEnd = existing[0].end_date ? new Date(existing[0].end_date) : new Date();
  const baseDate = currentEnd.getTime() > Date.now() ? currentEnd : new Date();
  baseDate.setDate(baseDate.getDate() + Number(days));

  await masterDb.execute(`
    UPDATE subscriptions SET
      end_date = ?,
      status = ?
    WHERE id = ?
  `, [baseDate, status, id]);

  if (status === 'ACTIVE' || status === 'TRIAL') {
    await masterDb.execute('UPDATE companies SET is_active = 1 WHERE id = ?', [existing[0].company_id]);
  }

  return { id, new_end_date: baseDate, status, message: `Subscription extended by ${days} days.` };
}

export async function renewSubscription(masterDb, id, { plan_id, duration_cycle = '3_MONTHS', custom_expiry_date = null }) {
  const [existing] = await masterDb.query('SELECT * FROM subscriptions WHERE id = ?', [id]);
  if (!existing.length) {
    const err = new Error('Subscription not found.');
    err.statusCode = 404;
    throw err;
  }

  const companyId = existing[0].company_id;
  const currentPlanId = plan_id || existing[0].plan_id;

  let days = 90;
  if (duration_cycle === '1_YEAR' || duration_cycle === 'ANNUAL') {
    days = 365;
  } else if (duration_cycle === '6_MONTHS') {
    days = 180;
  } else if (duration_cycle === '3_MONTHS') {
    days = 90;
  } else if (duration_cycle === '1_MONTH') {
    days = 30;
  } else if (Number(duration_cycle)) {
    days = Number(duration_cycle);
  }

  const currentEnd = existing[0].end_date ? new Date(existing[0].end_date) : new Date();
  const startDate = new Date();
  let endDate;

  if (custom_expiry_date) {
    endDate = new Date(custom_expiry_date);
  } else {
    const baseDate = currentEnd.getTime() > Date.now() ? currentEnd : new Date();
    baseDate.setDate(baseDate.getDate() + days);
    endDate = baseDate;
  }

  const formattedEnd = endDate.toISOString().slice(0, 10);
  const formattedStart = startDate.toISOString().slice(0, 10);

  await masterDb.execute(`
    UPDATE subscriptions SET
      plan_id = ?,
      status = 'ACTIVE',
      start_date = ?,
      end_date = ?,
      auto_renew = 0
    WHERE id = ?
  `, [currentPlanId, formattedStart, formattedEnd, id]);

  if (currentPlanId) {
    const [planRows] = await masterDb.query('SELECT code FROM plans WHERE id = ?', [currentPlanId]);
    if (planRows.length > 0) {
      await masterDb.execute('UPDATE companies SET plan_tier = ?, is_active = 1 WHERE id = ?', [planRows[0].code, companyId]);
    } else {
      await masterDb.execute('UPDATE companies SET is_active = 1 WHERE id = ?', [companyId]);
    }
  } else {
    await masterDb.execute('UPDATE companies SET is_active = 1 WHERE id = ?', [companyId]);
  }

  return {
    id,
    company_id: companyId,
    plan_id: currentPlanId,
    status: 'ACTIVE',
    start_date: formattedStart,
    end_date: formattedEnd,
    auto_renew: 0,
    message: `Subscription manually renewed successfully until ${formattedEnd}.`
  };
}
