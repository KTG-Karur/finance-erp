import * as employeeService from './employee.service.js';

function fail(reply, err) {
  const code = err.statusCode || 500;
  return reply.code(code).send({
    error: code === 409 ? 'Conflict' : (code === 404 ? 'Not Found' : (code === 400 ? 'Bad Request' : 'Server Error')),
    message: err.message
  });
}

export async function listEmployeesHandler(request, reply) {
  try {
    const employees = await employeeService.getAllEmployees(request.tenantDb, request.tenantCompanyId);
    return reply.send({ success: true, data: employees });
  } catch (err) { return fail(reply, err); }
}

export async function createEmployeeHandler(request, reply) {
  try {
    const newEmp = await employeeService.createEmployee(request.tenantDb, request.tenantCompanyId, request.body);
    return reply.code(201).send({ success: true, data: newEmp });
  } catch (err) { return fail(reply, err); }
}

export async function updateEmployeeHandler(request, reply) {
  try {
    const { userId } = request.params;
    const updated = await employeeService.updateEmployee(request.tenantDb, request.tenantCompanyId, Number(userId), request.body);
    return reply.send({ success: true, data: updated });
  } catch (err) { return fail(reply, err); }
}

export async function deleteEmployeeHandler(request, reply) {
  try {
    const { userId } = request.params;
    await employeeService.deleteEmployee(request.tenantDb, request.tenantCompanyId, Number(userId));
    return reply.send({ success: true, message: 'Employee deleted successfully.' });
  } catch (err) { return fail(reply, err); }
}

export async function updatePermissionsHandler(request, reply) {
  try {
    const { userId } = request.params;
    const { permissions } = request.body;
    const result = await employeeService.updateEmployeePermissions(
      request.tenantDb,
      request.tenantCompanyId,
      Number(userId),
      permissions
    );
    return reply.send(result);
  } catch (err) {
    return reply.code(500).send({ error: 'Server Error', message: err.message });
  }
}

export async function updateBranchesHandler(request, reply) {
  try {
    const { userId } = request.params;
    const { branch_ids = [] } = request.body || {};
    const result = await employeeService.updateEmployeeBranches(
      request.tenantDb,
      request.tenantCompanyId,
      Number(userId),
      branch_ids
    );
    return reply.send(result);
  } catch (err) {
    return reply.code(500).send({ error: 'Server Error', message: err.message });
  }
}
