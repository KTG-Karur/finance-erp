import { SchemeService } from './scheme.service.js';

function fail(reply, err) {
  const code = err.statusCode || 500;
  const errorLabel = code === 409 ? 'Conflict' : (code === 404 ? 'Not Found' : (code === 400 ? 'Bad Request' : 'Server Error'));
  return reply.code(code).send({ success: false, error: errorLabel, message: err.message });
}

export async function getSchemesHandler(request, reply) {
  try {
    const data = await SchemeService.getAllSchemes(request.tenantDb);
    return reply.send({ success: true, count: data.length, data });
  } catch (err) {
    return fail(reply, err);
  }
}

export async function getSchemeByIdHandler(request, reply) {
  try {
    const data = await SchemeService.getSchemeById(request.tenantDb, request.params.id);
    if (!data) {
      return reply.code(404).send({ success: false, message: 'Loan scheme not found.' });
    }
    return reply.send({ success: true, data });
  } catch (err) {
    return fail(reply, err);
  }
}

export async function createSchemeHandler(request, reply) {
  try {
    const data = await SchemeService.createScheme(request.tenantDb, request.body);
    return reply.code(201).send({ success: true, message: 'Loan scheme created successfully.', data });
  } catch (err) {
    return fail(reply, err);
  }
}

export async function updateSchemeHandler(request, reply) {
  try {
    const data = await SchemeService.updateScheme(request.tenantDb, request.params.id, request.body);
    return reply.send({ success: true, message: 'Loan scheme updated successfully.', data });
  } catch (err) {
    return fail(reply, err);
  }
}

export async function deleteSchemeHandler(request, reply) {
  try {
    await SchemeService.deleteScheme(request.tenantDb, request.params.id);
    return reply.send({ success: true, message: 'Loan scheme deleted successfully.' });
  } catch (err) {
    return fail(reply, err);
  }
}
