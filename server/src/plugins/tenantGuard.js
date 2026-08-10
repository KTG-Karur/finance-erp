import fp from 'fastify-plugin';
import { getTenantDbPool } from './tenantDb.js';

function parseAllowedModules(value) {
  if (value == null) return null;
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function tenantGuardPlugin(fastify, options) {
  fastify.decorate('tenantGuard', async function (request, reply) {
    // Super Admin cannot access tenant routes directly
    if (request.user?.role === 'SUPER_ADMIN') {
      return reply.code(403).send({
        success: false,
        message: 'Super Admin users cannot access tenant company workspaces directly. Please log in as a company user.'
      });
    }

    // 1. Identify Company Code from Header or Authenticated JWT User
    const companyCode = request.headers['x-company-code'] || request.user?.companyCode || 'ALPHA';

    let companyId = request.user?.companyId;
    let dbName = null;
    let maxBranches = request.user?.maxBranches ?? null;
    let allowedModules = parseAllowedModules(request.user?.allowedModules);

    if (companyCode) {
      try {
        const [rows] = await fastify.masterDb.query(
          'SELECT id, company_code, name, db_name, is_active, max_branches, allowed_modules FROM companies WHERE company_code = ?',
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
          maxBranches = company.max_branches;
          allowedModules = parseAllowedModules(company.allowed_modules);
        }
      } catch (err) {
        // Master DB unreachable — fail open using whatever the JWT already
        // carried (unlimited/unrestricted if it carried nothing), consistent with
        // this app's existing offline-fallback philosophy elsewhere (moduleGuard).
        console.warn('[WARN] Master DB lookup warning in tenantGuard:', err.message);
        dbName = dbName || request.user?.dbName;
      }
    }

    // Default fallback if master DB connection is offline
    if (!dbName) {
      dbName = 'finance_db_alpha';
      companyId = 1;
    }

    // 3. Impersonation Audit for Super Admin
    if (isSuperAdmin && impersonationDbName) {
      try {
        await fastify.masterDb.query(
          `INSERT INTO superadmin_audit_logs (superadmin_id, target_tenant_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)`,
          [
            request.user.userId,
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
    request.companyMaxBranches = maxBranches;
    request.companyAllowedModules = allowedModules;
    // request.companyId above is the MASTER DB's numeric company id (varies per
    // tenant: 1, 2, 3...) — useful for master-DB lookups/audit logs, but wrong for
    // filtering rows WITHIN a tenant's own isolated database. Database-per-tenant
    // means a tenant DB only ever holds one company's data, and every row in it
    // (users, branches, ...) is seeded/created with company_id = 1 by convention
    // (see the tenant migration's comment on the `users` table). Any query filtering
    // a tenant-DB table needs THIS constant, not request.companyId — using the
    // master id there silently returns zero rows for every tenant except the one
    // whose master id happens to be 1.
    request.tenantCompanyId = 1;
  });
}

export default fp(tenantGuardPlugin, {
  name: 'tenantGuard',
  dependencies: ['auth', 'tenantDb']
});
