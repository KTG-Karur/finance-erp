import * as trashService from './trash.service.js';

function fail(reply, err) {
  const code = err.statusCode || 500;
  return reply.code(code).send({
    success: false,
    error: code === 409 ? 'Conflict' : (code === 404 ? 'Not Found' : (code === 400 ? 'Bad Request' : 'Server Error')),
    message: err.message
  });
}

export async function listDeletedRecordsHandler(request, reply) {
  try {
    const companyId = request.tenantCode || request.user?.companyCode || 1;
    const data = await trashService.getDeletedRecords(request.tenantDb, companyId);
    return reply.send({ success: true, data });
  } catch (err) {
    return fail(reply, err);
  }
}

export async function restoreRecordHandler(request, reply) {
  try {
    const { entity_type, id } = request.body || {};
    if (!entity_type || id === undefined || id === null) {
      const err = new Error('entity_type and id are required to restore a record.');
      err.statusCode = 400;
      throw err;
    }
    const data = await trashService.restoreDeletedRecord(request.tenantDb, entity_type, id);
    return reply.send({ success: true, data });
  } catch (err) {
    return fail(reply, err);
  }
}
