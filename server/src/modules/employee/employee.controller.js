import * as employeeService from './employee.service.js';

export async function listEmployeesHandler(request, reply) {
  try {
    const employees = await employeeService.getAllEmployees(request.server.db, request.companyId);
    return reply.send({ success: true, data: employees });
  } catch (err) {
    return reply.code(500).send({ error: 'Server Error', message: err.message });
  }
}

export async function createEmployeeHandler(request, reply) {
  try {
    const newEmp = await employeeService.createEmployee(request.server.db, request.companyId, request.body);
    return reply.code(201).send({ success: true, data: newEmp });
  } catch (err) {
    return reply.code(500).send({ error: 'Server Error', message: err.message });
  }
}

export async function updatePermissionsHandler(request, reply) {
  try {
    const { userId } = request.params;
    const { permissions } = request.body;
    const result = await employeeService.updateEmployeePermissions(
      request.server.db,
      request.companyId,
      Number(userId),
      permissions
    );
    return reply.send(result);
  } catch (err) {
    return reply.code(500).send({ error: 'Server Error', message: err.message });
  }
}
