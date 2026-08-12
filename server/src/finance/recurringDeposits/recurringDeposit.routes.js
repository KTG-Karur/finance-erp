import * as rdController from './recurringDeposit.controller.js';

export default async function recurringDepositRoutes(fastify, options) {
  const onRequest = [fastify.authenticate, fastify.tenantGuard, fastify.requireTenantModule('recurring_deposits')];

  fastify.get('/recurring-deposits', { onRequest, preHandler: fastify.moduleGuard('RECURRING_DEPOSITS', 'VIEW') }, rdController.listRecurringDepositsHandler);
  fastify.post('/recurring-deposits', { onRequest, preHandler: fastify.moduleGuard('RECURRING_DEPOSITS', 'CREATE') }, rdController.createRecurringDepositHandler);
  fastify.post('/recurring-deposits/:id/installments/:monthNo/collect', { onRequest, preHandler: fastify.moduleGuard('RECURRING_DEPOSITS', 'COLLECT') }, rdController.collectRdInstallmentHandler);
  fastify.post('/recurring-deposits/:id/mature', { onRequest, preHandler: fastify.moduleGuard('RECURRING_DEPOSITS', 'MATURE') }, rdController.matureRecurringDepositHandler);
  fastify.post('/recurring-deposits/:id/premature-close', { onRequest, preHandler: fastify.moduleGuard('RECURRING_DEPOSITS', 'CLOSE') }, rdController.prematureCloseRecurringDepositHandler);
}
