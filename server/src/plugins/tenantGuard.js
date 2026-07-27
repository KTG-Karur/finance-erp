import fp from 'fastify-plugin';
import { getTenantDbPool } from './tenantDb.js';

async function tenantGuardPlugin(fastify, options) {
  fastify.decorate('tenantGuard', async function (request, reply) {
    const isSuperAdmin = request.user?.role === 'SUPER_ADMIN';

    // Super Admin can override target dbName via x-tenant-db header
    const dbName = request.headers['x-tenant-db'] || request.user?.dbName || 'tenant_alpha_db';
    const companyId = Number(request.headers['x-company-id']) || request.user?.companyId || 1;

    if (!dbName && !isSuperAdmin) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Tenant database mapping (dbName) missing. Request blocked by TenantGuard.'
      });
    }

    if (isSuperAdmin && request.headers['x-tenant-db']) {
      try {
        await fastify.masterDb.query(
          `INSERT INTO superadmin_audit_logs (superadmin_id, target_tenant_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)`,
          [
            request.user.id || 99,
            companyId,
            'SUPER_ADMIN_IMPERSONATION',
            JSON.stringify({ targetDb: dbName, url: request.url, method: request.method }),
            request.ip
          ]
        );
      } catch (err) {
        console.warn('⚠️ Impersonation audit log warning:', err.message);
      }
    }

    request.companyId = companyId;
    request.dbName = dbName;
    request.tenantDb = getTenantDbPool(dbName);
  });
}

export default fp(tenantGuardPlugin, {
  name: 'tenantGuard',
  dependencies: ['auth', 'tenantDb']
});

