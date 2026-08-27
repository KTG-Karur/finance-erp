/**
 * Financial Year API Routes
 * Location: server/src/finance/fy/fy.routes.js
 */

import {
  listFinancialYearsHandler,
  getFinancialYearByIdHandler,
  getActiveFinancialYearHandler,
  verifyPreClosingHandler,
  executeYearEndClosingHandler,
  toggleSoftLockHandler
} from './fy.controller.js';

export default async function fyRoutes(fastify, opts) {
  const onRequest = [fastify.authenticate, fastify.tenantGuard];

  fastify.get('/fy', { onRequest, preHandler: fastify.moduleGuard('FINANCIAL_YEAR', 'VIEW') }, listFinancialYearsHandler);
  fastify.get('/fy/active', { onRequest }, getActiveFinancialYearHandler);
  fastify.get('/fy/:id', { onRequest, preHandler: fastify.moduleGuard('FINANCIAL_YEAR', 'VIEW') }, getFinancialYearByIdHandler);
  fastify.get('/fy/:id/pre-check', { onRequest, preHandler: fastify.moduleGuard('FINANCIAL_YEAR', 'CLOSE') }, verifyPreClosingHandler);
  fastify.post('/fy/:id/close', { onRequest, preHandler: fastify.moduleGuard('FINANCIAL_YEAR', 'CLOSE') }, executeYearEndClosingHandler);
  fastify.post('/fy/:id/soft-lock', { onRequest, preHandler: fastify.moduleGuard('FINANCIAL_YEAR', 'CLOSE') }, toggleSoftLockHandler);
}
