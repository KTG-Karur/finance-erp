/**
 * Master & Tenant Database Configuration Module
 * Master DB: finance_master_db
 * Tenant DB naming pattern: finance_db_<companycode> (e.g., finance_db_alpha)
 */

const developmentConfig = {
  env: 'development',
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'finance_master_db'
};

const productionConfig = {
  env: 'production',
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'prod_secure_password',
  database: 'finance_master_db'
};

const testConfig = {
  env: 'test',
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'finance_master_test_db'
};

const profiles = {
  development: developmentConfig,
  production: productionConfig,
  test: testConfig
};

export function getActiveProfile() {
  const env = (process.env.NODE_ENV || 'development').trim().toLowerCase();
  return profiles[env] || developmentConfig;
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
 * Returns MySQL pool options for a tenant database following finance_db_<companycode> convention
 * @param {string} dbNameOrCode - Exact db_name (e.g. 'finance_db_alpha') or company_code (e.g. 'ALPHA')
 */
export function getTenantDbConfig(dbNameOrCode = 'alpha') {
  const profile = getActiveProfile();
  let dbName = String(dbNameOrCode);

  if (!dbName.startsWith('finance_db_')) {
    const code = dbName.replace(/^finance_/, '').replace(/_db$/, '').toLowerCase();
    dbName = `finance_db_${code}`;
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
