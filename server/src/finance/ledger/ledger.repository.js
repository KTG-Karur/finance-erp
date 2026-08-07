export class LedgerRepository {
  static async findAccounts(db) {
    const [rows] = await db.query(`SELECT * FROM chart_of_accounts WHERE is_active = 1 ORDER BY account_code ASC`);
    return rows;
  }

  static async findEntries(db, filters = {}) {
    let sql = `SELECT * FROM journal_entries WHERE 1=1`;
    const params = [];

    if (filters.voucher_type) {
      sql += ` AND voucher_type = ?`;
      params.push(filters.voucher_type);
    }
    sql += ` ORDER BY entry_date DESC, id DESC`;

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
