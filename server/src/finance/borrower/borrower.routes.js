import {
  getBorrowersHandler,
  getBorrowerByIdHandler,
  createBorrowerHandler
} from './borrower.controller.js';

export default async function borrowerRoutes(fastify, options) {
  const onRequest = [fastify.authenticate, fastify.tenantGuard, fastify.moduleGuard('loan')];

  fastify.get('/borrowers', { onRequest }, getBorrowersHandler);
  fastify.get('/borrowers/:id', { onRequest }, getBorrowerByIdHandler);
  fastify.post('/borrowers', { onRequest }, createBorrowerHandler);
}
