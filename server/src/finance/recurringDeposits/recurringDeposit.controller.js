import * as rdService from './recurringDeposit.service.js';

function fail(reply, err) {
  const code = err.statusCode || 500;
  return reply.code(code).send({
    success: false,
    error: code === 409 ? 'Conflict' : (code === 404 ? 'Not Found' : (code === 400 ? 'Bad Request' : 'Server Error')),
    message: err.message
  });
}

export async function listRecurringDepositsHandler(request, reply) {
  try {
    const data = await rdService.getRecurringDeposits(request.tenantDb);
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function createRecurringDepositHandler(request, reply) {
  try {
    const data = await rdService.createRecurringDeposit(request.tenantDb, request.body);
    return reply.code(201).send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function collectRdInstallmentHandler(request, reply) {
  try {
    const { monthNo } = request.params;
    const data = await rdService.collectRdInstallment(request.tenantDb, request.params.id, Number(monthNo), request.body?.payment_mode, request.user?.name);
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function matureRecurringDepositHandler(request, reply) {
  try {
    const data = await rdService.matureRecurringDeposit(request.tenantDb, request.params.id, request.user?.name);
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function prematureCloseRecurringDepositHandler(request, reply) {
  try {
    const data = await rdService.prematureCloseRecurringDeposit(request.tenantDb, request.params.id, request.body?.payout_amount, request.user?.name);
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}
