import * as employeeController from './employee.controller.js';

export default async function employeeRoutes(fastify, options) {
  // Pre-handler hook for authentication and tenant isolation
  fastify.addHook('onRequest', fastify.authenticate);
  fastify.addHook('preHandler', fastify.tenantGuard);
  fastify.addHook('preHandler', fastify.requireTenantModule('employees'));

  // List all employees in current tenant
  fastify.get('/', {
    preHandler: fastify.moduleGuard('EMPLOYEES', 'VIEW')
  }, employeeController.listEmployeesHandler);

  // Create new employee
  fastify.post('/', {
    preHandler: fastify.moduleGuard('EMPLOYEES', 'CREATE')
  }, employeeController.createEmployeeHandler);

  // Update employee profile (name/email/phone/role/status/password/branches)
  fastify.put('/:userId', {
    preHandler: fastify.moduleGuard('EMPLOYEES', 'EDIT')
  }, employeeController.updateEmployeeHandler);

  // Delete employee
  fastify.delete('/:userId', {
    preHandler: fastify.moduleGuard('EMPLOYEES', 'DELETE')
  }, employeeController.deleteEmployeeHandler);

  // Update employee permissions — deliberately its own action: being able to
  // edit a staff member's profile shouldn't automatically mean being able to
  // grant/revoke what they're allowed to do.
  fastify.put('/:userId/permissions', {
    preHandler: fastify.moduleGuard('EMPLOYEES', 'PERMISSIONS')
  }, employeeController.updatePermissionsHandler);

  // Update employee branch assignments
  fastify.put('/:userId/branches', {
    preHandler: fastify.moduleGuard('EMPLOYEES', 'EDIT')
  }, employeeController.updateBranchesHandler);
}
