import {
  getCollectionsHandler,
  recordCollectionHandler,
  revertCollectionHandler,
  updateCollectionHandler,
  markChequeClearedHandler,
  markChequeBouncedHandler
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
}
