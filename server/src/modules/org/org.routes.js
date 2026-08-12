import * as orgController from './org.controller.js';
import { createSubCompanySchema, updateSubCompanySchema, createBranchSchema, updateBranchSchema } from './org.schema.js';

export default async function orgRoutes(fastify, options) {
  fastify.addHook('onRequest', fastify.authenticate);
  fastify.addHook('preHandler', fastify.tenantGuard);
  fastify.addHook('preHandler', fastify.requireTenantModule('org'));

  fastify.get('/sub-companies', {
    preHandler: fastify.moduleGuard('ORG', 'VIEW')
  }, orgController.listSubCompaniesHandler);

  fastify.post('/sub-companies', {
    schema: createSubCompanySchema,
    preHandler: fastify.moduleGuard('ORG', 'CREATE')
  }, orgController.createSubCompanyHandler);

  fastify.put('/sub-companies/:id', {
    schema: updateSubCompanySchema,
    preHandler: fastify.moduleGuard('ORG', 'EDIT')
  }, orgController.updateSubCompanyHandler);

  fastify.delete('/sub-companies/:id', {
    preHandler: fastify.moduleGuard('ORG', 'DELETE')
  }, orgController.deleteSubCompanyHandler);

  fastify.get('/branches', {
    preHandler: fastify.moduleGuard('ORG', 'VIEW')
  }, orgController.listBranchesHandler);

  fastify.post('/branches', {
    schema: createBranchSchema,
    preHandler: fastify.moduleGuard('ORG', 'CREATE')
  }, orgController.createBranchHandler);

  fastify.put('/branches/:id', {
    schema: updateBranchSchema,
    preHandler: fastify.moduleGuard('ORG', 'EDIT')
  }, orgController.updateBranchHandler);

  fastify.delete('/branches/:id', {
    preHandler: fastify.moduleGuard('ORG', 'DELETE')
  }, orgController.deleteBranchHandler);
}
