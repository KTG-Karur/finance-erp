/**
 * EOD Fastify Routes
 * Location: server/src/finance/eod/eod.routes.js
 */
import * as eodController from './eod.controller.js';

export default async function eodRoutes(fastify, options) {
  const onRequest = [fastify.authenticate, fastify.tenantGuard];

  fastify.get('/records', { onRequest, preHandler: fastify.moduleGuard('ACCOUNTING', 'VIEW') }, eodController.getEodRecordsHandler);
  fastify.post('/close', { onRequest, preHandler: fastify.moduleGuard('ACCOUNTING', 'EDIT') }, eodController.closeEodDayHandler);
  fastify.post('/resolve-variance', { onRequest, preHandler: fastify.moduleGuard('ACCOUNTING', 'EDIT') }, eodController.resolveVarianceHandler);
  fastify.post('/grant-reopen', { onRequest, preHandler: fastify.moduleGuard('ACCOUNTING', 'EDIT') }, eodController.grantReopenHandler);
  fastify.get('/denominations', { onRequest, preHandler: fastify.moduleGuard('ACCOUNTING', 'VIEW') }, eodController.getDenominationSettingsHandler);
}
