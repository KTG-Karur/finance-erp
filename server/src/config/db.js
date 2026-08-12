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
    waitForConnections: true,
    // Without this, mysql2 returns DATE/DATETIME columns as JS Date objects
    // rather than the 'YYYY-MM-DD' strings every date filter/comparison in
    // this codebase (and the React tables that render them directly) expects
    // — a Date object silently breaks string comparisons like `date >= from`
    // (always false), silently sorts wrong, and crashes React if ever
    // rendered as a raw child. Forcing plain date strings at the connection
    // level fixes this for every query, everywhere, instead of requiring
    // every caller to defensively unwrap it.
    dateStrings: true,
    // Same disease, different column type: mysql2 also returns DECIMAL/
    // NEWDECIMAL columns (every money field in this schema) as JS strings by
    // default, specifically to avoid float rounding — but this codebase
    // already commits to float-based money math everywhere (parseFloat,
    // Math.round, toLocaleString, ...), it just doesn't always remember to
    // wrap a raw DB value first. `row.interest_paid + iCover` with a string
    // left-hand side is JS string concatenation, not addition — found live
    // in collection.service.js's schedule-row allocation, silently
    // corrupting repayment_schedules.principal_paid/interest_paid into
    // garbage values on essentially every partial EMI payment. Numbers at
    // the connection level closes off this entire bug class, the same way
    // dateStrings did for dates.
    decimalNumbers: true
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
    waitForConnections: true,
    // See the matching comments in getMasterDbConfig() — same reasoning
    // applies to every tenant DB, since it's exactly the tenant tables
    // (fixed_deposits, journal_entries, repayment_schedules, borrowers, etc.)
    // whose DATE/DATETIME and DECIMAL columns these bugs actually surfaced on.
    dateStrings: true,
    decimalNumbers: true
  };
}

export const dbConfig = new Proxy({}, {
  get(target, prop) {
    if (prop === 'master') return getMasterDbConfig();
    return getActiveProfile()[prop];
  }
});

export default dbConfig;
