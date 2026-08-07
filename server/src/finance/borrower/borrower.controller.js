import { BorrowerService } from './borrower.service.js';

export async function getBorrowersHandler(request, reply) {
  try {
    const borrowers = await BorrowerService.getAllBorrowers(request.tenantDb, request.query?.search);
    return reply.send({ success: true, count: borrowers.length, data: borrowers });
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
}

export async function getBorrowerByIdHandler(request, reply) {
  try {
    const borrower = await BorrowerService.getBorrowerById(request.tenantDb, request.params.id);
    if (!borrower) {
      return reply.code(404).send({ success: false, message: 'Borrower record not found' });
    }
    return reply.send({ success: true, data: borrower });
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
}

export async function createBorrowerHandler(request, reply) {
  try {
    const borrower = await BorrowerService.createBorrower(request.tenantDb, request.body);
    return reply.code(201).send({ success: true, message: 'Borrower registered successfully', data: borrower });
  } catch (err) {
    return reply.code(400).send({ success: false, message: err.message });
  }
}
