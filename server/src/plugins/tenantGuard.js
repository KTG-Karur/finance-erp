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

    // 1. Identify Company Code from the verified JWT only — never a client header.
    // By the time this preHandler runs, fastify.authenticate (onRequest) has
    // already verified the token, so request.user.companyCode is tamper-proof.
    // A client-supplied `x-company-code` header used to take priority over it,
    // which meant ANY authenticated user could be silently routed into a
    // different tenant's database just by sending a different header value —
    // and since the client's axios interceptor always sent a hardcoded
    // 'ALPHA' default (nothing ever set the real tenant's code there), every
    // request for every real tenant was misrouted to a company code that
    // usually doesn't exist, falling through to a dead 'finance_db_alpha'
    // default and crashing with "Unknown database".
    const companyCode = request.user?.companyCode;

    let companyId = request.user?.companyId;
    let dbName = request.user?.dbName || null;
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

          // Subscription expiry enforcement — checked on every request so that
          // revoked/expired subscriptions take effect immediately without waiting
          // for token expiry. Query only ACTIVE/TRIAL subscriptions; EXPIRED/SUSPENDED
          // ones must not grant access.
          try {
            const [subRows] = await fastify.masterDb.query(
              'SELECT end_date FROM subscriptions WHERE company_id = ? AND status IN ("ACTIVE","TRIAL") ORDER BY end_date DESC LIMIT 1',
              [company.id]
            );
            if (subRows && subRows.length > 0 && subRows[0].end_date) {
              const midnight = new Date(subRows[0].end_date);
              midnight.setHours(23, 59, 59, 999);
              if (new Date() > midnight) {
                return reply.code(403).send({
                  success: false,
                  message: 'Your company subscription has expired. Please renew to continue using the system.',
                  code: 'SUBSCRIPTION_EXPIRED'
                });
              }
            }
          } catch (subErr) {
            // Non-fatal — if the subscription check fails (master DB blip), fail
            // open rather than locking out the tenant unexpectedly.
            console.warn('[WARN] Subscription check warning in tenantGuard:', subErr.message);
          }
        }
      } catch (err) {
        // Master DB unreachable — fail open using whatever the JWT already
        // carried (unlimited/unrestricted if it carried nothing), consistent with
        // this app's existing offline-fallback philosophy elsewhere (moduleGuard).
        console.warn('[WARN] Master DB lookup warning in tenantGuard:', err.message);
      }
    }

    if (!dbName) {
      return reply.code(403).send({
        success: false,
        message: 'Unable to resolve your tenant company/database. Please log in again.'
      });
    }

    // Note: there's no SuperAdmin impersonation path through this guard — SUPER_ADMIN
    // requests are rejected outright above, before reaching here.

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
