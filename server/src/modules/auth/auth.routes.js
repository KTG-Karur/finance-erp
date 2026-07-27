import * as authController from './auth.controller.js';

export default async function authRoutes(fastify, options) {
  // Step 1: Company Code Lookup (POST /api/v1/auth/company-lookup)
  fastify.post('/company-lookup', authController.companyLookupHandler);

  // Step 2: Tenant Login with Company Code (POST /api/v1/auth/tenant/login)
  fastify.post('/tenant/login', authController.tenantLoginHandler);

  // Super Admin Dedicated Login (POST /api/v1/auth/superadmin/login)
  fastify.post('/superadmin/login', authController.superAdminLoginHandler);

  // General Login Endpoint
  fastify.post('/login', authController.loginHandler);

  // Current authenticated user check
  fastify.get('/me', {
    onRequest: [fastify.authenticate]
  }, authController.getCurrentUserHandler);
}
