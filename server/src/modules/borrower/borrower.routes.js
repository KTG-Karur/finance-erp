import * as borrowerController from './borrower.controller.js';
import { createBorrowerSchema, updateBorrowerSchema, rejectKycSchema } from './borrower.schema.js';

export default async function borrowerRoutes(fastify, options) {
  fastify.addHook('onRequest', fastify.authenticate);
  fastify.addHook('preHandler', fastify.tenantGuard);

  fastify.get('/borrowers', {
    preHandler: fastify.moduleGuard('BORROWERS', 'VIEW')
  }, borrowerController.listBorrowersHandler);

  fastify.get('/borrowers/:id', {
    preHandler: fastify.moduleGuard('BORROWERS', 'VIEW')
  }, borrowerController.getBorrowerHandler);

  fastify.post('/borrowers', {
    schema: createBorrowerSchema,
    preHandler: fastify.moduleGuard('BORROWERS', 'CREATE')
  }, borrowerController.createBorrowerHandler);

  fastify.put('/borrowers/:id', {
    schema: updateBorrowerSchema,
    preHandler: fastify.moduleGuard('BORROWERS', 'EDIT')
  }, borrowerController.updateBorrowerHandler);

  fastify.delete('/borrowers/:id', {
    preHandler: fastify.moduleGuard('BORROWERS', 'DELETE')
  }, borrowerController.deleteBorrowerHandler);

  fastify.post('/borrowers/:id/kyc-verify', {
    preHandler: fastify.moduleGuard('BORROWERS', 'KYC_REVIEW')
  }, borrowerController.verifyBorrowerKycHandler);

  fastify.post('/borrowers/:id/kyc-reject', {
    schema: rejectKycSchema,
    preHandler: fastify.moduleGuard('BORROWERS', 'KYC_REVIEW')
  }, borrowerController.rejectBorrowerKycHandler);
}
