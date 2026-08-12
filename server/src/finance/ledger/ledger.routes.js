import {
  getChartOfAccountsHandler,
  getJournalEntriesHandler,
  postVoucherHandler,
  getTrialBalanceHandler
} from './ledger.controller.js';

export default async function ledgerRoutes(fastify, options) {
  const onRequest = [fastify.authenticate, fastify.tenantGuard, fastify.requireTenantModule('accounting')];

  fastify.get('/ledger/accounts', { onRequest, preHandler: fastify.moduleGuard('LEDGER', 'VIEW') }, getChartOfAccountsHandler);
  fastify.get('/ledger/vouchers', { onRequest, preHandler: fastify.moduleGuard('LEDGER', 'VIEW') }, getJournalEntriesHandler);
  fastify.post('/ledger/vouchers', { onRequest, preHandler: fastify.moduleGuard('LEDGER', 'POST') }, postVoucherHandler);
  fastify.get('/ledger/trial-balance', { onRequest, preHandler: fastify.moduleGuard('LEDGER', 'VIEW') }, getTrialBalanceHandler);
}
