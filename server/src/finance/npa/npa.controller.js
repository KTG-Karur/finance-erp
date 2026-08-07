import { NpaService } from './npa.service.js';

export async function getNpaSummaryHandler(request, reply) {
  try {
    const summary = await NpaService.getNpaSummary(request.tenantDb);
    return reply.send({ success: true, data: summary });
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
}
