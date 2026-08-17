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

  const maxRetries = Number(process.env.DB_CONNECT_RETRIES) || 10;
  const retryIntervalMs = Number(process.env.DB_CONNECT_RETRY_INTERVAL_MS) || 3000;
  let connected = false;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const conn = await masterPool.getConnection();
      conn.release();
      console.log(`Connected to Central Master Database (${config.database}).`);
      connected = true;
      break;
    } catch (err) {
      console.warn(
        `[WARN] Central Master Database connection attempt ${attempt}/${maxRetries} failed (${err.code || err.message}). Retrying in ${retryIntervalMs / 1000}s...`
      );
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
      }
    }
  }

  if (!connected) {
    throw new Error(
      `Failed to connect to Central Master Database (${config.database}) after ${maxRetries} attempts.`
    );
  }

  fastify.decorate('masterDb', masterPool);
}

export default fp(masterDbPlugin, { name: 'masterDb' });
