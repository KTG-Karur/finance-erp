import * as employeeController from './employee.controller.js';

export default async function employeeRoutes(fastify, options) {
  // Pre-handler hook for authentication and tenant isolation
  fastify.addHook('onRequest', fastify.authenticate);
  fastify.addHook('preHandler', fastify.tenantGuard);

  // List all employees in current tenant
  fastify.get('/', {
    preHandler: fastify.moduleGuard('EMPLOYEES', 'VIEW')
  }, employeeController.listEmployeesHandler);

  // Create new employee
  fastify.post('/', {
    preHandler: fastify.moduleGuard('EMPLOYEES', 'CREATE')
  }, employeeController.createEmployeeHandler);

  // Update employee permissions
  fastify.put('/:userId/permissions', {
    preHandler: fastify.moduleGuard('EMPLOYEES', 'MANAGE')
  }, employeeController.updatePermissionsHandler);
}
