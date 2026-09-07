import * as investorController from './investor.controller.js';
import * as investorCapitalController from './investorCapital.controller.js';

export default async function investorRoutes(fastify, options) {
  const onRequest = [fastify.authenticate, fastify.tenantGuard, fastify.requireTenantModule('investors')];

  fastify.get('/investors', { onRequest, preHandler: fastify.moduleGuard('INVESTORS', 'VIEW') }, investorController.listInvestorsHandler);
  fastify.post('/investors', { onRequest, preHandler: fastify.moduleGuard('INVESTORS', 'CREATE') }, investorController.createInvestorHandler);
  fastify.post('/investors/:id/add-capital', { onRequest, preHandler: fastify.moduleGuard('INVESTORS', 'CREATE') }, investorController.addInvestorCapitalHandler);
  fastify.get('/investors/:id/capital-ledger', { onRequest, preHandler: fastify.moduleGuard('INVESTORS', 'VIEW') }, investorController.getInvestorCapitalLedgerHandler);
  fastify.put('/investors/:id', { onRequest, preHandler: fastify.moduleGuard('INVESTORS', 'EDIT') }, investorController.updateInvestorHandler);
  fastify.delete('/investors/:id', { onRequest, preHandler: fastify.moduleGuard('INVESTORS', 'DELETE') }, investorController.deleteInvestorHandler);

  // Live share % + monthly profit distribution
  fastify.get('/investors/share-snapshot', { onRequest, preHandler: fastify.moduleGuard('INVESTORS', 'VIEW') }, investorCapitalController.getShareSnapshotHandler);
  fastify.get('/investors/profit-suggested', { onRequest, preHandler: fastify.moduleGuard('INVESTORS', 'VIEW') }, investorCapitalController.getSuggestedProfitHandler);
  fastify.get('/investors/profit-distributions', { onRequest, preHandler: fastify.moduleGuard('INVESTORS', 'VIEW') }, investorCapitalController.listDistributionsHandler);
  fastify.get('/investors/profit-distributions/:id', { onRequest, preHandler: fastify.moduleGuard('INVESTORS', 'VIEW') }, investorCapitalController.getDistributionHandler);
  fastify.post('/investors/profit-distributions', { onRequest, preHandler: fastify.moduleGuard('INVESTORS', 'PROFIT_DISTRIBUTE') }, investorCapitalController.createDistributionHandler);
  fastify.delete('/investors/profit-distributions/:id', { onRequest, preHandler: fastify.moduleGuard('INVESTORS', 'PROFIT_DISTRIBUTE') }, investorCapitalController.deleteDistributionHandler);
  fastify.put('/investors/profit-distributions/:id/lines/:lineId', { onRequest, preHandler: fastify.moduleGuard('INVESTORS', 'PROFIT_DISTRIBUTE') }, investorCapitalController.updateDistributionLineHandler);
  fastify.post('/investors/profit-distributions/:id/finalize', { onRequest, preHandler: fastify.moduleGuard('INVESTORS', 'PROFIT_DISTRIBUTE') }, investorCapitalController.finalizeDistributionHandler);

  // Capital withdrawal — Admin-only to initiate/cancel, all-investor approval, cash-gated execution
  fastify.get('/investors/capital-withdrawal-requests', { onRequest, preHandler: fastify.moduleGuard('INVESTORS', 'CAPITAL_WITHDRAW') }, investorCapitalController.listCapitalWithdrawalRequestsHandler);
  fastify.get('/investors/capital-withdrawal-requests/:reqId', { onRequest, preHandler: fastify.moduleGuard('INVESTORS', 'CAPITAL_WITHDRAW') }, investorCapitalController.getCapitalWithdrawalRequestHandler);
  fastify.post('/investors/:id/capital-withdrawal-requests', {
    onRequest,
    preHandler: [investorCapitalController.requireAdminForCapitalWithdrawal, fastify.moduleGuard('INVESTORS', 'CAPITAL_WITHDRAW')]
  }, investorCapitalController.createCapitalWithdrawalRequestHandler);
  fastify.post('/investors/capital-withdrawal-requests/:reqId/approvals/:investorId', { onRequest, preHandler: fastify.moduleGuard('INVESTORS', 'CAPITAL_WITHDRAW') }, investorCapitalController.recordWithdrawalApprovalHandler);
  fastify.post('/investors/capital-withdrawal-requests/:reqId/retry', { onRequest, preHandler: fastify.moduleGuard('INVESTORS', 'CAPITAL_WITHDRAW') }, investorCapitalController.retryCapitalWithdrawalHandler);
  fastify.post('/investors/capital-withdrawal-requests/:reqId/cancel', {
    onRequest,
    preHandler: [investorCapitalController.requireAdminForCapitalWithdrawal, fastify.moduleGuard('INVESTORS', 'CAPITAL_WITHDRAW')]
  }, investorCapitalController.cancelCapitalWithdrawalRequestHandler);
}
