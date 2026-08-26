import * as roleController from './roles.controller.js';

export default async function roleRoutes(fastify, options) {
  // Pre-handler hook for authentication and tenant isolation
  fastify.addHook('onRequest', fastify.authenticate);
  fastify.addHook('preHandler', fastify.tenantGuard);

  // List all roles for current tenant
  fastify.get('/', {
    preHandler: fastify.moduleGuard('MASTER_SETTINGS', 'VIEW')
  }, roleController.listRolesHandler);

  // Create new custom role
  fastify.post('/', {
    preHandler: fastify.moduleGuard('MASTER_SETTINGS', 'CREATE')
  }, roleController.createRoleHandler);

  // Update role details and/or permission matrix
  fastify.put('/:roleCode', {
    preHandler: fastify.moduleGuard('MASTER_SETTINGS', 'EDIT')
  }, roleController.updateRoleHandler);

  // Delete custom role
  fastify.delete('/:roleCode', {
    preHandler: fastify.moduleGuard('MASTER_SETTINGS', 'DELETE')
  }, roleController.deleteRoleHandler);
}
