/**
 * Master & Tenant Database Configuration Module
 * Master DB: finance_master_db
 * Tenant DB naming pattern: finance_db_<companycode> (e.g., finance_db_alpha)
 *
 * Values come from process.env, populated by loadEnv.js's two-step load
 * (.env for NODE_ENV, then .env.<NODE_ENV> for the actual settings) — so the
 * fallback defaults below only ever kick in if an .env.<mode> file is missing.
 */

export function getActiveProfile() {
  const env = (process.env.NODE_ENV || 'development').trim().toLowerCase();
  return {
    env,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.MASTER_DB_NAME || (env === 'test' ? 'finance_master_test_db' : 'finance_master_db')
  };
}

export function getMasterDbConfig() {
  const profile = getActiveProfile();
  return {
    host: profile.host,
    port: profile.port,
    user: profile.user,
    password: profile.password,
    database: profile.database,
    waitForConnections: true
  };
}

/**
 * Returns MySQL pool options for a tenant database.
 * @param {string} dbNameOrCode - Either an exact db_name already on record for a
 *   company (e.g. 'finance_db_alpha', or a custom name like 'finance_erp' the
 *   operator provisioned by hand) or a bare company_code (e.g. 'ALPHA') that
 *   still needs to be turned into the finance_db_<code> convention.
 *   A bare code is recognized as letters-only with no separators — anything
 *   containing '_' or a digit is treated as an already-resolved db_name and
 *   passed through untouched, so a real database like 'finance_erp' is never
 *   silently rewritten into 'finance_db_erp'.
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
    port: profile.port,
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
