import { LedgerService } from './ledger.service.js';

export async function getChartOfAccountsHandler(request, reply) {
  try {
    const accounts = await LedgerService.getChartOfAccounts(request.tenantDb);
    return reply.send({ success: true, count: accounts.length, data: accounts });
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
}

export async function getJournalEntriesHandler(request, reply) {
  try {
    const entries = await LedgerService.getJournalEntries(request.tenantDb, request.query);
    return reply.send({ success: true, count: entries.length, data: entries });
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
}

export async function postVoucherHandler(request, reply) {
  try {
    const voucher = await LedgerService.postVoucher(request.tenantDb, request.body);
    return reply.code(201).send({ success: true, message: 'Journal voucher posted successfully', data: voucher });
  } catch (err) {
    return reply.code(400).send({ success: false, message: err.message });
  }
}

export async function getTrialBalanceHandler(request, reply) {
  try {
    const trialBalance = await LedgerService.getTrialBalance(request.tenantDb);
    return reply.send({ success: true, data: trialBalance });
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
}
