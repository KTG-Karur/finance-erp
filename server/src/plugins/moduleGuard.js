import fp from 'fastify-plugin';

function moduleGuard(moduleName, requiredAction = 'VIEW') {
  return async function (request, reply) {
    const userRole = request.user?.role || 'ADMIN';
    const userId = request.user?.userId;
    const companyId = request.companyId;

    // Super Admin & Company Admin bypass granular permission checks
    if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
      return;
    }

    if (!userId || !companyId) {
      return reply.code(403).send({ error: 'Forbidden', message: 'User context unverified.' });
    }

    try {
      if (request.tenantDb && typeof request.tenantDb.execute === 'function') {
        const [rows] = await request.tenantDb.execute(
          'SELECT allowed FROM employee_permissions WHERE user_id = ? AND module = ? AND action = ?',
          [userId, moduleName, requiredAction]
        );

        const isAllowed = rows && rows.length > 0 ? Boolean(rows[0].allowed) : true;

        if (!isAllowed) {
          return reply.code(403).send({
            error: 'Permission Denied',
            message: `User does not have permission to execute action '${requiredAction}' on module '${moduleName}'.`
          });
        }
      }
    } catch (err) {
      // In offline fallback mode, log warning and allow request
      console.warn('⚠️ moduleGuard fallback check:', err.message);
    }
  };
}

// Dashboard aggregates loan/collection/borrower records into KPIs and a
// summary table — it reads the exact same rows the Loans/Collections/
// Borrowers pages do, so its data can't be independently permissioned in the
// database sense. What CAN be independent is which permission unlocks it: a
// staff member granted only DASHBOARD/VIEW (and explicitly denied LOANS/VIEW)
// should still see a working dashboard, and someone granted LOANS/VIEW but not
// DASHBOARD/VIEW should still see their Loans page. moduleGuardAny checks a
// list of (module, action) pairs and passes if ANY one of them is allowed.
function moduleGuardAny(checks) {
  return async function (request, reply) {
    const userRole = request.user?.role || 'ADMIN';
    if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') return;

    const userId = request.user?.userId;
    const companyId = request.companyId;
    if (!userId || !companyId) {
      return reply.code(403).send({ error: 'Forbidden', message: 'User context unverified.' });
    }

    try {
      if (request.tenantDb && typeof request.tenantDb.execute === 'function') {
        for (const [moduleName, requiredAction] of checks) {
          const [rows] = await request.tenantDb.execute(
            'SELECT allowed FROM employee_permissions WHERE user_id = ? AND module = ? AND action = ?',
            [userId, moduleName, requiredAction]
          );
          const isAllowed = rows && rows.length > 0 ? Boolean(rows[0].allowed) : true;
          if (isAllowed) return; // any one match is enough
        }
        return reply.code(403).send({
          error: 'Permission Denied',
          message: `User does not have permission for any of: ${checks.map(([m, a]) => `${m}/${a}`).join(', ')}.`
        });
      }
    } catch (err) {
      console.warn('⚠️ moduleGuardAny fallback check:', err.message);
    }
  };
}

// A different, higher-level concern than moduleGuard above: that one asks "can
// THIS STAFF MEMBER do this action" (per-employee RBAC, employee_permissions
// table); this asks "is THIS TENANT even licensed for this module at all" (set by
// SuperAdmin on companies.allowed_modules, decorated onto the request by
// tenantGuard as request.companyAllowedModules). Even a tenant's own Company
// Admin is subject to this — only SUPER_ADMIN bypasses it, since they're the one
// managing the restriction, not subject to it.
function requireTenantModule(moduleKey) {
  return async function (request, reply) {
    if (request.user?.role === 'SUPER_ADMIN') return;

    const allowed = request.companyAllowedModules;
    if (allowed == null) return; // unrestricted tenant (default)

    if (!allowed.includes(moduleKey)) {
      return reply.code(403).send({
        error: 'Module Not Allocated',
        message: `Your organization's plan does not include the '${moduleKey}' module. Contact your account administrator.`
      });
    }
  };
}

async function moduleGuardPlugin(fastify, options) {
  fastify.decorate('moduleGuard', moduleGuard);
  fastify.decorate('moduleGuardAny', moduleGuardAny);
  fastify.decorate('requireTenantModule', requireTenantModule);
}

export default fp(moduleGuardPlugin, {
  name: 'moduleGuard',
  dependencies: ['tenantGuard']
});
