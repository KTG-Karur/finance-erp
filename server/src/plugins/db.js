import fp from 'fastify-plugin';
import { getDbPool } from '../config/db.js';

async function dbPlugin(fastify, options) {
  const pool = await getDbPool();
  fastify.decorate('db', pool);
}

export default fp(dbPlugin, {
  name: 'db'
});
