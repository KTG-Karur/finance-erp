import fp from 'fastify-plugin';
import mysql from 'mysql2/promise';
import { getMasterDbConfig } from '../config/db.js';

// No mock/fallback path — every mode (development, test, production) connects to
// a real MySQL database (see .env.<mode> for which one). A connection failure is
// a real failure and should surface as one (the client's GlobalErrorBanner exists
// specifically to show that), not get silently papered over with fake data.
async function masterDbPlugin(fastify, options) {
  const config = getMasterDbConfig();
  const masterPool = mysql.createPool(config);

  const conn = await masterPool.getConnection();
  conn.release();
  console.log(`Connected to Central Master Database (${config.database}).`);

  fastify.decorate('masterDb', masterPool);
}

export default fp(masterDbPlugin, { name: 'masterDb' });
