import mysql from 'mysql2/promise';

/**
 * Bank Account Management Service
 * Handles company bank accounts, balances, and auto-linking with Chart of Accounts.
 */
export class BankService {
  /**
   * Ensure bank_accounts table exists in the tenant database
   */
  static async ensureTable(db) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bank_name VARCHAR(150) NOT NULL,
        account_name VARCHAR(150) NOT NULL,
        account_number VARCHAR(100) NOT NULL,
        ifsc_code VARCHAR(50) NOT NULL,
        branch_name VARCHAR(150) NULL,
        ledger_account_code VARCHAR(50) NULL,
        account_type VARCHAR(50) DEFAULT 'CURRENT',
        opening_balance DECIMAL(15, 2) DEFAULT 0.00,
        current_balance DECIMAL(15, 2) DEFAULT 0.00,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  static async getAll(db, filters = {}) {
    await this.ensureTable(db);
    let sql = `
      SELECT b.*,
             COALESCE(
               b.balance + COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0),
               b.balance
             ) as current_balance,
             COALESCE(SUM(jl.debit), 0) as total_debit,
             COALESCE(SUM(jl.credit), 0) as total_credit
      FROM bank_accounts b
      LEFT JOIN journal_lines jl ON jl.account_code = b.ledger_account_code
      WHERE b.deleted_at IS NULL
    `;
    const params = [];

    if (filters.is_active !== undefined) {
      sql += ' AND b.is_active = ?';
      params.push(filters.is_active ? 1 : 0);
    }
    if (filters.branch) {
      sql += ' AND (b.branch = ? OR b.branch_name = ?)';
      params.push(filters.branch, filters.branch);
    }

    sql += ' GROUP BY b.id ORDER BY b.id ASC';
    const [rows] = await db.query(sql, params);
    return rows;
  }

  static async getById(db, id) {
    await this.ensureTable(db);
    const [rows] = await db.query('SELECT * FROM bank_accounts WHERE id = ? AND deleted_at IS NULL', [id]);
    return rows[0] || null;
  }

  static async create(db, data, createdBy) {
    await this.ensureTable(db);
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const bankName = String(data.bank_name || '').trim();
      const accountName = String(data.account_name || '').trim();
      const accountNumber = String(data.account_number || '').trim();
      const ifscCode = String(data.ifsc_code || '').trim().toUpperCase();
      const branchName = String(data.branch_name || data.branch || '').trim();
      const accountType = data.account_type || 'CURRENT';
      const openingBalance = parseFloat(data.opening_balance) || 0.0;

      let ledgerCode = data.ledger_account_code;

      // Auto-create / assign Chart of Accounts ledger code if not provided
      if (!ledgerCode) {
        // Find next available 100x code or default to 1002
        const [accRows] = await conn.query(
          "SELECT account_code FROM chart_of_accounts WHERE account_code LIKE '100%' AND account_code != '1001' ORDER BY account_code DESC LIMIT 1"
        );
        if (accRows.length > 0 && !isNaN(Number(accRows[0].account_code))) {
          ledgerCode = String(Number(accRows[0].account_code) + 1);
        } else {
          ledgerCode = '1002';
        }

        // Register new account in chart_of_accounts
        const [existing] = await conn.query("SELECT id FROM chart_of_accounts WHERE account_code = ?", [ledgerCode]);
        if (!existing.length) {
          await conn.query(
            "INSERT INTO chart_of_accounts (account_code, account_name, account_type, category, balance, is_active) VALUES (?, ?, 'ASSET', 'BANK_ACCOUNTS', ?, 1)",
            [ledgerCode, `${bankName} (${accountNumber.slice(-4) ? '...' + accountNumber.slice(-4) : accountName})`, openingBalance]
          );
        }
      }

      const [res] = await conn.query(
        `INSERT INTO bank_accounts (
          bank_name, account_name, account_number, ifsc_code, branch,
          ledger_account_code, account_type, balance, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          bankName,
          accountName,
          accountNumber,
          ifscCode,
          branchName,
          ledgerCode,
          accountType,
          openingBalance
        ]
      );

      await conn.commit();
      const newId = res.insertId;
      return this.getById(db, newId);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  static async update(db, id, data) {
    await this.ensureTable(db);
    const fields = [];
    const params = [];

    if (data.bank_name !== undefined) { fields.push('bank_name = ?'); params.push(data.bank_name); }
    if (data.account_name !== undefined) { fields.push('account_name = ?'); params.push(data.account_name); }
    if (data.account_number !== undefined) { fields.push('account_number = ?'); params.push(data.account_number); }
    if (data.ifsc_code !== undefined) { fields.push('ifsc_code = ?'); params.push(data.ifsc_code.toUpperCase()); }
    if (data.branch !== undefined || data.branch_name !== undefined) { fields.push('branch = ?'); params.push(data.branch || data.branch_name); }
    if (data.ledger_account_code !== undefined) { fields.push('ledger_account_code = ?'); params.push(data.ledger_account_code); }
    if (data.account_type !== undefined) { fields.push('account_type = ?'); params.push(data.account_type); }
    if (data.balance !== undefined) { fields.push('balance = ?'); params.push(data.balance); }
    if (data.is_active !== undefined) { fields.push('is_active = ?'); params.push(data.is_active ? 1 : 0); }

    if (!fields.length) return this.getById(db, id);

    params.push(id);
    await db.query(`UPDATE bank_accounts SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.getById(db, id);
  }

  static async delete(db, id) {
    await this.ensureTable(db);
    await db.query('UPDATE bank_accounts SET is_active = 0, deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL', [id]);
    return true;
  }
}
