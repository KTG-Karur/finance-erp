import { getNpaSummaryHandler } from './npa.controller.js';

export default async function npaRoutes(fastify, options) {
  const onRequest = [fastify.authenticate, fastify.tenantGuard, fastify.requireTenantModule('loans')];

  fastify.get('/npa/summary', { onRequest, preHandler: fastify.moduleGuard('NPA', 'VIEW') }, getNpaSummaryHandler);
}
