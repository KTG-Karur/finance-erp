import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import dotenv from 'dotenv';

import masterDbPlugin from './plugins/masterDb.js';
import tenantDbPlugin from './plugins/tenantDb.js';
import dbPlugin from './plugins/db.js';
import authPlugin from './plugins/auth.js';
import tenantGuardPlugin from './plugins/tenantGuard.js';
import moduleGuardPlugin from './plugins/moduleGuard.js';

import authRoutes from './modules/auth/auth.routes.js';
import employeeRoutes from './modules/employee/employee.routes.js';
import loanRoutes from './modules/loan/loan.routes.js';
import financeRoutes from './modules/finance/finance.routes.js';
import borrowerRoutes from './modules/borrower/borrower.routes.js';
import orgRoutes from './modules/org/org.routes.js';

dotenv.config();

const fastify = Fastify({
  logger: true
});

// Register Core Plugins
await fastify.register(cors, { origin: true, credentials: true });
await fastify.register(sensible);
await fastify.register(masterDbPlugin);
await fastify.register(tenantDbPlugin);
await fastify.register(dbPlugin);
await fastify.register(authPlugin);
await fastify.register(tenantGuardPlugin);
await fastify.register(moduleGuardPlugin);

// Health Check
fastify.get('/health', async (request, reply) => {
  return { status: 'OK', system: 'Database-per-Tenant Financial ERP API', timestamp: new Date() };
});

// Register Auth Routes
fastify.register(authRoutes, { prefix: '/api/v1/auth' });
fastify.register(authRoutes, { prefix: '/api/auth' });

// Register Domain Modules
fastify.register(employeeRoutes, { prefix: '/api/employees' });
fastify.register(loanRoutes, { prefix: '/api' });
fastify.register(financeRoutes, { prefix: '/api/finance' });
fastify.register(borrowerRoutes, { prefix: '/api' });
fastify.register(orgRoutes, { prefix: '/api' });

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`🚀 Financial ERP API server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
