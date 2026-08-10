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
export async function provisionNewTenantCompany(masterDb, { company_code, name, admin_email, admin_password, plan_id, plan_code }) {
  const code = String(company_code).trim().toUpperCase();
  const dbName = `finance_db_${code.toLowerCase()}`;

  // 1. Resolve plan details if provided
  let planId = plan_id || null;
  let maxBranches = null;
  let allowedModules = null;
  let planTier = 'STANDARD';

  if (!planId && plan_code) {
    const [pRows] = await masterDb.query(`SELECT id, code, max_branches, allowed_modules FROM plans WHERE code = ? AND is_active = 1`, [plan_code.toUpperCase()]);
    if (pRows.length > 0) {
      planId = pRows[0].id;
      planTier = pRows[0].code;
      maxBranches = pRows[0].max_branches;
      allowedModules = pRows[0].allowed_modules;
    }
  } else if (planId) {
    const [pRows] = await masterDb.query(`SELECT id, code, max_branches, allowed_modules FROM plans WHERE id = ? AND is_active = 1`, [planId]);
    if (pRows.length > 0) {
      planTier = pRows[0].code;
      maxBranches = pRows[0].max_branches;
      allowedModules = pRows[0].allowed_modules;
    }
  }

  if (!planId) {
    // Default to Standard Plan (id 2)
    const [defPlan] = await masterDb.query(`SELECT id, code, max_branches, allowed_modules FROM plans WHERE code = 'STANDARD'`);
    if (defPlan.length > 0) {
      planId = defPlan[0].id;
      planTier = defPlan[0].code;
      maxBranches = defPlan[0].max_branches;
      allowedModules = defPlan[0].allowed_modules;
    }
  }

  const allowedModulesStr = allowedModules ? (typeof allowedModules === 'string' ? allowedModules : JSON.stringify(allowedModules)) : null;

  // 2. Insert company record in master database (without db credentials)
  const [res] = await masterDb.query(
    `INSERT INTO companies (name, company_code, db_name, plan_tier, max_branches, allowed_modules, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [name, code, dbName, planTier, maxBranches, allowedModulesStr]
  );
  const companyId = res.insertId;

  // 3. Create Subscription record in master database
  if (planId) {
    await masterDb.query(
      `INSERT INTO subscriptions (company_id, plan_id, status, start_date, auto_renew) VALUES (?, ?, 'ACTIVE', NOW(), 1)`,
      [companyId, planId]
    );
  }

  // 4. Create physical MySQL database if connected to a real MySQL instance
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

    // 5. Connect to newly created tenant DB and execute DDL migrations + initial seeders
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

    // Execute tenant migrations and structural defaults (Chart of Accounts, EOD Denominations)
    await tenantMigration.up(queryInterface, { ...Sequelize, DataTypes });
    await tenantSeeder.seedDefaults(queryInterface);

    // Record migration in SequelizeMeta
    await tenantConn.query(
      `INSERT IGNORE INTO \`SequelizeMeta\` (\`name\`) VALUES (?)`,
      [TENANT_MIGRATION_NAME]
    );

    // Create default company admin user in tenant users table
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
    dbName,
    planTier,
    maxBranches,
    allowedModules
  };
}
