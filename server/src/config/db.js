/**
 * Master & Tenant Database Configuration Module
 * Loads database configuration directly from config.json.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, 'config.json');
const configJson = JSON.parse(fs.readFileSync(configPath, 'utf8'));

export const DEVELOPMENT_DB_CONFIG = configJson.development;
export const PRODUCTION_DB_CONFIG = configJson.production;

export function getActiveProfile() {
  const env = (process.env.NODE_ENV || 'development').trim().toLowerCase();
  const config = configJson[env] || configJson.development;
  return {
    env,
    ...config
  };
}

export function getMasterDbConfig() {
  const profile = getActiveProfile();
  return {
    host: profile.host,
    port: Number(profile.port) || 3306,
    user: profile.user,
    password: profile.password,
    database: profile.database,
    waitForConnections: true
  };
}

/**
 * Returns MySQL pool options for a tenant database.
 * @param {string} dbNameOrCode - Either an exact db_name already on record for a
 *   company (e.g. 'finance_db_alpha') or a bare company_code (e.g. 'ALPHA').
 */
export function getTenantDbConfig(dbNameOrCode = 'alpha') {
  const profile = getActiveProfile();
  let dbName = String(dbNameOrCode);
  const isBareCode = /^[A-Za-z]+$/.test(dbName);

  if (isBareCode) {
    dbName = `finance_db_${dbName.toLowerCase()}`;
  }

  return {
    host: profile.host,
    port: Number(profile.port) || 3306,
    user: profile.user,
    password: profile.password,
    database: dbName,
    waitForConnections: true
  };
}

export const dbConfig = new Proxy({}, {
  get(target, prop) {
    if (prop === 'master') return getMasterDbConfig();
    return getActiveProfile()[prop];
  }
});

export default dbConfig;
