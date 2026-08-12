// This project's migration files (server/src/database/migrations,
// server/src/tenant-configuration/migrations) are written in Sequelize's
// queryInterface/DataTypes style, but the project has no `sequelize` dependency —
// migrations run against a plain mysql2 connection instead. This module is the one
// shim both the master and tenant migration runners share, so a migration file
// never has to know whether it's being interpreted or run by real Sequelize.

export const DataTypes = {
  STRING: (length = 255) => ({ key: 'STRING', length }),
  INTEGER: { key: 'INTEGER' },
  DECIMAL: (precision = 15, scale = 2) => ({ key: 'DECIMAL', precision, scale }),
  TEXT: { key: 'TEXT' },
  MEDIUMTEXT: { key: 'MEDIUMTEXT' },
  BOOLEAN: { key: 'BOOLEAN' },
  DATE: { key: 'DATE' },
  DATEONLY: { key: 'DATEONLY' },
  JSON: { key: 'JSON' },
  ENUM: (...values) => ({ key: 'ENUM', values })
};

export const Sequelize = {
  literal: (str) => ({ __literal: str })
};

function columnTypeSql(spec) {
  const type = spec.type;
  switch (type?.key) {
    case 'STRING': return `VARCHAR(${type.length})`;
    case 'INTEGER': return 'INT';
    case 'DECIMAL': return `DECIMAL(${type.precision},${type.scale})`;
    case 'TEXT': return 'TEXT';
    case 'MEDIUMTEXT': return 'MEDIUMTEXT';
    case 'BOOLEAN': return 'TINYINT(1)';
    case 'DATEONLY': return 'DATE';
    case 'DATE': return 'DATETIME';
    case 'JSON': return 'JSON';
    case 'ENUM': return `ENUM(${type.values.map(v => `'${v}'`).join(',')})`;
    default: return 'VARCHAR(255)';
  }
}

function columnDefinitionSql(conn, colName, spec) {
  let col = `\`${colName}\` ${columnTypeSql(spec)}`;
  if (spec.primaryKey) col += ' PRIMARY KEY AUTO_INCREMENT';
  if (spec.allowNull === false && !spec.primaryKey) col += ' NOT NULL';
  if (spec.unique) col += ' UNIQUE';

  if (spec.defaultValue !== undefined && !spec.primaryKey) {
    const dv = spec.defaultValue;
    if (dv && dv.__literal === 'CURRENT_TIMESTAMP') {
      col += ' DEFAULT CURRENT_TIMESTAMP';
      if (columnTypeSql(spec) === 'DATETIME' && colName === 'updated_at') {
        col += ' ON UPDATE CURRENT_TIMESTAMP';
      }
    } else if (typeof dv === 'number') {
      col += ` DEFAULT ${dv}`;
    } else if (typeof dv === 'boolean') {
      col += ` DEFAULT ${dv ? 1 : 0}`;
    } else if (dv !== null && dv !== undefined) {
      col += ` DEFAULT ${conn.escape(dv)}`;
    }
  }
  return col;
}

/**
 * Builds a Sequelize-shaped queryInterface backed by a real mysql2 connection, so a
 * migration/seeder file's `up(queryInterface, Sequelize)` runs unmodified whether the
 * target is the master DB or a tenant DB.
 */
export function createQueryInterface(conn) {
  return {
    async createTable(tableName, columns, options = {}) {
      const colDefs = Object.entries(columns).map(([name, spec]) => columnDefinitionSql(conn, name, spec));
      const engine = options.engine || 'InnoDB';
      await conn.query(`CREATE TABLE IF NOT EXISTS \`${tableName}\` (${colDefs.join(', ')}) ENGINE=${engine} DEFAULT CHARSET=utf8mb4;`);
    },

    async dropTable(tableName) {
      await conn.query(`DROP TABLE IF EXISTS \`${tableName}\`;`);
    },

    async bulkInsert(tableName, records) {
      if (!records || !records.length) return;
      const keys = Object.keys(records[0]);
      const sql = `INSERT INTO \`${tableName}\` (${keys.map(k => `\`${k}\``).join(',')}) VALUES ?`;
      const values = records.map(r => keys.map(k => (r[k] === undefined ? null : r[k])));
      await conn.query(sql, [values]);
    },

    async bulkDelete(tableName) {
      await conn.query(`DELETE FROM \`${tableName}\`;`);
    },

    async addIndex(tableName, fields, options = {}) {
      const cols = fields.map(f => `\`${f}\``).join(', ');
      const kind = options.unique ? 'UNIQUE INDEX' : 'INDEX';
      const name = options.name || `${tableName}_${fields.join('_')}${options.unique ? '_unique' : '_idx'}`;
      await conn.query(`ALTER TABLE \`${tableName}\` ADD ${kind} \`${name}\` (${cols})`);
    }
  };
}
