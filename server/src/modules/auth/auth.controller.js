import * as authService from './auth.service.js';

// Company Lookup Handler (POST /api/v1/auth/company-lookup)
export async function companyLookupHandler(request, reply) {
  try {
    const { company_code } = request.body || {};

    if (!company_code) {
      return reply.code(400).send({ error: 'Bad Request', message: 'Company Code is required.' });
    }

    const companyData = await authService.lookupCompanyByCode(request.server.masterDb, company_code);

    return reply.send({
      success: true,
      company: companyData
    });
  } catch (err) {
    return reply.code(404).send({ error: 'Not Found', message: err.message });
  }
}

// Tenant Login via Company Code (POST /api/v1/auth/tenant/login)
export async function tenantLoginHandler(request, reply) {
  try {
    const { company_code, email, password } = request.body || {};

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

    const token = request.server.jwt.sign({
      userId: userData.userId,
      companyId: userData.companyId,
      companyCode: userData.companyCode,
      companyName: userData.companyName,
      dbName: userData.dbName,
      role: userData.role,
      name: userData.name,
      email: userData.email,
      isGlobalAdmin: false
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

// Super Admin Login via Dedicated Route (POST /api/v1/auth/superadmin/login)
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
