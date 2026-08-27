/**
 * Financial Year Controller
 * Location: server/src/finance/fy/fy.controller.js
 */

import { FyService } from './fy.service.js';

export async function listFinancialYearsHandler(req, reply) {
  const years = await FyService.listFinancialYears(req.tenantDb);
  return reply.send({ success: true, data: years });
}

export async function getFinancialYearByIdHandler(req, reply) {
  const fy = await FyService.getFinancialYearById(req.tenantDb, req.params.id);
  return reply.send({ success: true, data: fy });
}

export async function getActiveFinancialYearHandler(req, reply) {
  const active = await FyService.getActiveFinancialYear(req.tenantDb);
  return reply.send({ success: true, data: active });
}

export async function verifyPreClosingHandler(req, reply) {
  const result = await FyService.verifyPreClosingIntegrity(req.tenantDb, req.params.id);
  return reply.send({ success: true, data: result });
}

export async function executeYearEndClosingHandler(req, reply) {
  const result = await FyService.executeYearEndClosing(req.tenantDb, req.params.id, req.body || {}, req.user);
  return reply.send({ success: true, message: 'Financial Year closed successfully.', data: result });
}

export async function toggleSoftLockHandler(req, reply) {
  const result = await FyService.toggleSoftLock(req.tenantDb, req.params.id, req.body.softLock, req.user);
  return reply.send({ success: true, message: 'Financial Year lock state updated.', data: result });
}
