import * as orgService from './org.service.js';

function fail(reply, err) {
  const code = err.statusCode || 500;
  return reply.code(code).send({
    error: code === 409 ? 'Conflict' : (code === 404 ? 'Not Found' : 'Server Error'),
    message: err.message
  });
}

export async function listSubCompaniesHandler(request, reply) {
  try {
    const data = await orgService.getSubCompanies(request.server.db, request.companyId);
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function createSubCompanyHandler(request, reply) {
  try {
    const data = await orgService.createSubCompany(request.server.db, request.companyId, request.body);
    return reply.code(201).send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function updateSubCompanyHandler(request, reply) {
  try {
    const data = await orgService.updateSubCompany(request.server.db, request.companyId, request.params.id, request.body);
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function deleteSubCompanyHandler(request, reply) {
  try {
    await orgService.deleteSubCompany(request.server.db, request.companyId, request.params.id);
    return reply.send({ success: true, message: 'Sub-company deleted successfully.' });
  } catch (err) { return fail(reply, err); }
}

export async function listBranchesHandler(request, reply) {
  try {
    const data = await orgService.getBranches(request.server.db, request.companyId);
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function createBranchHandler(request, reply) {
  try {
    const data = await orgService.createBranch(request.server.db, request.companyId, request.body);
    return reply.code(201).send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function updateBranchHandler(request, reply) {
  try {
    const data = await orgService.updateBranch(request.server.db, request.companyId, request.params.id, request.body);
    return reply.send({ success: true, data });
  } catch (err) { return fail(reply, err); }
}

export async function deleteBranchHandler(request, reply) {
  try {
    await orgService.deleteBranch(request.server.db, request.companyId, request.params.id);
    return reply.send({ success: true, message: 'Branch deleted successfully.' });
  } catch (err) { return fail(reply, err); }
}
