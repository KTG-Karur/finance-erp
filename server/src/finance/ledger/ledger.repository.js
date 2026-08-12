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
