import * as investorController from './investor.controller.js';

export default async function investorRoutes(fastify, options) {
  const onRequest = [fastify.authenticate, fastify.tenantGuard, fastify.requireTenantModule('investors')];

  fastify.get('/investors', { onRequest, preHandler: fastify.moduleGuard('INVESTORS', 'VIEW') }, investorController.listInvestorsHandler);
  fastify.post('/investors', { onRequest, preHandler: fastify.moduleGuard('INVESTORS', 'CREATE') }, investorController.createInvestorHandler);
  fastify.put('/investors/:id', { onRequest, preHandler: fastify.moduleGuard('INVESTORS', 'EDIT') }, investorController.updateInvestorHandler);
  fastify.delete('/investors/:id', { onRequest, preHandler: fastify.moduleGuard('INVESTORS', 'DELETE') }, investorController.deleteInvestorHandler);
}
