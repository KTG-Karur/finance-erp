import { LedgerService } from './ledger.service.js';

function fail(reply, err) {
  const code = err.statusCode || 500;
  return reply.code(code).send({
    success: false,
    error: code === 409 ? 'Conflict' : (code === 404 ? 'Not Found' : (code === 400 ? 'Bad Request' : 'Server Error')),
    message: err.message
  });
}

export async function getChartOfAccountsHandler(request, reply) {
  try {
    const accounts = await LedgerService.getChartOfAccounts(request.tenantDb);
    return reply.send({ success: true, count: accounts.length, data: accounts });
  } catch (err) { return fail(reply, err); }
}

export async function getJournalEntriesHandler(request, reply) {
  try {
    const entries = await LedgerService.getJournalEntries(request.tenantDb, request.query);
    return reply.send({ success: true, count: entries.length, data: entries });
  } catch (err) { return fail(reply, err); }
}

export async function postVoucherHandler(request, reply) {
  try {
    const voucher = await LedgerService.postVoucher(request.tenantDb, {
      ...request.body,
      created_by: request.body?.created_by || request.user?.name || null
    });
    return reply.code(201).send({ success: true, message: 'Journal voucher posted successfully', data: voucher });
  } catch (err) { return fail(reply, err); }
}

export async function getTrialBalanceHandler(request, reply) {
  try {
    const trialBalance = await LedgerService.getTrialBalance(request.tenantDb);
    return reply.send({ success: true, data: trialBalance });
  } catch (err) { return fail(reply, err); }
}
