import {
  getSchemesHandler,
  getSchemeByIdHandler,
  createSchemeHandler,
  updateSchemeHandler,
  deleteSchemeHandler
} from './scheme.controller.js';

export default async function schemeRoutes(fastify, options) {
  const onRequest = [fastify.authenticate, fastify.tenantGuard, fastify.requireTenantModule('loan_schemes')];

  fastify.get('/schemes', { onRequest, preHandler: fastify.moduleGuard('SCHEMES', 'VIEW') }, getSchemesHandler);
  fastify.get('/schemes/:id', { onRequest, preHandler: fastify.moduleGuard('SCHEMES', 'VIEW') }, getSchemeByIdHandler);
  fastify.post('/schemes', { onRequest, preHandler: fastify.moduleGuard('SCHEMES', 'CREATE') }, createSchemeHandler);
  fastify.put('/schemes/:id', { onRequest, preHandler: fastify.moduleGuard('SCHEMES', 'EDIT') }, updateSchemeHandler);
  fastify.delete('/schemes/:id', { onRequest, preHandler: fastify.moduleGuard('SCHEMES', 'DELETE') }, deleteSchemeHandler);
}
