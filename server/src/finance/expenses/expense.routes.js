import * as expenseController from './expense.controller.js';

export default async function expenseRoutes(fastify, options) {
  const onRequest = [fastify.authenticate, fastify.tenantGuard, fastify.requireTenantModule('expense_allocation')];
  const g = (action) => ({ onRequest, preHandler: fastify.moduleGuard('EXPENSES', action) });

  fastify.get('/expenses/categories', g('VIEW'), expenseController.listExpenseCategoriesHandler);
  fastify.post('/expenses/categories', g('CREATE'), expenseController.createExpenseCategoryHandler);
  fastify.put('/expenses/categories/:id', g('EDIT'), expenseController.updateExpenseCategoryHandler);
  fastify.delete('/expenses/categories/:id', g('DELETE'), expenseController.deleteExpenseCategoryHandler);
  fastify.post('/expenses/categories/fund', g('FUND'), expenseController.addExpenseFundsHandler);

  fastify.get('/expenses/allocation-requests', g('VIEW'), expenseController.listExpenseAllocationRequestsHandler);

  fastify.get('/expenses/vouchers', g('VIEW'), expenseController.listExpenseVouchersHandler);
  fastify.post('/expenses/vouchers', g('VOUCHER'), expenseController.createExpenseVoucherHandler);
}
