import { BankService } from './bank.service.js';

export async function getBankAccountsHandler(request, reply) {
  try {
    const accounts = await BankService.getAll(request.tenantDb, request.query);
    return reply.send({ success: true, count: accounts.length, data: accounts });
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
}

export async function getBankAccountByIdHandler(request, reply) {
  try {
    const account = await BankService.getById(request.tenantDb, request.params.id);
    if (!account) {
      return reply.code(404).send({ success: false, message: 'Bank account not found' });
    }
    return reply.send({ success: true, data: account });
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
}

export async function createBankAccountHandler(request, reply) {
  try {
    const { bank_name, account_name, account_number, ifsc_code } = request.body || {};
    if (!bank_name || !account_name || !account_number || !ifsc_code) {
      return reply.code(400).send({
        success: false,
        message: 'bank_name, account_name, account_number, and ifsc_code are required.'
      });
    }

    const created = await BankService.create(request.tenantDb, request.body, request.user?.name);
    return reply.code(201).send({ success: true, message: 'Bank account registered successfully', data: created });
  } catch (err) {
    return reply.code(err.statusCode || 400).send({ success: false, message: err.message });
  }
}

export async function updateBankAccountHandler(request, reply) {
  try {
    const updated = await BankService.update(request.tenantDb, request.params.id, request.body);
    if (!updated) {
      return reply.code(404).send({ success: false, message: 'Bank account not found' });
    }
    return reply.send({ success: true, message: 'Bank account updated successfully', data: updated });
  } catch (err) {
    return reply.code(err.statusCode || 400).send({ success: false, message: err.message });
  }
}

export async function deleteBankAccountHandler(request, reply) {
  try {
    await BankService.delete(request.tenantDb, request.params.id);
    return reply.send({ success: true, message: 'Bank account deactivated successfully' });
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
}
