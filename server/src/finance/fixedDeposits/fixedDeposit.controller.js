import * as fdService from './fixedDeposit.service.js';

function fail(reply, err) {
  const code = err.statusCode || 500;
  return reply.code(code).send({
    success: false,
    error: code === 409 ? 'Conflict' : (code === 404 ? 'Not Found' : (code === 400 ? 'Bad Request' : 'Server Error')),
    message: err.message
  });
}

export async function listFixedDepositsHandler(request, reply) {
  try {
    const data = await fdService.getFixedDeposits(request.tenantDb);
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function createFixedDepositHandler(request, reply) {
  try {
    const data = await fdService.createFixedDeposit(request.tenantDb, request.body, request.user?.name);
    return reply.code(201).send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function matureFixedDepositHandler(request, reply) {
  try {
    const data = await fdService.matureFixedDeposit(request.tenantDb, request.params.id, request.user?.name);
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function prematureCloseFixedDepositHandler(request, reply) {
  try {
    const data = await fdService.prematureCloseFixedDeposit(request.tenantDb, request.params.id, request.body?.payout_amount, request.user?.name);
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function getFdInterestPayoutStatusHandler(request, reply) {
  try {
    const data = await fdService.getFdInterestPayoutStatus(request.tenantDb, request.params.id);
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function payFdMonthlyInterestHandler(request, reply) {
  try {
    const data = await fdService.payFdMonthlyInterest(request.tenantDb, request.params.id, request.body, request.user?.name);
    return reply.code(201).send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}
