import * as authController from './auth.controller.js';

// Credential-guessing endpoints (company code, passwords) still get a tighter cap
// than the app-wide default (300/min), but loose enough that normal retries during
// dev/testing (typos, multiple people testing logins, etc.) don't get blocked —
// only sustained high-volume guessing (60+ attempts inside a minute) trips it.
const bruteForceGuard = {
  config: {
    rateLimit: { max: 60, timeWindow: '1 minute' }
  }
};

export default async function authRoutes(fastify, options) {
  // Step 1: Company Code Lookup (POST /api/v1/auth/company-lookup)
  fastify.post('/company-lookup', bruteForceGuard, authController.companyLookupHandler);

  // Step 2: Tenant Login with Company Code (POST /api/v1/auth/tenant/login)
  fastify.post('/tenant/login', bruteForceGuard, authController.tenantLoginHandler);

  // Super Admin Dedicated Login (POST /api/v1/auth/superadmin/login)
  fastify.post('/superadmin/login', bruteForceGuard, authController.superAdminLoginHandler);

  // Every /superadmin/* management endpoint below requires a valid SuperAdmin
  // session — provisioning previously had no guard at all.
  const superAdminOnly = { onRequest: [fastify.authenticate, fastify.requireSuperAdmin] };

  // Tenant Registry: list, provision, suspend/activate, branch-limit + module
  // allocation (POST/GET/PATCH /api/v1/auth/superadmin/companies...)
  fastify.get('/superadmin/companies', superAdminOnly, authController.listCompaniesHandler);
  fastify.post('/superadmin/companies', superAdminOnly, authController.provisionCompanyHandler);
  fastify.patch('/superadmin/companies/:id/status', superAdminOnly, authController.updateCompanyStatusHandler);
  fastify.patch('/superadmin/companies/:id/access', superAdminOnly, authController.updateCompanyAccessHandler);
  fastify.patch('/superadmin/companies/:id/reset-admin-password', superAdminOnly, authController.resetAdminPasswordHandler);

  // Subscription Plans management (GET/POST/PUT /api/v1/auth/superadmin/plans)
  fastify.get('/superadmin/plans', superAdminOnly, authController.listPlansHandler);
  fastify.post('/superadmin/plans', superAdminOnly, authController.createPlanHandler);
  fastify.put('/superadmin/plans/:id', superAdminOnly, authController.updatePlanHandler);

  // Central Audit Trail (GET /api/v1/auth/superadmin/audit-logs)
  fastify.get('/superadmin/audit-logs', superAdminOnly, authController.getAuditLogsHandler);

  // General Login Endpoint
  fastify.post('/login', bruteForceGuard, authController.loginHandler);

  // Current authenticated user check
  fastify.get('/me', {
    onRequest: [fastify.authenticate]
  }, authController.getCurrentUserHandler);
}
