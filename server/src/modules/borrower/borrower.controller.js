import * as borrowerService from './borrower.service.js';

export async function listBorrowersHandler(request, reply) {
  try {
    const borrowers = await borrowerService.getAllBorrowers(request.server.db, request.companyId);
    return reply.send({ success: true, data: borrowers });
  } catch (err) {
    return reply.code(500).send({ error: 'Server Error', message: err.message });
  }
}

export async function getBorrowerHandler(request, reply) {
  try {
    const borrower = await borrowerService.getBorrowerById(request.server.db, request.companyId, request.params.id);
    if (!borrower) {
      return reply.code(404).send({ error: 'Not Found', message: 'Customer not found.' });
    }
    return reply.send({ success: true, data: borrower });
  } catch (err) {
    return reply.code(500).send({ error: 'Server Error', message: err.message });
  }
}

export async function createBorrowerHandler(request, reply) {
  try {
    const borrower = await borrowerService.createBorrower(request.server.db, request.companyId, request.body);
    return reply.code(201).send({ success: true, data: borrower });
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ error: err.statusCode === 409 ? 'Conflict' : 'Server Error', message: err.message, field: err.field });
  }
}

export async function updateBorrowerHandler(request, reply) {
  try {
    const borrower = await borrowerService.updateBorrower(request.server.db, request.companyId, request.params.id, request.body);
    return reply.send({ success: true, data: borrower });
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ error: err.statusCode === 409 ? 'Conflict' : (err.statusCode === 404 ? 'Not Found' : 'Server Error'), message: err.message, field: err.field });
  }
}

export async function verifyBorrowerKycHandler(request, reply) {
  try {
    const reviewedBy = request.user?.name || request.user?.email || '';
    const borrower = await borrowerService.verifyBorrowerKyc(request.server.db, request.companyId, request.params.id, reviewedBy);
    return reply.send({ success: true, data: borrower });
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ error: err.statusCode === 409 ? 'Conflict' : (err.statusCode === 404 ? 'Not Found' : 'Server Error'), message: err.message });
  }
}

export async function rejectBorrowerKycHandler(request, reply) {
  try {
    const reviewedBy = request.user?.name || request.user?.email || '';
    const borrower = await borrowerService.rejectBorrowerKyc(request.server.db, request.companyId, request.params.id, request.body?.reason, reviewedBy);
    return reply.send({ success: true, data: borrower });
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ error: err.statusCode === 409 ? 'Conflict' : (err.statusCode === 404 ? 'Not Found' : 'Server Error'), message: err.message });
  }
}

export async function deleteBorrowerHandler(request, reply) {
  try {
    await borrowerService.deleteBorrower(request.server.db, request.companyId, request.params.id);
    return reply.send({ success: true, message: 'Customer deleted successfully.' });
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ error: err.statusCode === 409 ? 'Conflict' : (err.statusCode === 404 ? 'Not Found' : 'Server Error'), message: err.message });
  }
}
