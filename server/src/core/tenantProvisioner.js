import mysql from 'mysql2/promise';
import { getMasterDbConfig, getTenantDbConfig } from '../config/db.js';
import * as tenantMigration from '../tenant-configuration/migrations/20260807000001-create-tenant-tables.js';
import * as tenantSeeder from '../tenant-configuration/seeders/tenantSeeders.js';

const TENANT_MIGRATION_NAME = '20260807000001-create-tenant-tables.js';

/**
 * Automates isolated Tenant Database creation, Sequelize table migrations, SequelizeMeta tracking,
 * and initial seeders whenever Super Admin provisions a new company.
 */
export async function provisionNewTenantCompany(masterDb, { company_code, name, admin_email, admin_password }) {
  const code = String(company_code).trim().toUpperCase();
  const dbName = `finance_db_${code.toLowerCase()}`;

  // 1. Create company record in finance_master_db
  const [res] = await masterDb.query(
    `INSERT INTO companies (name, company_code, db_name, is_active) VALUES (?, ?, ?, 1)`,
    [name, code, dbName]
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

    const mockQueryInterface = {
      async createTable(tableName, columns) {
        let ddl = `CREATE TABLE IF NOT EXISTS \`${tableName}\` (`;
        const colDefs = [];
        for (const [colName, spec] of Object.entries(columns)) {
          let typeStr = 'VARCHAR(255)';
          if (spec.type?.key === 'INTEGER') typeStr = 'INT';
          if (spec.type?.key === 'DECIMAL') typeStr = 'DECIMAL(15,2)';
          if (spec.type?.key === 'TEXT') typeStr = 'TEXT';
          if (spec.type?.key === 'BOOLEAN') typeStr = 'TINYINT(1)';
          if (spec.type?.key === 'DATEONLY') typeStr = 'DATE';
          if (spec.type?.key === 'DATE') typeStr = 'DATETIME';
          if (spec.type?.key === 'ENUM') typeStr = `ENUM(${spec.type.values.map(v => `'${v}'`).join(',')})`;

          let col = `\`${colName}\` ${typeStr}`;
          if (spec.primaryKey) col += ' PRIMARY KEY AUTO_INCREMENT';
          if (spec.allowNull === false && !spec.primaryKey) col += ' NOT NULL';
          if (spec.unique) col += ' UNIQUE';
          colDefs.push(col);
        }
        ddl += colDefs.join(', ') + ') ENGINE=InnoDB;';
        await tenantConn.query(ddl);
      },
      async bulkInsert(tableName, records) {
        if (!records || !records.length) return;
        const keys = Object.keys(records[0]);
        const sql = `INSERT INTO \`${tableName}\` (${keys.map(k => `\`${k}\``).join(',')}) VALUES ?`;
        const values = records.map(r => keys.map(k => r[k]));
        await tenantConn.query(sql, [values]);
      }
    };

    const mockSequelize = {
      literal(str) { return str; }
    };

    // Execute tenant migrations & seeders
    await tenantMigration.up(mockQueryInterface, mockSequelize);
    await tenantSeeder.up(mockQueryInterface, mockSequelize);

    // Record migration in SequelizeMeta
    await tenantConn.query(
      `INSERT IGNORE INTO \`SequelizeMeta\` (\`name\`) VALUES (?)`,
      [TENANT_MIGRATION_NAME]
    );

    // Create default company admin user in tenant users table
    if (admin_email && admin_password) {
      await tenantConn.query(
        `INSERT INTO users (company_id, name, email, password, role, status) VALUES (?, ?, ?, ?, 'COMPANY_ADMIN', 'ACTIVE')`,
        [companyId, `${name} Admin`, admin_email, admin_password]
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
