import * as expenseService from './expense.service.js';

function fail(reply, err) {
  const code = err.statusCode || 500;
  return reply.code(code).send({
    success: false,
    error: code === 409 ? 'Conflict' : (code === 404 ? 'Not Found' : (code === 400 ? 'Bad Request' : 'Server Error')),
    message: err.message
  });
}

export async function listExpenseCategoriesHandler(request, reply) {
  try {
    const data = await expenseService.getExpenseCategories(request.tenantDb);
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function listExpenseAllocationRequestsHandler(request, reply) {
  try {
    const data = await expenseService.getExpenseAllocationRequests(request.tenantDb);
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function listExpenseVouchersHandler(request, reply) {
  try {
    const data = await expenseService.getExpenseVouchers(request.tenantDb);
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function createExpenseCategoryHandler(request, reply) {
  try {
    const data = await expenseService.createExpenseCategory(request.tenantDb, request.body, request.user?.name);
    return reply.code(201).send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function updateExpenseCategoryHandler(request, reply) {
  try {
    const data = await expenseService.updateExpenseCategory(request.tenantDb, request.params.id, request.body);
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function deleteExpenseCategoryHandler(request, reply) {
  try {
    await expenseService.deleteExpenseCategory(request.tenantDb, request.params.id);
    return reply.send({ success: true, message: 'Expense category deleted successfully.' });
  } catch (err) { return fail(reply, err); }
}

export async function addExpenseFundsHandler(request, reply) {
  try {
    const data = await expenseService.addExpenseFunds(request.tenantDb, request.body, request.user?.name);
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function createExpenseVoucherHandler(request, reply) {
  try {
    const data = await expenseService.createExpenseVoucher(request.tenantDb, request.body, request.user?.name);
    return reply.code(201).send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}
