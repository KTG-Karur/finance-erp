import {
  getSchemesHandler,
  getSchemeByIdHandler,
  createSchemeHandler,
  updateSchemeHandler,
  deleteSchemeHandler
} from './scheme.controller.js';

export default async function schemeRoutes(fastify, options) {
  const onRequest = [fastify.authenticate, fastify.tenantGuard, fastify.requireTenantModule('loans'), fastify.moduleGuard('loan')];

  fastify.get('/schemes', { onRequest }, getSchemesHandler);
  fastify.get('/schemes/:id', { onRequest }, getSchemeByIdHandler);
  fastify.post('/schemes', { onRequest }, createSchemeHandler);
  fastify.put('/schemes/:id', { onRequest }, updateSchemeHandler);
  fastify.delete('/schemes/:id', { onRequest }, deleteSchemeHandler);
}
