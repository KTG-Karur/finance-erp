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
    const loan = await LoanService.createLoan(request.tenantDb, request.body, request.user?.name);
    return reply.code(201).send({ success: true, message: 'Loan disbursed successfully', data: loan });
  } catch (err) {
    return reply.code(err.statusCode || 400).send({ success: false, message: err.message });
  }
}

export async function estimateLoanHandler(request, reply) {
  try {
    const estimate = await LoanService.estimateLoan(request.body || {});
    return reply.send({ success: true, data: estimate });
  } catch (err) {
    return reply.code(400).send({ success: false, message: err.message });
  }
}

export async function updateLoanStatusHandler(request, reply) {
  try {
    const { status, reason } = request.body || {};
    if (!status) {
      return reply.code(400).send({ success: false, message: 'status is required.' });
    }
    const success = await LoanService.updateStatus(request.tenantDb, request.params.id, status, reason, request.user?.name, request.body);
    if (!success) {
      return reply.code(404).send({ success: false, message: 'Loan account not found' });
    }
    const updated = await LoanService.getLoanById(request.tenantDb, request.params.id);
    return reply.send({ success: true, message: `Loan status updated to ${status}`, data: updated });
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ success: false, message: err.message });
  }
}

export async function getPreclosureQuoteHandler(request, reply) {
  try {
    const { as_of_date } = request.query || {};
    const quote = await LoanService.calculatePreclosurePayoff(request.tenantDb, request.params.id, as_of_date);
    return reply.send({ success: true, data: quote });
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ success: false, message: err.message });
  }
}

export async function precloseLoanHandler(request, reply) {
  try {
    const result = await LoanService.executeLoanPreclosure(
      request.tenantDb,
      request.params.id,
      request.body || {},
      request.user?.name || 'Authorized Staff'
    );
    return reply.send({ success: true, message: 'Loan preclosed and settled successfully.', data: result });
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ success: false, message: err.message });
  }
}

export async function emergencyCloseLoanHandler(request, reply) {
  try {
    const result = await LoanService.executeEmergencyClose(
      request.tenantDb,
      request.params.id,
      request.body || {},
      request.user?.name || 'Authorized Staff'
    );
    return reply.send({ success: true, message: 'Loan closed via emergency / compromise settlement.', data: result });
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ success: false, message: err.message });
  }
}

