import mysql from 'mysql2/promise';
import { getMasterDbConfig, getTenantDbConfig } from '../config/db.js';
import * as tenantMigration from '../tenant-configuration/migrations/20260807000001-create-tenant-tables.js';
import * as tenantSeeder from '../tenant-configuration/seeders/tenantSeeders.js';
import { DataTypes, Sequelize, createQueryInterface } from '../database/sequelizeShim.js';

const TENANT_MIGRATION_NAME = '20260807000001-create-tenant-tables.js';

/**
 * Automates isolated Tenant Database creation, Sequelize table migrations, SequelizeMeta tracking,
 * and initial seeders whenever Super Admin provisions a new company.
 */
export async function provisionNewTenantCompany(masterDb, { company_code, name, admin_email, admin_password }) {
  const code = String(company_code).trim().toUpperCase();
  const dbName = `finance_db_${code.toLowerCase()}`;

  // db_user/db_password_enc are NOT NULL with no default — vestigial from an
  // earlier per-tenant-credentials design that was never actually built (every
  // tenant DB connection today shares the one NODE_ENV-wide DB_USER/DB_PASSWORD
  // from config/db.js, not a per-company stored credential). Populated here only
  // to satisfy the schema; not read anywhere.
  const masterConfigForInsert = getMasterDbConfig();

  // 1. Create company record in finance_master_db
  const [res] = await masterDb.query(
    `INSERT INTO companies (name, company_code, db_name, db_user, db_password_enc, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
    [name, code, dbName, masterConfigForInsert.user, 'unused_shared_credential']
  );
  const companyId = res.insertId;

  // 2. Create physical MySQL database if connected to a real MySQL instance
  try {
    const masterConfig = getMasterDbConfig();
    const serverConn = await mysql.createConnection({
      host: masterConfig.host,
      port: masterConfig.port,
      user: masterConfig.user,
      password: masterConfig.password
    });

    await serverConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await serverConn.end();
    console.log(`[INFO] Created physical MySQL database: ${dbName}`);

    // 3. Connect to newly created tenant DB and execute DDL migrations + initial seeders
    const tenantConfig = getTenantDbConfig(dbName);
    const tenantConn = await mysql.createConnection(tenantConfig);

    // Create standard SequelizeMeta tracking table
    await tenantConn.query(`
      CREATE TABLE IF NOT EXISTS \`SequelizeMeta\` (
        \`name\` varchar(255) COLLATE utf8mb3_unicode_ci NOT NULL,
        PRIMARY KEY (\`name\`),
        UNIQUE KEY \`name\` (\`name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;
    `);

    const queryInterface = createQueryInterface(tenantConn);

    // Execute tenant migrations, then only the structural defaults (chart of
    // accounts, EOD denominations) — NOT tenantSeeder.up's ALPHA-specific demo
    // content (named people, sample loans, and critically an admin@alpha.com
    // login) which would otherwise land in every newly provisioned tenant's
    // database, including a cross-tenant credential collision.
    await tenantMigration.up(queryInterface, { ...Sequelize, DataTypes });
    await tenantSeeder.seedDefaults(queryInterface);

    // Record migration in SequelizeMeta
    await tenantConn.query(
      `INSERT IGNORE INTO \`SequelizeMeta\` (\`name\`) VALUES (?)`,
      [TENANT_MIGRATION_NAME]
    );

    // Create default company admin user in tenant users table. company_id is
    // always 1 here, NOT the master DB's `companyId` (2, 3, ...) — a tenant DB is
    // exclusively that one company's data (database-per-tenant), and every other
    // query against it (tenantGuard, org/employee services) filters on that same
    // "always 1" convention, matching what the seeder already does for ALPHA.
    if (admin_email && admin_password) {
      await tenantConn.query(
        `INSERT INTO users (company_id, name, email, password, role, status) VALUES (1, ?, ?, ?, 'COMPANY_ADMIN', 'ACTIVE')`,
        [`${name} Admin`, admin_email, admin_password]
      );
    }

    await tenantConn.end();
    console.log(`[INFO] Automated migration (${TENANT_MIGRATION_NAME}) & seeding logged in SequelizeMeta for ${dbName}`);
  } catch (err) {
    console.warn(`[WARN] Automated tenant MySQL database creation note (${dbName}):`, err.message);
  }

  return {
    companyId,
    companyCode: code,
    companyName: name,
    dbName
  };
}
