import * as fdController from './fixedDeposit.controller.js';

export default async function fixedDepositRoutes(fastify, options) {
  const onRequest = [fastify.authenticate, fastify.tenantGuard, fastify.requireTenantModule('fixed_deposits')];

  fastify.get('/fixed-deposits', { onRequest, preHandler: fastify.moduleGuard('FIXED_DEPOSITS', 'VIEW') }, fdController.listFixedDepositsHandler);
  fastify.post('/fixed-deposits', { onRequest, preHandler: fastify.moduleGuard('FIXED_DEPOSITS', 'CREATE') }, fdController.createFixedDepositHandler);
  fastify.post('/fixed-deposits/:id/mature', { onRequest, preHandler: fastify.moduleGuard('FIXED_DEPOSITS', 'MATURE') }, fdController.matureFixedDepositHandler);
  fastify.post('/fixed-deposits/:id/premature-close', { onRequest, preHandler: fastify.moduleGuard('FIXED_DEPOSITS', 'CLOSE') }, fdController.prematureCloseFixedDepositHandler);
  fastify.get('/fixed-deposits/:id/interest-payout-status', { onRequest, preHandler: fastify.moduleGuard('FIXED_DEPOSITS', 'VIEW') }, fdController.getFdInterestPayoutStatusHandler);
  fastify.post('/fixed-deposits/:id/pay-interest', { onRequest, preHandler: fastify.moduleGuard('FIXED_DEPOSITS', 'PAY_INTEREST') }, fdController.payFdMonthlyInterestHandler);
}
