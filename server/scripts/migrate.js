import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import mysql from 'mysql2/promise';
import { getMasterDbConfig, getTenantDbConfig } from '../src/config/db.js';
import { DataTypes, Sequelize, createQueryInterface } from '../src/database/sequelizeShim.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getMigrationList(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const files = fs.readdirSync(dirPath)
    .filter(f => /^\d+.*\.js$/.test(f))
    .sort();
  return files.map(filename => ({
    name: filename,
    load: () => import(pathToFileURL(path.join(dirPath, filename)).href)
  }));
}

async function migrateSingleDb(config, migrations, loadSeeder) {
  const dbName = config.database;

  const serverConn = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password
  });
  await serverConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  await serverConn.end();
  console.log(`[migrate] Database '${dbName}' ready.`);

  const conn = await mysql.createConnection(config);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`SequelizeMeta\` (
      \`name\` VARCHAR(255) NOT NULL,
      PRIMARY KEY (\`name\`),
      UNIQUE KEY \`name\` (\`name\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const [migratedRows] = await conn.query('SELECT `name` FROM `SequelizeMeta`');
  const appliedSet = new Set(migratedRows.map(r => r.name));

  const queryInterface = createQueryInterface(conn);
  const sequelizeArg = { ...Sequelize, DataTypes };

  let appliedCount = 0;
  for (const m of migrations) {
    if (appliedSet.has(m.name)) {
      console.log(`[migrate] '${dbName}' already has '${m.name}' — skipping.`);
      continue;
    }

    console.log(`[migrate] Applying migration '${m.name}' to '${dbName}'...`);
    const mod = await m.load();
    await mod.up(queryInterface, sequelizeArg);
    await conn.query('INSERT INTO `SequelizeMeta` (`name`) VALUES (?)', [m.name]);
    appliedSet.add(m.name);
    appliedCount++;
    console.log(`[migrate] Migration '${m.name}' applied successfully.`);
  }

  // If this was an initial migration on an empty DB, seed initial defaults
  if (appliedCount > 0 && loadSeeder && appliedSet.size === migrations.length && migratedRows.length === 0) {
    try {
      const seeder = await loadSeeder();
      if (seeder?.seedDefaults) {
        await seeder.seedDefaults(queryInterface);
        console.log(`[migrate] Initial seed data inserted for '${dbName}'.`);
      } else if (seeder?.up) {
        await seeder.up(queryInterface, sequelizeArg);
        console.log(`[migrate] Initial seed data inserted for '${dbName}'.`);
      }
    } catch (sErr) {
      console.warn(`[migrate] Seeder note:`, sErr.message);
    }
  }

  await conn.end();
  console.log(`[migrate] Done: '${dbName}' (${appliedCount} new migration(s) applied).`);
  return appliedCount;
}

async function run() {
  const [, , kind = 'tenant', dbNameArg] = process.argv;

  if (kind !== 'master' && kind !== 'tenant') {
    console.error('Usage: node scripts/migrate.js <master|tenant> [db_name]');
    process.exit(1);
  }

  if (kind === 'master') {
    const masterMigrationsDir = path.join(__dirname, '../src/database/migrations');
    const masterMigrations = getMigrationList(masterMigrationsDir);
    const masterConfig = getMasterDbConfig();
    await migrateSingleDb(
      masterConfig,
      masterMigrations,
      () => import('../src/database/seeders/01-seed-master.js')
    );
    return;
  }

  // kind === 'tenant'
  const tenantMigrationsDir = path.join(__dirname, '../src/tenant-configuration/migrations');
  const tenantMigrations = getMigrationList(tenantMigrationsDir);

  if (dbNameArg && dbNameArg !== 'all' && dbNameArg !== 'current') {
    const tenantConfig = getTenantDbConfig(dbNameArg);
    await migrateSingleDb(
      tenantConfig,
      tenantMigrations,
      () => import('../src/tenant-configuration/seeders/tenantSeeders.js')
    );
    return;
  }

  // If no dbNameArg or 'all'/'current', query all active tenant companies from masterDb
  console.log(`[migrate] Finding active tenant databases from master DB...`);
  const masterConfig = getMasterDbConfig();
  let tenantDbs = [];

  try {
    const masterConn = await mysql.createConnection(masterConfig);
    const [companies] = await masterConn.query(
      `SELECT id, company_code, name, db_name FROM companies WHERE is_active = 1`
    );
    await masterConn.end();

    if (companies && companies.length > 0) {
      tenantDbs = companies.map(c => c.db_name || `finance_db_${c.company_code.toLowerCase()}`);
    }
  } catch (err) {
    console.warn(`[migrate] Could not query master database companies: ${err.message}. Falling back to default tenant.`);
  }

  if (tenantDbs.length === 0) {
    tenantDbs = ['finance_db_ktg', 'finance_db_alpha'];
  }

  console.log(`[migrate] Found ${tenantDbs.length} tenant DB(s) to migrate: ${tenantDbs.join(', ')}`);

  for (const dbName of tenantDbs) {
    const tenantConfig = getTenantDbConfig(dbName);
    await migrateSingleDb(
      tenantConfig,
      tenantMigrations,
      () => import('../src/tenant-configuration/seeders/tenantSeeders.js')
    );
  }
}

run().catch(err => {
  console.error('[migrate] FAILED:', err.message);
  process.exit(1);
});
