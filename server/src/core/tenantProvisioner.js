import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { getMasterDbConfig, getTenantDbConfig } from '../config/db.js';
import { runPendingTenantMigrations, getTenantMigrationFiles } from '../tenant-configuration/migrations/tenantMigrations.js';
import * as tenantSeeder from '../tenant-configuration/seeders/tenantSeeders.js';
import { DataTypes, Sequelize, createQueryInterface } from '../database/sequelizeShim.js';
import { ensureCompanyUploadDirectories, saveBase64File } from '../shared/utils/fileStorage.js';

/**
 * Automates isolated Tenant Database creation, Sequelize table migrations, SequelizeMeta tracking,
 * and initial seeders whenever Super Admin provisions a new company.
 */
export async function provisionNewTenantCompany(masterDb, {
  company_code,
  name,
  admin_email,
  admin_password,
  company_phone,
  company_email,
  phone,
  address,
  logo,
  plan_id,
  plan_code,
  status = 'TRIAL',
  trial_days = 15,
  billing_cycle = '3_MONTHS',
  custom_expiry_date = null
}) {
  const code = String(company_code).trim().toUpperCase();
  const dbName = `finance_db_${code.toLowerCase()}`;
  const contactPhone = phone || company_phone || null;
  const contactAddress = address || null;

  // Pre-create upload directories on disk for this tenant company
  await ensureCompanyUploadDirectories(code);

  // Save company logo to disk if base64 provided
  let diskLogo = null;
  if (logo && typeof logo === 'string') {
    diskLogo = await saveBase64File(logo, code, 'company-info', 'company_logo');
  }

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

  // 2. Insert company record in master database
  const isCompanyActive = status.toUpperCase() !== 'SUSPENDED' ? 1 : 0;
  const [res] = await masterDb.query(
    `INSERT INTO companies (name, company_code, db_name, plan_tier, max_branches, allowed_modules, phone, address, logo, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, code, dbName, planTier, maxBranches, allowedModulesStr, contactPhone, contactAddress, diskLogo, isCompanyActive]
  );
  const companyId = res.insertId;

  // 3. Create Subscription record in master database
  const subStatus = status.toUpperCase() === 'ACTIVE' ? 'ACTIVE' : (status.toUpperCase() === 'SUSPENDED' ? 'EXPIRED' : 'TRIAL');
  let days = Number(trial_days) || 15;

  if (subStatus === 'ACTIVE') {
    if (billing_cycle === '1_YEAR' || billing_cycle === 'ANNUAL' || billing_cycle === '12') {
      days = 365;
    } else if (billing_cycle === '6_MONTHS' || billing_cycle === '6') {
      days = 180;
    } else if (billing_cycle === '3_MONTHS' || billing_cycle === '3') {
      days = 90;
    } else if (billing_cycle === '1_MONTH' || billing_cycle === '1') {
      days = 30;
    } else {
      days = 90;
    }
  }

  const formattedCustomExpiry = custom_expiry_date ? String(custom_expiry_date).slice(0, 10) : null;

  if (planId) {
    if (formattedCustomExpiry) {
      await masterDb.query(
        `INSERT INTO subscriptions (company_id, plan_id, status, start_date, end_date, auto_renew) VALUES (?, ?, ?, NOW(), ?, 0)`,
        [companyId, planId, subStatus, formattedCustomExpiry]
      );
    } else {
      await masterDb.query(
        `INSERT INTO subscriptions (company_id, plan_id, status, start_date, end_date, auto_renew) VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), 0)`,
        [companyId, planId, subStatus, days]
      );
    }
  }

  // 4. Pre-create categorized upload directories for this tenant company
  await ensureCompanyUploadDirectories(code);
  console.log(`[INFO] Initialized upload directories for company '${code}' under server/uploads/${code}/`);

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
        \`name\` varchar(255) NOT NULL,
        PRIMARY KEY (\`name\`),
        UNIQUE KEY \`name\` (\`name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const queryInterface = createQueryInterface(tenantConn);
    const { appliedCount, totalMigrations } = await runPendingTenantMigrations(tenantConn);
    await tenantSeeder.seedDefaults(queryInterface);

    // Create default company admin user in tenant users table
    if (admin_email && admin_password) {
      const hashedAdminPassword = admin_password.startsWith('$2') ? admin_password : await bcrypt.hash(admin_password, 10);
      await tenantConn.query(
        `INSERT INTO users (company_id, name, email, password, role, status) VALUES (1, ?, ?, ?, 'COMPANY_ADMIN', 'ACTIVE')`,
        [`${name} Admin`, admin_email, hashedAdminPassword]
      );
    }

    await tenantConn.end();
    console.log(`[INFO] Automated migrations (${appliedCount}/${totalMigrations} executed) & seeding completed for ${dbName}`);
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
