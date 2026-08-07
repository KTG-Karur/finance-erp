import { LoanService } from './loan.service.js';

export async function getLoansHandler(request, reply) {
  try {
    const loans = await LoanService.getAllLoans(request.tenantDb, request.query);
    return reply.send({ success: true, count: loans.length, data: loans });
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
}

export async function getLoanByIdHandler(request, reply) {
  try {
    const loan = await LoanService.getLoanById(request.tenantDb, request.params.id);
    if (!loan) {
      return reply.code(404).send({ success: false, message: 'Loan account not found' });
    }
    return reply.send({ success: true, data: loan });
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
}

export async function createLoanHandler(request, reply) {
  try {
    const loan = await LoanService.createLoan(request.tenantDb, request.body);
    return reply.code(201).send({ success: true, message: 'Loan disbursed successfully', data: loan });
  } catch (err) {
    return reply.code(err.statusCode || 400).send({ success: false, message: err.message });
  }
}

export async function updateLoanStatusHandler(request, reply) {
  try {
    const { status, reason } = request.body || {};
    const success = await LoanService.updateStatus(request.tenantDb, request.params.id, status, reason);
    if (!success) {
      return reply.code(404).send({ success: false, message: 'Loan account not found' });
    }
    return reply.send({ success: true, message: `Loan status updated to ${status}` });
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
}
