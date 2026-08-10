/**
 * One-off, no-dependency migration runner for this project's Sequelize-shaped
 * migration/seeder files (there is no `sequelize`/`sequelize-cli` package installed —
 * see server/src/database/sequelizeShim.js for why and how these files still run).
 *
 * Usage:
 *   node scripts/migrate.js master
 *   node scripts/migrate.js tenant <db_name>
 *
 * Idempotent: re-running an already-migrated database is a no-op (tracked via a
 * SequelizeMeta table, the same mechanism server/src/core/tenantProvisioner.js uses
 * when auto-provisioning a new tenant at runtime).
 */
import mysql from 'mysql2/promise';
import { getMasterDbConfig, getTenantDbConfig } from '../src/config/db.js';
import { DataTypes, Sequelize, createQueryInterface } from '../src/database/sequelizeShim.js';

const TARGETS = {
  master: {
    migrationName: '01-create-master-tables.js',
    loadMigration: () => import('../src/database/migrations/01-create-master-tables.js'),
    loadSeeder: () => import('../src/database/seeders/01-seed-master.js'),
    getConfig: () => getMasterDbConfig()
  },
  tenant: {
    migrationName: '20260807000001-create-tenant-tables.js',
    loadMigration: () => import('../src/tenant-configuration/migrations/20260807000001-create-tenant-tables.js'),
    loadSeeder: () => import('../src/tenant-configuration/seeders/tenantSeeders.js'),
    getConfig: (dbName) => getTenantDbConfig(dbName)
  }
};

async function run() {
  const [, , kind, dbNameArg] = process.argv;
  const target = TARGETS[kind];

  if (!target) {
    console.error('Usage: node scripts/migrate.js <master|tenant> [db_name]');
    process.exit(1);
  }
  if (kind === 'tenant' && !dbNameArg) {
    console.error('Usage: node scripts/migrate.js tenant <db_name>');
    process.exit(1);
  }

  const config = target.getConfig(dbNameArg);
  const dbName = config.database;

  const serverConn = await mysql.createConnection({ host: config.host, port: config.port, user: config.user, password: config.password });
  await serverConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  await serverConn.end();
  console.log(`[migrate] Database '${dbName}' ready.`);

  const conn = await mysql.createConnection(config);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`SequelizeMeta\` (
      \`name\` VARCHAR(255) NOT NULL,
      PRIMARY KEY (\`name\`),
      UNIQUE KEY \`name\` (\`name\`)
    ) ENGINE=InnoDB;
  `);

  const [already] = await conn.query('SELECT 1 FROM `SequelizeMeta` WHERE name = ?', [target.migrationName]);
  if (already.length) {
    console.log(`[migrate] '${dbName}' already migrated (${target.migrationName}) — skipping.`);
    await conn.end();
    return;
  }

  const queryInterface = createQueryInterface(conn);
  const sequelizeArg = { ...Sequelize, DataTypes };

  const migration = await target.loadMigration();
  await migration.up(queryInterface, sequelizeArg);
  console.log(`[migrate] Schema created for '${dbName}'.`);

  const seeder = await target.loadSeeder();
  await seeder.up(queryInterface, sequelizeArg);
  console.log(`[migrate] Seed data inserted for '${dbName}'.`);

  await conn.query('INSERT INTO `SequelizeMeta` (`name`) VALUES (?)', [target.migrationName]);
  await conn.end();
  console.log(`[migrate] Done: '${dbName}'.`);
}

run().catch(err => {
  console.error('[migrate] FAILED:', err.message);
  process.exit(1);
});
