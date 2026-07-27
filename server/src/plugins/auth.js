import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';

async function authPlugin(fastify, options) {
  fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'supersecret_financial_erp_jwt_key_2026'
  });

  fastify.decorate('authenticate', async function (request, reply) {
    try {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        await request.jwtVerify();
      } else {
        // Fallback default demo user for dev testing
        request.user = {
          userId: Number(request.headers['x-user-id']) || 1,
          companyId: Number(request.headers['x-company-id']) || 1,
          role: request.headers['x-user-role'] || 'ADMIN',
          dbName: request.headers['x-tenant-db'] || 'tenant_alpha_db',
          name: 'Demo Admin'
        };
      }
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized', message: 'Invalid authentication token' });
    }
  });

}

export default fp(authPlugin, {
  name: 'auth'
});
