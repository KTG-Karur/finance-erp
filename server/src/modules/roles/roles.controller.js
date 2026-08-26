import * as roleService from './roles.service.js';

export async function listRolesHandler(request, reply) {
  const companyId = request.companyId || 1;
  const roles = await roleService.getAllRoles(request.tenantDb, companyId);
  return reply.send({ success: true, data: roles });
}

export async function createRoleHandler(request, reply) {
  const companyId = request.companyId || 1;
  const role = await roleService.createRole(request.tenantDb, companyId, request.body);
  return reply.code(201).send({ success: true, data: role });
}

export async function updateRoleHandler(request, reply) {
  const companyId = request.companyId || 1;
  const { roleCode } = request.params;
  const role = await roleService.updateRole(request.tenantDb, companyId, roleCode, request.body);
  return reply.send({ success: true, data: role });
}

export async function deleteRoleHandler(request, reply) {
  const companyId = request.companyId || 1;
  const { roleCode } = request.params;
  const result = await roleService.deleteRole(request.tenantDb, companyId, roleCode);
  return reply.send({ success: true, data: result });
}
