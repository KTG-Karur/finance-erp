import { CollectionService } from './collection.service.js';

export async function getCollectionsHandler(request, reply) {
  try {
    const collections = await CollectionService.getCollections(request.tenantDb, request.query);
    return reply.send({ success: true, count: collections.length, data: collections });
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ success: false, message: err.message });
  }
}

export async function recordCollectionHandler(request, reply) {
  try {
    const companyCode = request.tenantCode || request.user?.companyCode || 'default';
    const collection = await CollectionService.recordCollection(request.tenantDb, request.body, request.user?.name, companyCode);
    return reply.code(201).send({ success: true, message: 'Collection receipt recorded successfully', data: collection });
  } catch (err) {
    return reply.code(err.statusCode || 400).send({ success: false, message: err.message });
  }
}

export async function revertCollectionHandler(request, reply) {
  try {
    const result = await CollectionService.revertCollection(request.tenantDb, request.params.id, request.body?.reason, request.user?.name);
    return reply.send({ success: true, message: 'Collection reverted successfully', data: result });
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ success: false, message: err.message });
  }
}

export async function updateCollectionHandler(request, reply) {
  try {
    await CollectionService.updateCollection(request.tenantDb, request.params.id, request.body || {});
    return reply.send({ success: true, message: 'Collection updated successfully' });
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ success: false, message: err.message });
  }
}

export async function markChequeClearedHandler(request, reply) {
  try {
    await CollectionService.markChequeCleared(request.tenantDb, request.params.id);
    return reply.send({ success: true, message: 'Cheque marked as cleared' });
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ success: false, message: err.message });
  }
}

export async function markChequeBouncedHandler(request, reply) {
  try {
    const result = await CollectionService.markChequeBounced(request.tenantDb, request.params.id, request.body?.reason, request.user?.name);
    return reply.send({ success: true, message: 'Cheque marked as bounced', data: result });
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ success: false, message: err.message });
  }
}
