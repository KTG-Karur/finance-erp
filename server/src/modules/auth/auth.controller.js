import * as authService from './auth.service.js';
import { provisionNewTenantCompany } from '../../core/tenantProvisioner.js';
import { getTenantDbPool } from '../../plugins/tenantDb.js';

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

function issueFullToken(request, userData, branch) {
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
  });
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

// Super Admin Provision Company (POST /api/v1/auth/superadmin/companies)
export async function provisionCompanyHandler(request, reply) {
  try {
    const { company_code, name, admin_email, admin_password } = request.body || {};

    if (!company_code || !name) {
      return reply.code(400).send({ error: 'Bad Request', message: 'Company Code and Company Name are required.' });
    }

    const result = await provisionNewTenantCompany(request.server.masterDb, {
      company_code,
      name,
      admin_email,
      admin_password
    });

    await authService.insertSuperAdminAuditLog(request.server.masterDb, {
      superadminId: request.user?.userId,
      targetTenantId: result.companyId,
      action: 'TENANT_PROVISIONED',
      details: { companyCode: result.companyCode, dbName: result.dbName },
      ipAddress: request.ip
    });

    return reply.status(201).send({
      success: true,
      message: `Tenant Company '${name}' (${result.companyCode}) provisioned successfully with database '${result.dbName}'.`,
      company: result
    });
  } catch (err) {
    return reply.code(500).send({ error: 'Provisioning Error', message: err.message });
  }
}

// List All Tenant Companies (GET /api/v1/auth/superadmin/companies)
export async function listCompaniesHandler(request, reply) {
  try {
    const data = await authService.listCompanies(request.server.masterDb);
    return reply.send({ success: true, data });
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

// Update a Tenant's Branch Limit / Module Allocation (PATCH /api/v1/auth/superadmin/companies/:id/access)
export async function updateCompanyAccessHandler(request, reply) {
  try {
    const { max_branches, allowed_modules } = request.body || {};
    await authService.updateCompanyAccess(request.server.masterDb, request.params.id, { max_branches, allowed_modules });
    await authService.insertSuperAdminAuditLog(request.server.masterDb, {
      superadminId: request.user?.userId,
      targetTenantId: request.params.id,
      action: 'TENANT_ACCESS_UPDATED',
      details: { max_branches: max_branches ?? null, allowed_modules: allowed_modules ?? null },
      ipAddress: request.ip
    });
    return reply.send({ success: true, message: 'Tenant access settings updated successfully.' });
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

export async function loginHandler(request, reply) {
  const { company_code } = request.body || {};
  if (company_code) {
    return tenantLoginHandler(request, reply);
  }
  return superAdminLoginHandler(request, reply);
}

export async function getCurrentUserHandler(request, reply) {
  return reply.send({
    success: true,
    user: request.user
  });
}
