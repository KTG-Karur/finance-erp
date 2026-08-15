import {
  getBankAccountsHandler,
  getBankAccountByIdHandler,
  createBankAccountHandler,
  updateBankAccountHandler,
  deleteBankAccountHandler
} from './bank.controller.js';

export default async function bankRoutes(fastify, options) {
  const onRequest = [fastify.authenticate, fastify.tenantGuard, fastify.requireTenantModule('general_ledger')];

  fastify.get('/', { onRequest }, getBankAccountsHandler);
  fastify.get('/:id', { onRequest }, getBankAccountByIdHandler);
  fastify.post('/', { onRequest }, createBankAccountHandler);
  fastify.put('/:id', { onRequest }, updateBankAccountHandler);
  fastify.delete('/:id', { onRequest }, deleteBankAccountHandler);
}
