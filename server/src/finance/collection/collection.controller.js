import { CollectionService } from './collection.service.js';

export async function getCollectionsHandler(request, reply) {
  try {
    const collections = await CollectionService.getCollections(request.tenantDb, request.query);
    return reply.send({ success: true, count: collections.length, data: collections });
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
}

export async function recordCollectionHandler(request, reply) {
  try {
    const collection = await CollectionService.recordCollection(request.tenantDb, request.body);
    return reply.code(201).send({ success: true, message: 'Collection receipt recorded successfully', data: collection });
  } catch (err) {
    return reply.code(400).send({ success: false, message: err.message });
  }
}
