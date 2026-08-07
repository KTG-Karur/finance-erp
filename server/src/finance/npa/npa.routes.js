import { getNpaSummaryHandler } from './npa.controller.js';

export default async function npaRoutes(fastify, options) {
  const onRequest = [fastify.authenticate, fastify.tenantGuard, fastify.moduleGuard('loan')];

  fastify.get('/npa/summary', { onRequest }, getNpaSummaryHandler);
}
