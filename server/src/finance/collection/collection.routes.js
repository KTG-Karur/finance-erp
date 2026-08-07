import {
  getCollectionsHandler,
  recordCollectionHandler
} from './collection.controller.js';

export default async function collectionRoutes(fastify, options) {
  const onRequest = [fastify.authenticate, fastify.tenantGuard, fastify.moduleGuard('loan')];

  fastify.get('/collections', { onRequest }, getCollectionsHandler);
  fastify.post('/collections', { onRequest }, recordCollectionHandler);
}
