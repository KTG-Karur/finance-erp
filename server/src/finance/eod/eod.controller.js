/**
 * EOD Controller
 * Location: server/src/finance/eod/eod.controller.js
 */
import { EodService } from './eod.service.js';

function fail(reply, err) {
  const code = err.statusCode || 500;
  return reply.code(code).send({
    success: false,
    error: code === 409 ? 'Conflict' : (code === 404 ? 'Not Found' : (code === 400 ? 'Bad Request' : 'Server Error')),
    message: err.message
  });
}

export async function getEodRecordsHandler(request, reply) {
  try {
    const records = await EodService.getRecords(request.tenantDb, request.query);
    return reply.send({ success: true, count: records.length, data: records });
  } catch (err) {
    return fail(reply, err);
  }
}

export async function closeEodDayHandler(request, reply) {
  try {
    const record = await EodService.closeDay(request.tenantDb, request.body, request.user);
    return reply.code(201).send({ success: true, message: 'Day-end closing completed successfully', data: record });
  } catch (err) {
    return fail(reply, err);
  }
}

export async function resolveVarianceHandler(request, reply) {
  try {
    const record = await EodService.resolveVariance(request.tenantDb, request.body, request.user);
    return reply.send({ success: true, message: 'Variance resolved successfully', data: record });
  } catch (err) {
    return fail(reply, err);
  }
}

export async function grantReopenHandler(request, reply) {
  try {
    const records = await EodService.grantReopen(request.tenantDb, request.body, request.user);
    return reply.send({ success: true, message: 'Reopen window granted successfully', data: records });
  } catch (err) {
    return fail(reply, err);
  }
}

export async function getDenominationSettingsHandler(request, reply) {
  try {
    const settings = await EodService.getDenominationSettings(request.tenantDb);
    return reply.send({ success: true, data: settings });
  } catch (err) {
    return fail(reply, err);
  }
}
