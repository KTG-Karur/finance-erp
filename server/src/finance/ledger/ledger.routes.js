import {
  getChartOfAccountsHandler,
  createAccountHandler,
  updateAccountHandler,
  deleteAccountHandler,
  getJournalEntriesHandler,
  postVoucherHandler,
  revertVoucherHandler,
  getTrialBalanceHandler,
  getAccountBalancesHandler,
  getAccountBalanceByCodeHandler
} from './ledger.controller.js';

export default async function ledgerRoutes(fastify, options) {
  const onRequest = [fastify.authenticate, fastify.tenantGuard, fastify.requireTenantModule('accounting')];

  fastify.get('/ledger/accounts', { onRequest, preHandler: fastify.moduleGuard('LEDGER', 'VIEW') }, getChartOfAccountsHandler);
  fastify.get('/ledger/accounts/balances', { onRequest, preHandler: fastify.moduleGuard('LEDGER', 'VIEW') }, getAccountBalancesHandler);
  fastify.get('/ledger/accounts/:code/balance', { onRequest, preHandler: fastify.moduleGuard('LEDGER', 'VIEW') }, getAccountBalanceByCodeHandler);
  fastify.post('/ledger/accounts', { onRequest, preHandler: fastify.moduleGuard('LEDGER', 'EDIT') }, createAccountHandler);
  fastify.put('/ledger/accounts/:code', { onRequest, preHandler: fastify.moduleGuard('LEDGER', 'EDIT') }, updateAccountHandler);
  fastify.patch('/ledger/accounts/:code', { onRequest, preHandler: fastify.moduleGuard('LEDGER', 'EDIT') }, updateAccountHandler);
  fastify.delete('/ledger/accounts/:code', { onRequest, preHandler: fastify.moduleGuard('LEDGER', 'DELETE') }, deleteAccountHandler);
  fastify.get('/ledger/vouchers', { onRequest, preHandler: fastify.moduleGuard('LEDGER', 'VIEW') }, getJournalEntriesHandler);
  fastify.post('/ledger/vouchers', { onRequest, preHandler: fastify.moduleGuard('LEDGER', 'POST') }, postVoucherHandler);
  fastify.post('/ledger/vouchers/:id/revert', { onRequest, preHandler: fastify.moduleGuard('LEDGER', 'POST') }, revertVoucherHandler);
  fastify.get('/ledger/trial-balance', { onRequest, preHandler: fastify.moduleGuard('LEDGER', 'VIEW') }, getTrialBalanceHandler);
}
