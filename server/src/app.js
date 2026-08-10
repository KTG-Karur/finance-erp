import dotenv from 'dotenv';
dotenv.config();

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';

import masterDbPlugin from './plugins/masterDb.js';
import tenantDbPlugin from './plugins/tenantDb.js';
import dbPlugin from './plugins/db.js';
import authPlugin from './plugins/auth.js';
import tenantGuardPlugin from './plugins/tenantGuard.js';
import moduleGuardPlugin from './plugins/moduleGuard.js';

import authRoutes from './modules/auth/auth.routes.js';
import financeRoutes from './finance/finance.routes.js';
import orgRoutes from './modules/org/org.routes.js';
import employeeRoutes from './modules/employee/employee.routes.js';

const fastify = Fastify({
  logger: false
});

// Origin allowlist instead of `origin: true` (which reflects any caller's Origin
// header back — with credentials:true that's effectively "trust every website").
// Comma-separated via CORS_ORIGINS in .env; defaults cover the Vite dev server.
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

// Register Core Plugins
await fastify.register(cors, {
  origin(origin, cb) {
    // Same-origin/non-browser requests (curl, server-to-server, mobile) send no
    // Origin header at all — those aren't a CSRF/XSS vector this check guards
    // against, so let them through; only browser cross-origin calls get checked.
    // Passing `false` (rather than an Error) just omits the CORS headers — the
    // browser itself blocks the response from being read; the server still
    // replies normally instead of surfacing a raw 500.
    cb(null, !origin || allowedOrigins.includes(origin));
  },
  credentials: true
});

await fastify.register(helmet, {
  // This is a JSON API consumed by a separately-hosted SPA (different origin/port
  // in dev, likely a different origin in prod too) — helmet's default
  // Cross-Origin-Resource-Policy: 'same-origin' would make the browser block the
  // client from reading every response. CSP is likewise an HTML-page concern and
  // has nothing to protect here since this server never renders HTML.
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
});

await fastify.register(rateLimit, {
  max: 300,
  timeWindow: '1 minute',
  // @fastify/rate-limit throws whatever this returns and relies on `.statusCode`
  // to set the reply status — omitting it silently produces a 500 instead of 429.
  errorResponseBuilder: (request, context) => ({
    statusCode: context.statusCode,
    success: false,
    error: 'Too Many Requests',
    message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)}s.`
  })
});

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
fastify.register(authRoutes, { prefix: '/api/auth' });

// Register General Finance Domain Engine
fastify.register(financeRoutes, { prefix: '/api/finance' });
fastify.register(financeRoutes, { prefix: '/api' });

// Org (branches/sub-companies) and Employees
fastify.register(orgRoutes, { prefix: '/api' });
fastify.register(employeeRoutes, { prefix: '/api/employees' });

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`API server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    console.error('[ERROR] Server failed to start:', err.message);
    process.exit(1);
  }
}

start();
