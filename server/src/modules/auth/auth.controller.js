import * as authService from './auth.service.js';
import { provisionNewTenantCompany } from '../../core/tenantProvisioner.js';
import { getTenantDbPool } from '../../plugins/tenantDb.js';
import { assertValidEmail } from '../../shared/validators/contact.js';
import { assertValidGstin, assertValidPan } from '../../shared/validators/identity.js';

const GLOBAL_SCOPE_ROLES = ['ADMIN', 'COMPANY_ADMIN', 'SUPER_ADMIN'];

// Company Lookup Handler (POST /api/v1/auth/company-lookup)
export async function companyLookupHandler(request, reply) {
  try {
    const { company_code } = request.body || {};

    if (!company_code) {
      return reply.code(400).send({ error: 'Bad Request', message: 'Company Code is required.' });
    }

    const companyData = await authService.lookupCompanyByCode(request.server.masterDb, company_code);
    const tenantDb = getTenantDbPool(companyData.dbName);
    // 1, not companyData.companyId — see tenantGuard.js's request.tenantCompanyId
    // comment: tenant-DB rows are always company_id=1 by convention.
    const [branchRows] = await tenantDb.query('SELECT * FROM branches WHERE company_id = ?', [1]);
    const branches = branchRows.filter(b => b.is_active).map(b => ({ id: b.id, name: b.name, code: b.code }));

    return reply.send({
      success: true,
      company: { ...companyData, branches }
    });
  } catch (err) {
    return reply.code(404).send({ error: 'Not Found', message: err.message });
  }
}

// Compute seconds until midnight (23:59:59) of the subscription end date.
// If no subscription date is set, fall back to 24 hours.
function getTokenExpiry(subscriptionEndDate) {
  if (!subscriptionEndDate) return '24h';
  const midnight = new Date(subscriptionEndDate);
  midnight.setHours(23, 59, 59, 999);
  const diffSeconds = Math.floor((midnight.getTime() - Date.now()) / 1000);
  // If already expired (negative), return a very short TTL so the token is
  // immediately invalid — the login handler above already blocks this case,
  // but this is a defensive second layer.
  return diffSeconds > 0 ? diffSeconds : 1;
}

function issueFullToken(request, userData, branch) {
  const expiresIn = getTokenExpiry(userData.subscriptionEndDate);
  return request.server.jwt.sign({
    userId: userData.userId,
    companyId: userData.companyId,
    companyCode: userData.companyCode,
    companyName: userData.companyName,
    dbName: userData.dbName,
    // Only used as a fallback in tenantGuard when the master DB is unreachable —
    // the live path re-fetches these fresh on every request so a SuperAdmin's
    // branch-limit/module-allocation change takes effect without waiting for a
    // fresh login.
    maxBranches: userData.maxBranches ?? null,
    allowedModules: userData.allowedModules ?? null,
    role: userData.role,
    name: userData.name,
    email: userData.email,
    isGlobalAdmin: false,
    branchId: branch?.id || null,
    branchName: branch?.name || null,
    subCompanyId: branch?.sub_company_id || null
  }, { expiresIn });
}

// Tenant Login via Company Code (POST /api/v1/auth/tenant/login)
export async function tenantLoginHandler(request, reply) {
  try {
    const { company_code, email, password, login_context } = request.body || {};

    if (!company_code || !email || !password) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Company Code, Email, and Password are required.'
      });
    }

    const userData = await authService.authenticateTenantUserByCode(
      request.server.masterDb,
      company_code,
      email,
      password
    );

    const isCompanyAdmin = GLOBAL_SCOPE_ROLES.includes(userData.role);

    if (!login_context || login_context.type === 'COMPANY_ADMIN') {
      if (!isCompanyAdmin) {
        const err = new Error('These credentials are not registered as a Company Admin account.');
        err.statusCode = 403;
        throw err;
      }
      const token = issueFullToken(request, userData);
      return reply.send({ success: true, token, user: { ...userData, branchId: null, branchName: null } });
    }

    if (login_context.type === 'BRANCH') {
      if (isCompanyAdmin) {
        const err = new Error('This is a Company Admin account — sign in with "Company Admin" selected, not a branch.');
        err.statusCode = 403;
        throw err;
      }
      const tenantDb = getTenantDbPool(userData.dbName);
      const assignedBranches = await authService.resolveUserBranches(tenantDb, 1, userData.userId);
      const branch = assignedBranches.find(b => b.id == login_context.branch_id);
      if (!branch) {
        const err = new Error('These credentials are not authorized to log in to the selected branch.');
        err.statusCode = 403;
        throw err;
      }
      const token = issueFullToken(request, userData, branch);
      return reply.send({ success: true, token, user: { ...userData, branchId: branch.id, branchName: branch.name } });
    }

    return reply.code(400).send({ error: 'Bad Request', message: 'Invalid login context.' });
  } catch (err) {
    return reply.code(err.statusCode || 401).send({ error: 'Unauthorized', message: err.message });
  }
}

// Super Admin Login (POST /api/v1/auth/superadmin/login)
export async function superAdminLoginHandler(request, reply) {
  try {
    const { email, password } = request.body || {};

    if (!email || !password) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Super Admin Email and Password are required.'
      });
    }

    const userData = await authService.authenticateSuperAdmin(
      request.server.masterDb,
      email,
      password
    );

    const token = request.server.jwt.sign({
      userId: userData.userId,
      role: userData.role,
      name: userData.name,
      email: userData.email,
      isGlobalAdmin: true
    });

    return reply.send({
      success: true,
      token,
      user: userData
    });
  } catch (err) {
    return reply.code(401).send({ error: 'Unauthorized', message: err.message });
  }
}

export async function provisionCompanyHandler(request, reply) {
  try {
    const {
      company_code,
      name,
      admin_email,
      admin_password,
      company_email,
      company_phone,
      phone,
      address,
      logo,
      plan_id,
      plan_code,
      status,
      trial_days,
      billing_cycle,
      custom_expiry_date
    } = request.body || {};

    if (!company_code || !name) {
      return reply.code(400).send({ error: 'Bad Request', message: 'Company Code and Company Name are required.' });
    }
    assertValidEmail(admin_email, { fieldLabel: 'Admin email', required: false });

    const result = await provisionNewTenantCompany(request.server.masterDb, {
      company_code,
      name,
      admin_email,
      admin_password,
      company_email,
      company_phone: company_phone || phone,
      phone: phone || company_phone,
      address,
      logo,
      plan_id,
      plan_code,
      status: status || 'TRIAL',
      trial_days: Number(trial_days) || 15,
      billing_cycle: billing_cycle || '3_MONTHS',
      custom_expiry_date
    });

    await authService.insertSuperAdminAuditLog(request.server.masterDb, {
      superadminId: request.user?.userId,
      targetTenantId: result.companyId,
      action: 'TENANT_PROVISIONED',
      details: { companyCode: result.companyCode, dbName: result.dbName, planTier: result.planTier },
      ipAddress: request.ip
    });

    return reply.status(201).send({
      success: true,
      message: `Tenant Company '${name}' (${result.companyCode}) provisioned successfully with database '${result.dbName}'.`,
      company: result
    });
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ error: err.statusCode ? 'Bad Request' : 'Provisioning Error', message: err.message });
  }
}

// List Subscription Plans (GET /api/v1/auth/superadmin/plans)
export async function listPlansHandler(request, reply) {
  try {
    const data = await authService.listPlans(request.server.masterDb);
    return reply.send({ success: true, data });
  } catch (err) {
    return reply.code(500).send({ error: 'Server Error', message: err.message });
  }
}

// Create Subscription Plan (POST /api/v1/auth/superadmin/plans)
export async function createPlanHandler(request, reply) {
  try {
    const { name, code, max_branches, allowed_modules, monthly_price, yearly_price } = request.body || {};
    if (!name || !code) {
      return reply.code(400).send({ error: 'Bad Request', message: 'Plan Name and Code are required.' });
    }
    const data = await authService.createPlan(request.server.masterDb, {
      name, code, max_branches, allowed_modules, monthly_price, yearly_price
    });
    return reply.status(201).send({ success: true, message: 'Plan created successfully.', plan: data });
  } catch (err) {
    return reply.code(500).send({ error: 'Server Error', message: err.message });
  }
}

// Update Subscription Plan (PUT /api/v1/auth/superadmin/plans/:id)
export async function updatePlanHandler(request, reply) {
  try {
    const { id } = request.params;
    const { name, code, max_branches, allowed_modules, monthly_price, yearly_price } = request.body || {};
    if (!name || !code) {
      return reply.code(400).send({ error: 'Bad Request', message: 'Plan Name and Code are required.' });
    }
    const data = await authService.updatePlan(request.server.masterDb, id, {
      name, code, max_branches, allowed_modules, monthly_price, yearly_price
    });
    return reply.send({ success: true, message: 'Plan updated successfully.', plan: data });
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ error: 'Server Error', message: err.message });
  }
}

// List All Tenant Companies (GET /api/v1/auth/superadmin/companies)
export async function listCompaniesHandler(request, reply) {
  try {
    const { companies, summary } = await authService.listCompanies(request.server.masterDb);
    return reply.send({ success: true, data: companies, summary });
  } catch (err) {
    return reply.code(500).send({ error: 'Server Error', message: err.message });
  }
}

// Suspend/Activate a Tenant (PATCH /api/v1/auth/superadmin/companies/:id/status)
export async function updateCompanyStatusHandler(request, reply) {
  try {
    const { is_active } = request.body || {};
    if (is_active === undefined) {
      return reply.code(400).send({ error: 'Bad Request', message: 'is_active is required.' });
    }
    await authService.updateCompanyStatus(request.server.masterDb, request.params.id, is_active);
    await authService.insertSuperAdminAuditLog(request.server.masterDb, {
      superadminId: request.user?.userId,
      targetTenantId: request.params.id,
      action: 'TENANT_STATUS_CHANGE',
      details: { is_active: !!is_active },
      ipAddress: request.ip
    });
    return reply.send({ success: true, message: `Tenant ${is_active ? 'activated' : 'suspended'} successfully.` });
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ error: 'Server Error', message: err.message });
  }
}

// Update a Tenant's Company Profile, Branch Limit / Module Allocation (PATCH /api/v1/auth/superadmin/companies/:id/access)
export async function updateCompanyAccessHandler(request, reply) {
  try {
    const { name, phone, address, max_branches, allowed_modules, expiry_date, subscription_status, plan_tier } = request.body || {};
    await authService.updateCompanyAccess(request.server.masterDb, request.params.id, {
      name,
      phone,
      address,
      max_branches,
      allowed_modules,
      expiry_date,
      subscription_status,
      plan_tier
    });
    await authService.insertSuperAdminAuditLog(request.server.masterDb, {
      superadminId: request.user?.userId,
      targetTenantId: request.params.id,
      action: 'TENANT_ACCESS_UPDATED',
      details: {
        name: name ?? null,
        phone: phone ?? null,
        max_branches: max_branches ?? null,
        allowed_modules: allowed_modules ?? null,
        expiry_date: expiry_date ?? null,
        subscription_status: subscription_status ?? null,
        plan_tier: plan_tier ?? null
      },
      ipAddress: request.ip
    });
    return reply.send({ success: true, message: 'Tenant company profile and access settings updated successfully.' });
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ error: 'Server Error', message: err.message });
  }
}

// Central SuperAdmin Audit Trail (GET /api/v1/auth/superadmin/audit-logs)
export async function getAuditLogsHandler(request, reply) {
  try {
    const data = await authService.getAuditLogs(request.server.masterDb, request.query?.limit);
    return reply.send({ success: true, data });
  } catch (err) {
    return reply.code(500).send({ error: 'Server Error', message: err.message });
  }
}

// Reset Tenant Company Admin Password (PATCH /api/v1/auth/superadmin/companies/:id/reset-admin-password)
export async function resetAdminPasswordHandler(request, reply) {
  try {
    const { id } = request.params || {};
    const { password } = request.body || {};
    if (!password || password.trim().length < 4) {
      return reply.code(400).send({ error: 'Bad Request', message: 'Valid password (min 4 characters) is required.' });
    }
    const result = await authService.resetTenantAdminPassword(request.server.masterDb, id, password.trim());
    return reply.send({ success: true, message: result.message });
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ error: 'Server Error', message: err.message });
  }
}

export async function loginHandler(request, reply) {
  const { company_code } = request.body || {};
  if (company_code) {
    return tenantLoginHandler(request, reply);
  }
  return superAdminLoginHandler(request, reply);
}

// Tenant self-service Company Profile fetch (GET /api/v1/auth/company/profile)
export async function getOwnCompanyProfileHandler(request, reply) {
  try {
    const data = await authService.getOwnCompanyProfile(request.server.masterDb, request.companyId);
    return reply.send({ success: true, data });
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ error: 'Server Error', message: err.message });
  }
}

// Tenant self-service Company Profile update (PATCH /api/v1/auth/company/profile)
export async function updateOwnCompanyProfileHandler(request, reply) {
  try {
    const { name, gstin, pan, address, phone, logo, theme_color } = request.body || {};
    const companyCode = request.tenantCode || request.user?.companyCode || 'default';
    assertValidGstin(gstin);
    assertValidPan(pan);
    const data = await authService.updateOwnCompanyProfile(request.server.masterDb, request.companyId, {
      name,
      gstin: gstin ? String(gstin).trim().toUpperCase() : gstin,
      pan: pan ? String(pan).trim().toUpperCase() : pan,
      address, phone, logo, theme_color
    }, companyCode);
    return reply.send({ success: true, data });
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ error: 'Server Error', message: err.message });
  }
}

export async function getCurrentUserHandler(request, reply) {
  return reply.send({
    success: true,
    user: request.user
  });
}

// ── SuperAdmin Subscriptions Handlers ───────────────────────────────────────

export async function listSubscriptionsHandler(request, reply) {
  try {
    const data = await authService.listSubscriptions(request.server.masterDb);
    return reply.send({ success: true, data });
  } catch (err) {
    return reply.code(500).send({ error: 'Server Error', message: err.message });
  }
}

export async function createSubscriptionHandler(request, reply) {
  try {
    const { company_id, plan_id, status, start_date, end_date, auto_renew } = request.body || {};
    if (!company_id || !plan_id) {
      return reply.code(400).send({ error: 'Bad Request', message: 'Company and Plan are required.' });
    }
    const data = await authService.createSubscription(request.server.masterDb, {
      company_id, plan_id, status, start_date, end_date, auto_renew
    });
    return reply.status(201).send({ success: true, data });
  } catch (err) {
    return reply.code(500).send({ error: 'Server Error', message: err.message });
  }
}

export async function updateSubscriptionHandler(request, reply) {
  try {
    const { id } = request.params;
    const { plan_id, status, start_date, end_date, auto_renew } = request.body || {};
    const data = await authService.updateSubscription(request.server.masterDb, id, {
      plan_id, status, start_date, end_date, auto_renew
    });
    return reply.send({ success: true, data });
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ error: 'Server Error', message: err.message });
  }
}

export async function extendSubscriptionHandler(request, reply) {
  try {
    const { id } = request.params;
    const { days, status } = request.body || {};
    const data = await authService.extendSubscription(request.server.masterDb, id, {
      days: days || 30,
      status: status || 'ACTIVE'
    });
    return reply.send({ success: true, data });
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ error: 'Server Error', message: err.message });
  }
}

export async function renewSubscriptionHandler(request, reply) {
  try {
    const { id } = request.params;
    const { plan_id, duration_cycle, custom_expiry_date } = request.body || {};
    const data = await authService.renewSubscription(request.server.masterDb, id, {
      plan_id,
      duration_cycle: duration_cycle || '3_MONTHS',
      custom_expiry_date: custom_expiry_date || null
    });
    await authService.insertSuperAdminAuditLog(request.server.masterDb, {
      superadminId: request.user?.userId,
      targetTenantId: data.company_id,
      action: 'SUBSCRIPTION_MANUALLY_RENEWED',
      details: { subscriptionId: id, planId: data.plan_id, newExpiry: data.end_date, duration: duration_cycle },
      ipAddress: request.ip
    });
    return reply.send({ success: true, data, message: data.message });
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ error: 'Server Error', message: err.message });
  }
}

export async function flushPoolsHandler(request, reply) {
  try {
    const result = typeof request.server.flushTenantDbPools === 'function'
      ? await request.server.flushTenantDbPools()
      : { flushedCount: 0, closedDatabases: [] };

    await authService.insertSuperAdminAuditLog(request.server.masterDb, {
      superadminId: request.user?.userId,
      targetTenantId: null,
      action: 'DATABASE_POOLS_FLUSHED',
      details: result,
      ipAddress: request.ip
    });

    return reply.send({
      success: true,
      message: `Successfully flushed ${result.flushedCount} dynamic tenant database connection pool(s). Fresh connections will be allocated on demand.`,
      data: result
    });
  } catch (err) {
    return reply.code(500).send({ error: 'Server Error', message: err.message });
  }
}

export async function changeSuperAdminPasswordHandler(request, reply) {
  try {
    const { currentPassword, newPassword } = request.body || {};
    const superadminId = request.user?.userId;

    const result = await authService.changeSuperAdminPassword(request.server.masterDb, superadminId, {
      currentPassword,
      newPassword
    });

    await authService.insertSuperAdminAuditLog(request.server.masterDb, {
      superadminId,
      targetTenantId: null,
      action: 'SUPERADMIN_PASSWORD_CHANGED',
      details: { email: request.user?.email },
      ipAddress: request.ip
    });

    return reply.send({ success: true, message: result.message });
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ error: 'Error', message: err.message });
  }
}
