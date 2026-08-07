import fp from 'fastify-plugin';
import { getTenantDbPool } from './tenantDb.js';

async function tenantGuardPlugin(fastify, options) {
  fastify.decorate('tenantGuard', async function (request, reply) {
    const isSuperAdmin = request.user?.role === 'SUPER_ADMIN';

    // 1. Identify Company Code from Header or Authenticated JWT User
    const companyCode = request.headers['x-company-code'] || request.user?.companyCode || 'ALPHA';
    const explicitDbName = request.headers['x-tenant-db'] || request.user?.dbName;

    let companyId = request.user?.companyId;
    let dbName = explicitDbName;

    // 2. Query master_erp_db dynamically by company_code to retrieve tenant db_name
    if (companyCode && !dbName) {
      try {
        const [rows] = await fastify.masterDb.query(
          'SELECT id, company_code, name, db_name, is_active FROM companies WHERE company_code = ?',
          [String(companyCode).toUpperCase()]
        );

        if (rows && rows.length > 0) {
          const company = rows[0];
          if (company.is_active !== 1) {
            return reply.code(403).send({
              success: false,
              message: `Tenant Company '${company.name}' (${company.company_code}) is suspended.`
            });
          }
          companyId = company.id;
          dbName = company.db_name;
        }
      } catch (err) {
        console.warn('[WARN] Master DB lookup warning in tenantGuard:', err.message);
      }
    }

    // Default fallback if master DB connection is offline
    if (!dbName) {
      dbName = 'finance_db_alpha';
      companyId = 1;
    }

    // 3. Impersonation Audit for Super Admin
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
        console.warn('[WARN] Impersonation audit log warning:', err.message);
      }
    }

    request.companyId = companyId;
    request.companyCode = companyCode;
    request.dbName = dbName;
    request.tenantDb = getTenantDbPool(dbName);
  });
}

export default fp(tenantGuardPlugin, {
  name: 'tenantGuard',
  dependencies: ['auth', 'tenantDb']
});
