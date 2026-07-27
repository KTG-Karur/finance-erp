import * as collectionService from './collection.service.js';

export async function listLoansHandler(request, reply) {
  try {
    const loans = await collectionService.getActiveLoans(request.server.db, request.companyId);
    return reply.send({ success: true, data: loans });
  } catch (err) {
    return reply.code(500).send({ error: 'Server Error', message: err.message });
  }
}

export async function createLoanHandler(request, reply) {
  try {
    const loan = await collectionService.createLoan(request.server.db, request.companyId, request.body);
    return reply.code(201).send({ success: true, data: loan });
  } catch (err) {
    return reply.code(500).send({ error: 'Server Error', message: err.message });
  }
}

export async function recordCollectionHandler(request, reply) {
  try {
    const collectorId = request.user?.userId || 1;
    const result = await collectionService.recordCollection(
      request.server.db,
      request.companyId,
      collectorId,
      request.body
    );
    return reply.code(201).send({ success: true, data: result });
  } catch (err) {
    return reply.code(500).send({ error: 'Server Error', message: err.message });
  }
}

export async function listCollectionsHandler(request, reply) {
  try {
    const history = await collectionService.getCollectionsHistory(request.server.db, request.companyId);
    return reply.send({ success: true, data: history });
  } catch (err) {
    return reply.code(500).send({ error: 'Server Error', message: err.message });
  }
}
