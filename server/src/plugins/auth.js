import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';

async function authPlugin(fastify, options) {
  fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'supersecret_financial_erp_jwt_key_2026'
  });

  // No-token fallback removed — it used to fabricate a `role: 'ADMIN'` request.user
  // (ADMIN bypasses moduleGuard entirely) sourced from arbitrary, client-controlled
  // `x-user-role`/`x-company-id`/`x-tenant-db` headers whenever a caller simply
  // omitted the Authorization header. That made every route guarded only by
  // `authenticate` (no extra role check) trivially bypassable by anyone — the exact
  // opposite of what the branch-limit/module-allocation/superadmin-only guards
  // being built on top of this are for.
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Authentication token is required.' });
      }
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized', message: 'Invalid authentication token' });
    }
  });

  // Chain after `authenticate` (needs request.user already set) — guards every
  // SuperAdmin-only endpoint (tenant provisioning, status/access changes, audit log
  // reads). Provisioning previously had no guard at all; every other superadmin
  // endpoint being added alongside it needs the same check, hence a shared decorator.
  fastify.decorate('requireSuperAdmin', async function (request, reply) {
    if (request.user?.role !== 'SUPER_ADMIN') {
      return reply.code(403).send({ error: 'Forbidden', message: 'Super Admin access required.' });
    }
  });
}

export default fp(authPlugin, {
  name: 'auth'
});
