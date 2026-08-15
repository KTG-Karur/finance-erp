import {
  getLoansHandler,
  getLoanByIdHandler,
  createLoanHandler,
  updateLoanStatusHandler,
  estimateLoanHandler,
  getPreclosureQuoteHandler,
  precloseLoanHandler,
  emergencyCloseLoanHandler
} from './loan.controller.js';
import { createLoanSchema } from './loan.schema.js';

export default async function loanRoutes(fastify, options) {
  const onRequest = [fastify.authenticate, fastify.tenantGuard, fastify.requireTenantModule('loans')];

  // Dashboard reads this same list — DASHBOARD/VIEW alone is enough to see it
  // even without LOANS/VIEW (see moduleGuardAny's comment in moduleGuard.js).
  fastify.get('/loans', { onRequest, preHandler: fastify.moduleGuardAny([['LOANS', 'VIEW'], ['DASHBOARD', 'VIEW']]) }, getLoansHandler);
  fastify.get('/loans/:id', { onRequest, preHandler: fastify.moduleGuard('LOANS', 'VIEW') }, getLoanByIdHandler);
  fastify.post('/loans', { onRequest, schema: createLoanSchema, preHandler: fastify.moduleGuard('LOANS', 'CREATE') }, createLoanHandler);
  fastify.post('/loans/estimate', { onRequest, preHandler: fastify.moduleGuard('LOANS', 'VIEW') }, estimateLoanHandler);
  fastify.patch('/loans/:id/status', { onRequest, preHandler: fastify.moduleGuard('LOANS', 'APPROVE') }, updateLoanStatusHandler);

  // Preclosure & Emergency Closures
  fastify.get('/loans/:id/preclosure-quote', { onRequest, preHandler: fastify.moduleGuard('LOANS', 'VIEW') }, getPreclosureQuoteHandler);
  fastify.post('/loans/:id/preclose', { onRequest, preHandler: fastify.moduleGuard('LOANS', 'APPROVE') }, precloseLoanHandler);
  fastify.post('/loans/:id/emergency-close', { onRequest, preHandler: fastify.moduleGuard('LOANS', 'APPROVE') }, emergencyCloseLoanHandler);
}


