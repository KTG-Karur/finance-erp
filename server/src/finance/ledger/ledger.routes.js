import {
  getChartOfAccountsHandler,
  getJournalEntriesHandler,
  postVoucherHandler,
  getTrialBalanceHandler
} from './ledger.controller.js';

export default async function ledgerRoutes(fastify, options) {
  const onRequest = [fastify.authenticate, fastify.tenantGuard, fastify.moduleGuard('loan')];

  fastify.get('/ledger/accounts', { onRequest }, getChartOfAccountsHandler);
  fastify.get('/ledger/vouchers', { onRequest }, getJournalEntriesHandler);
  fastify.post('/ledger/vouchers', { onRequest }, postVoucherHandler);
  fastify.get('/ledger/trial-balance', { onRequest }, getTrialBalanceHandler);
}
