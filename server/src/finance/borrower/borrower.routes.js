import {
  getBorrowersHandler,
  getBorrowerByIdHandler,
  createBorrowerHandler,
  updateBorrowerHandler,
  deleteBorrowerHandler
} from './borrower.controller.js';

export default async function borrowerRoutes(fastify, options) {
  const onRequest = [fastify.authenticate, fastify.tenantGuard, fastify.requireTenantModule('loans')];

  // Dashboard reads this same list — DASHBOARD/VIEW alone is enough (see
  // moduleGuardAny's comment in moduleGuard.js).
  fastify.get('/borrowers', { onRequest, preHandler: fastify.moduleGuardAny([['BORROWERS', 'VIEW'], ['DASHBOARD', 'VIEW']]) }, getBorrowersHandler);
  fastify.get('/borrowers/:id', { onRequest, preHandler: fastify.moduleGuard('BORROWERS', 'VIEW') }, getBorrowerByIdHandler);
  fastify.post('/borrowers', { onRequest, preHandler: fastify.moduleGuard('BORROWERS', 'CREATE') }, createBorrowerHandler);
  fastify.put('/borrowers/:id', { onRequest, preHandler: fastify.moduleGuard('BORROWERS', 'EDIT') }, updateBorrowerHandler);
  fastify.delete('/borrowers/:id', { onRequest, preHandler: fastify.moduleGuard('BORROWERS', 'DELETE') }, deleteBorrowerHandler);
}
