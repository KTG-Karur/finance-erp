import fp from 'fastify-plugin';
import mysql from 'mysql2/promise';
import { getTenantDbConfig } from '../config/db.js';

// No mock/fallback path — every mode connects to a real MySQL tenant database.
// A connection or query failure is real feedback (bad DB, wrong creds, dropped
// network) and should surface as one, not get silently swapped for fake data.

const tenantPoolsMap = new Map();
const poolLastAccessedMap = new Map();

// Eviction interval to auto-close idle dynamic pools
setInterval(() => {
  const now = Date.now();
  const defaultConfig = getTenantDbConfig();
  const ttl = defaultConfig.idleTimeoutMs || 15 * 60 * 1000;

  for (const [dbName, lastAccess] of poolLastAccessedMap.entries()) {
    if (now - lastAccess > ttl) {
      const pool = tenantPoolsMap.get(dbName);
      if (pool && typeof pool.end === 'function') {
        pool.end().catch(() => {});
      }
      tenantPoolsMap.delete(dbName);
      poolLastAccessedMap.delete(dbName);
      console.log(`[INFO] Idle tenant pool evicted from memory: ${dbName}`);
    }
  }
}, 60000);

export function getTenantDbPool(dbName) {
  const poolConfig = getTenantDbConfig(dbName);
  const targetDbName = poolConfig.database;

  poolLastAccessedMap.set(targetDbName, Date.now());

  if (tenantPoolsMap.has(targetDbName)) {
    return tenantPoolsMap.get(targetDbName);
  }

  const pool = mysql.createPool(poolConfig);
  tenantPoolsMap.set(targetDbName, pool);
  return pool;
}

async function tenantDbPlugin(fastify, options) {
  fastify.decorate('getTenantDbPool', getTenantDbPool);
}

export default fp(tenantDbPlugin, {
  name: 'tenantDb'
});
