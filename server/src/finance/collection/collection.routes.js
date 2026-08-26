import {
  getCollectionsHandler,
  recordCollectionHandler,
  revertCollectionHandler,
  updateCollectionHandler,
  markChequeClearedHandler,
  markChequeBouncedHandler,
  getWaiversHandler,
  approveWaiverHandler,
  rejectWaiverHandler
} from './collection.controller.js';

export default async function collectionRoutes(fastify, options) {
  const onRequest = [fastify.authenticate, fastify.tenantGuard, fastify.requireTenantModule('loans')];

  // Dashboard reads this same list — DASHBOARD/VIEW alone is enough (see
  // moduleGuardAny's comment in moduleGuard.js).
  fastify.get('/collections', { onRequest, preHandler: fastify.moduleGuardAny([['COLLECTIONS', 'VIEW'], ['DASHBOARD', 'VIEW']]) }, getCollectionsHandler);
  fastify.post('/collections', { onRequest, preHandler: fastify.moduleGuard('COLLECTIONS', 'COLLECT') }, recordCollectionHandler);
  fastify.patch('/collections/:id', { onRequest, preHandler: fastify.moduleGuard('COLLECTIONS', 'REVERT') }, updateCollectionHandler);
  fastify.patch('/collections/:id/revert', { onRequest, preHandler: fastify.moduleGuard('COLLECTIONS', 'REVERT') }, revertCollectionHandler);
  fastify.patch('/collections/:id/cheque-cleared', { onRequest, preHandler: fastify.moduleGuard('COLLECTIONS', 'REVERT') }, markChequeClearedHandler);
  fastify.patch('/collections/:id/cheque-bounced', { onRequest, preHandler: fastify.moduleGuard('COLLECTIONS', 'REVERT') }, markChequeBouncedHandler);

  // Waiver Approval endpoints
  fastify.get('/collections/waivers', { onRequest, preHandler: fastify.moduleGuardAny([['COLLECTIONS', 'VIEW'], ['DASHBOARD', 'VIEW']]) }, getWaiversHandler);
  fastify.post('/collections/:id/approve-waiver', { onRequest, preHandler: fastify.moduleGuardAny([['COLLECTIONS', 'WAIVER_APPROVE'], ['COLLECTIONS', 'REVERT']]) }, approveWaiverHandler);
  fastify.post('/collections/:id/reject-waiver', { onRequest, preHandler: fastify.moduleGuardAny([['COLLECTIONS', 'WAIVER_APPROVE'], ['COLLECTIONS', 'REVERT']]) }, rejectWaiverHandler);
}
