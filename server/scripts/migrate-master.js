import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import mysql from 'mysql2/promise';
import { getMasterDbConfig } from '../src/config/db.js';
import { DataTypes, Sequelize, createQueryInterface } from '../src/database/sequelizeShim.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getMigrationList(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath)
    .filter(f => /^\d+.*\.js$/.test(f))
    .sort()
    .map(filename => ({
      name: filename,
      load: () => import(pathToFileURL(path.join(dirPath, filename)).href)
    }));
}

async function run() {
  const config = getMasterDbConfig();
  const dbName = config.database;
  console.log(`[migrate:master] target db: ${dbName} (env: ${process.env.NODE_ENV || 'development'})`);

  const serverConn = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password
  });
  await serverConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  await serverConn.end();
  console.log(`[migrate:master] database '${dbName}' ready.`);

  const conn = await mysql.createConnection(config);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`SequelizeMeta\` (
      \`name\` VARCHAR(255) NOT NULL,
      PRIMARY KEY (\`name\`),
      UNIQUE KEY \`name\` (\`name\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const migrations = getMigrationList(path.join(__dirname, '../src/database/migrations'));
  const [migratedRows] = await conn.query('SELECT `name` FROM `SequelizeMeta`');
  const appliedSet = new Set(migratedRows.map(r => r.name));

  const queryInterface = createQueryInterface(conn);
  const sequelizeArg = { ...Sequelize, DataTypes };

  let appliedCount = 0;
  for (const m of migrations) {
    if (appliedSet.has(m.name)) {
      console.log(`[migrate:master] skip (already applied): ${m.name}`);
      continue;
    }
    console.log(`[migrate:master] applying: ${m.name}`);
    const mod = await m.load();
    await mod.up(queryInterface, sequelizeArg);
    await conn.query('INSERT INTO `SequelizeMeta` (`name`) VALUES (?)', [m.name]);
    appliedSet.add(m.name);
    appliedCount++;
  }

  if (appliedCount > 0 && appliedSet.size === migrations.length && migratedRows.length === 0) {
    try {
      const seeder = await import('../src/database/seeders/01-seed-master.js');
      if (seeder?.seedDefaults) {
        await seeder.seedDefaults(queryInterface);
      } else if (seeder?.up) {
        await seeder.up(queryInterface, sequelizeArg);
      }
      console.log(`[migrate:master] initial seed data inserted for '${dbName}'.`);
    } catch (sErr) {
      console.warn(`[migrate:master] seeder note:`, sErr.message);
    }
  }

  await conn.end();
  console.log(`[migrate:master] done: '${dbName}' (${appliedCount} new migration(s) applied).`);
}

run().catch(err => {
  console.error('[migrate:master] FAILED:', err.message);
  process.exit(1);
});