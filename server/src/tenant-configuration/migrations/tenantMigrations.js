import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { DataTypes, Sequelize } from '../../database/sequelizeShim.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Dynamically discovers all migration files in this directory.
 * Matches all files starting with digits (e.g. 20260807000001-create-tenant-tables.js)
 * and sorts them numerically in chronological order.
 */
export function getTenantMigrationFiles() {
  const files = fs.readdirSync(__dirname)
    .filter(f => /^\d+.*\.js$/.test(f))
    .sort();

  return files.map(filename => ({
    name: filename,
    path: path.join(__dirname, filename),
    load: () => import(pathToFileURL(path.join(__dirname, filename)).href)
  }));
}

/**
 * Sequential runner for all discovered tenant migrations.
 * When new migration files are added to this folder, they will be executed automatically in order.
 */
export async function up(queryInterface, seq = { ...Sequelize, DataTypes }) {
  const migrations = getTenantMigrationFiles();
  for (const m of migrations) {
    const mod = await m.load();
    if (typeof mod.up === 'function') {
      await mod.up(queryInterface, seq);
    }
  }
}

/**
 * Sequential rollback in reverse order for all discovered migrations.
 */
export async function down(queryInterface, seq = { ...Sequelize, DataTypes }) {
  const migrations = getTenantMigrationFiles().reverse();
  for (const m of migrations) {
    const mod = await m.load();
    if (typeof mod.down === 'function') {
      await mod.down(queryInterface, seq);
    }
  }
}

/**
 * Applies all pending migrations to a tenant database connection using SequelizeMeta tracking.
 */
export async function runPendingTenantMigrations(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`SequelizeMeta\` (
      \`name\` VARCHAR(255) NOT NULL,
      PRIMARY KEY (\`name\`),
      UNIQUE KEY \`name\` (\`name\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const [rows] = await conn.query('SELECT `name` FROM `SequelizeMeta`');
  const appliedSet = new Set(rows.map(r => r.name));

  const { createQueryInterface } = await import('../../database/sequelizeShim.js');
  const queryInterface = createQueryInterface(conn);
  const sequelizeArg = { ...Sequelize, DataTypes };

  const migrations = getTenantMigrationFiles();
  let appliedCount = 0;

  for (const m of migrations) {
    if (!appliedSet.has(m.name)) {
      const mod = await m.load();
      if (typeof mod.up === 'function') {
        await mod.up(queryInterface, sequelizeArg);
      }
      await conn.query('INSERT IGNORE INTO `SequelizeMeta` (`name`) VALUES (?)', [m.name]);
      appliedSet.add(m.name);
      appliedCount++;
    }
  }

  return { appliedCount, totalMigrations: migrations.length };
}
