import * as trashController from './trash.controller.js';

export default async function trashRoutes(fastify, options) {
  const onRequest = [fastify.authenticate, fastify.tenantGuard];

  fastify.get('/system/trash', { onRequest }, trashController.listDeletedRecordsHandler);
  fastify.post('/system/trash/restore', { onRequest }, trashController.restoreRecordHandler);

  // Also mount under finance prefix for ease of API discovery
  fastify.get('/finance/drafts', { onRequest }, trashController.listDeletedRecordsHandler);
  fastify.post('/finance/drafts/restore', { onRequest }, trashController.restoreRecordHandler);
}
