import * as investorService from './investor.service.js';

function fail(reply, err) {
  const code = err.statusCode || 500;
  return reply.code(code).send({
    success: false,
    error: code === 409 ? 'Conflict' : (code === 404 ? 'Not Found' : (code === 400 ? 'Bad Request' : 'Server Error')),
    message: err.message
  });
}

export async function listInvestorsHandler(request, reply) {
  try {
    const data = await investorService.getInvestors(request.tenantDb);
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function createInvestorHandler(request, reply) {
  try {
    const data = await investorService.createInvestor(request.tenantDb, request.body);
    return reply.code(201).send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function updateInvestorHandler(request, reply) {
  try {
    const data = await investorService.updateInvestor(request.tenantDb, request.params.id, request.body);
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function deleteInvestorHandler(request, reply) {
  try {
    await investorService.deleteInvestor(request.tenantDb, request.params.id);
    return reply.send({ success: true, message: 'Investor deleted successfully.' });
  } catch (err) { return fail(reply, err); }
}
