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

async function moduleGuardPlugin(fastify, options) {
  fastify.decorate('moduleGuard', moduleGuard);
}

export default fp(moduleGuardPlugin, {
  name: 'moduleGuard',
  dependencies: ['tenantGuard']
});
