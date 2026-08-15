export class LedgerRepository {
  static async findAccounts(db) {
    const [rows] = await db.query(`SELECT * FROM chart_of_accounts ORDER BY account_code ASC`);
    return rows;
  }

  static async findActiveAccounts(db) {
    const [rows] = await db.query(`SELECT * FROM chart_of_accounts WHERE is_active = 1 ORDER BY account_code ASC`);
    return rows;
  }

  static async createAccount(db, { account_code, account_name, account_type, type, category, name_key }) {
    const rawType = (account_type || type || '').toUpperCase();
    const VALID_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
    if (!VALID_TYPES.includes(rawType)) {
      const err = new Error(`Invalid account_type '${rawType}'. Must be one of: ${VALID_TYPES.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }
    const cat = String(category || rawType).trim();
    if (!account_code || !account_name) {
      const err = new Error('account_code and account_name are required.');
      err.statusCode = 400;
      throw err;
    }
    const [existing] = await db.query('SELECT account_code FROM chart_of_accounts WHERE account_code = ?', [account_code]);
    if (existing.length) {
      const err = new Error(`Account code '${account_code}' already exists.`);
      err.statusCode = 409;
      throw err;
    }
    await db.query(
      `INSERT INTO chart_of_accounts (account_code, account_name, account_type, category, name_key, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
      [account_code, account_name, rawType, cat, name_key || null]
    );
    const [rows] = await db.query(`SELECT * FROM chart_of_accounts WHERE account_code = ?`, [account_code]);
    return rows[0];
  }

  static async updateAccount(db, account_code, { account_name, account_type, type, category, is_active }) {
    const fields = [];
    const params = [];
    if (account_name !== undefined) { fields.push('account_name = ?'); params.push(account_name); }
    const rawType = account_type || type;
    if (rawType !== undefined) {
      const uType = String(rawType).toUpperCase();
      const VALID_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
      if (!VALID_TYPES.includes(uType)) {
        const err = new Error(`Invalid account_type '${uType}'. Must be one of: ${VALID_TYPES.join(', ')}`);
        err.statusCode = 400;
        throw err;
      }
      fields.push('account_type = ?');
      params.push(uType);
    }
    if (category !== undefined) { fields.push('category = ?'); params.push(category); }
    if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active ? 1 : 0); }
    if (fields.length > 0) {
      params.push(account_code);
      await db.query(`UPDATE chart_of_accounts SET ${fields.join(', ')} WHERE account_code = ?`, params);
    }
    const [rows] = await db.query(`SELECT * FROM chart_of_accounts WHERE account_code = ?`, [account_code]);
    return rows[0];
  }

  static async deleteAccount(db, account_code) {
    const [entries] = await db.query(`SELECT COUNT(*) as cnt FROM journal_lines WHERE account_code = ?`, [account_code]);
    if (entries[0].cnt > 0) {
      const err = new Error('Cannot delete this account head because transactions exist against it. You can hide it instead.');
      err.statusCode = 400;
      throw err;
    }
    await db.query(`DELETE FROM chart_of_accounts WHERE account_code = ?`, [account_code]);
    return true;
  }

  static async findEntries(db, filters = {}) {
    let sql = `SELECT * FROM journal_entries WHERE 1=1`;
    const params = [];

    if (filters.voucher_type) {
      sql += ` AND voucher_type = ?`;
      params.push(filters.voucher_type);
    }
    if (filters.ref_type) {
      sql += ` AND ref_type = ?`;
      params.push(filters.ref_type);
    }
    if (filters.branch) {
      sql += ` AND branch = ?`;
      params.push(filters.branch);
    }
    if (filters.date_from) {
      sql += ` AND entry_date >= ?`;
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      sql += ` AND entry_date <= ?`;
      params.push(filters.date_to);
    }
    sql += ` ORDER BY entry_date DESC, id DESC`;

    // Bounded by default — an unfiltered fetch on a mature ledger would otherwise
    // pull every voucher this tenant has ever posted in one query.
    const limit = Math.min(Number(filters.limit) || 1000, 5000);
    sql += ` LIMIT ?`;
    params.push(limit);

    const [entries] = await db.query(sql, params);
    if (!entries.length) return [];

    const entryIds = entries.map(e => e.id);
    const [lines] = await db.query(
      `SELECT * FROM journal_lines WHERE journal_entry_id IN (?) ORDER BY id ASC`,
      [entryIds]
    );

    const lineMap = new Map();
    for (const line of lines) {
      if (!lineMap.has(line.journal_entry_id)) {
        lineMap.set(line.journal_entry_id, []);
      }
      lineMap.get(line.journal_entry_id).push(line);
    }

    return entries.map(e => ({
      ...e,
      lines: lineMap.get(e.id) || []
    }));
  }
}
