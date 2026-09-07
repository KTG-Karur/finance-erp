import * as investorCapitalService from './investorCapital.service.js';

function fail(reply, err) {
  const code = err.statusCode || 500;
  return reply.code(code).send({
    success: false,
    error: code === 409 ? 'Conflict' : (code === 404 ? 'Not Found' : (code === 400 ? 'Bad Request' : 'Server Error')),
    message: err.message
  });
}

export async function getShareSnapshotHandler(request, reply) {
  try {
    const data = await investorCapitalService.getInvestorShareSnapshot(request.tenantDb);
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function getSuggestedProfitHandler(request, reply) {
  try {
    const data = await investorCapitalService.getSuggestedMonthlyProfit(request.tenantDb, {
      periodMonth: request.query.period,
      branch: request.query.branch
    });
    return reply.send({ success: true, data: { suggested_profit: data } });
  } catch (err) { return fail(reply, err); }
}

export async function listDistributionsHandler(request, reply) {
  try {
    const data = await investorCapitalService.listDistributions(request.tenantDb);
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function getDistributionHandler(request, reply) {
  try {
    const data = await investorCapitalService.getDistribution(request.tenantDb, request.params.id);
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function createDistributionHandler(request, reply) {
  try {
    const createdBy = request.user?.name || request.user?.email || 'Admin';
    const data = await investorCapitalService.createProfitDistributionDraft(request.tenantDb, request.body, createdBy);
    return reply.code(201).send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function deleteDistributionHandler(request, reply) {
  try {
    await investorCapitalService.deleteProfitDistributionDraft(request.tenantDb, request.params.id);
    return reply.send({ success: true, message: 'Profit distribution draft deleted.' });
  } catch (err) { return fail(reply, err); }
}

export async function updateDistributionLineHandler(request, reply) {
  try {
    const data = await investorCapitalService.updateDistributionLineSplit(request.tenantDb, request.params.lineId, request.body);
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function finalizeDistributionHandler(request, reply) {
  try {
    const createdBy = request.user?.name || request.user?.email || 'Admin';
    const data = await investorCapitalService.finalizeProfitDistribution(request.tenantDb, request.params.id, createdBy);
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

// Capital withdrawals reduce principal (unlike a profit withdrawal) and must
// only ever be initiated/cancelled by an Admin — moduleGuard's per-user
// permission table fail-opens for other roles by default, so that alone
// can't express "Admin only"; this explicit role check is the real gate.
export async function requireAdminForCapitalWithdrawal(request, reply) {
  const role = request.user?.role;
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return reply.code(403).send({
      success: false,
      error: 'Forbidden',
      message: 'Only an Admin can initiate or cancel an investor capital withdrawal.'
    });
  }
}

export async function listCapitalWithdrawalRequestsHandler(request, reply) {
  try {
    const data = await investorCapitalService.listCapitalWithdrawalRequests(request.tenantDb, {
      investorId: request.query.investorId,
      status: request.query.status
    });
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function getCapitalWithdrawalRequestHandler(request, reply) {
  try {
    const data = await investorCapitalService.getCapitalWithdrawalRequest(request.tenantDb, request.params.reqId);
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function createCapitalWithdrawalRequestHandler(request, reply) {
  try {
    const requestedBy = request.user?.name || request.user?.email || 'Admin';
    const data = await investorCapitalService.createCapitalWithdrawalRequest(request.tenantDb, {
      investorId: request.params.id,
      ...request.body
    }, requestedBy);
    return reply.code(201).send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function recordWithdrawalApprovalHandler(request, reply) {
  try {
    const decidedBy = request.user?.name || request.user?.email || 'Admin';
    const data = await investorCapitalService.recordWithdrawalApproval(
      request.tenantDb, request.params.reqId, request.params.investorId, request.body?.decision, decidedBy
    );
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function retryCapitalWithdrawalHandler(request, reply) {
  try {
    const data = await investorCapitalService.tryExecuteCapitalWithdrawal(request.tenantDb, request.params.reqId);
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function cancelCapitalWithdrawalRequestHandler(request, reply) {
  try {
    const data = await investorCapitalService.cancelCapitalWithdrawalRequest(request.tenantDb, request.params.reqId);
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}
