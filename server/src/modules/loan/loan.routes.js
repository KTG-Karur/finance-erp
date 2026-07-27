import * as collectionController from './collection.controller.js';
import { createLoanSchema, recordCollectionSchema } from './loan.schema.js';

export default async function loanRoutes(fastify, options) {
  fastify.addHook('onRequest', fastify.authenticate);
  fastify.addHook('preHandler', fastify.tenantGuard);

  // Get active loans
  fastify.get('/loans', {
    preHandler: fastify.moduleGuard('LOANS', 'VIEW')
  }, collectionController.listLoansHandler);

  // Disburse / Create Loan
  fastify.post('/loans', {
    schema: createLoanSchema,
    preHandler: fastify.moduleGuard('LOANS', 'CREATE')
  }, collectionController.createLoanHandler);

  // Record Collection Drawer Submission
  fastify.post('/collections', {
    schema: recordCollectionSchema,
    preHandler: fastify.moduleGuard('COLLECTIONS', 'COLLECT')
  }, collectionController.recordCollectionHandler);

  // List Collection History
  fastify.get('/collections', {
    preHandler: fastify.moduleGuard('COLLECTIONS', 'VIEW')
  }, collectionController.listCollectionsHandler);
}
