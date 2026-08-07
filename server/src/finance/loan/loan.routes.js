import {
  getLoansHandler,
  getLoanByIdHandler,
  createLoanHandler,
  updateLoanStatusHandler
} from './loan.controller.js';
import { createLoanSchema } from './loan.schema.js';

export default async function loanRoutes(fastify, options) {
  const onRequest = [fastify.authenticate, fastify.tenantGuard, fastify.moduleGuard('loan')];

  fastify.get('/loans', { onRequest }, getLoansHandler);
  fastify.get('/loans/:id', { onRequest }, getLoanByIdHandler);
  fastify.post('/loans', { onRequest, schema: createLoanSchema }, createLoanHandler);
  fastify.patch('/loans/:id/status', { onRequest }, updateLoanStatusHandler);
}
