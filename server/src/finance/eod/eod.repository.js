/**
 * EOD Persistence Repository
 * Location: server/src/finance/eod/eod.repository.js
 */

export class EodRepository {
  static async findEodRecords(db, { branch, date } = {}) {
    let query = 'SELECT * FROM eod_records WHERE 1=1';
    const params = [];
    if (branch) {
      query += ' AND branch = ?';
      params.push(branch);
    }
    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }
    query += ' ORDER BY date DESC, id DESC';
    const [rows] = await db.query(query, params);
    return rows.map(r => ({
      ...r,
      denominations: typeof r.denominations === 'string' ? JSON.parse(r.denominations) : (r.denominations || {}),
      reopen_history: typeof r.reopen_history === 'string' ? JSON.parse(r.reopen_history) : (r.reopen_history || [])
    }));
  }

  static async findEodRecordByBranchAndDate(db, branch, date) {
    const [rows] = await db.query(
      'SELECT * FROM eod_records WHERE branch = ? AND date = ? LIMIT 1',
      [branch, date]
    );
    if (!rows.length) return null;
    const r = rows[0];
    return {
      ...r,
      denominations: typeof r.denominations === 'string' ? JSON.parse(r.denominations) : (r.denominations || {}),
      reopen_history: typeof r.reopen_history === 'string' ? JSON.parse(r.reopen_history) : (r.reopen_history || [])
    };
  }

  static async saveEodRecord(db, recordData) {
    const {
      branch,
      date,
      status = 'CLOSED',
      has_variance = 0,
      edited = 0,
      closed_by,
      closed_at = new Date(),
      denominations = {},
      counted_cash = 0,
      expected_cash = 0,
      difference = 0,
      remarks,
      reopen_history = []
    } = recordData;

    const existing = await this.findEodRecordByBranchAndDate(db, branch, date);
    if (existing) {
      await db.query(
        `UPDATE eod_records SET
          status = ?, has_variance = ?, edited = ?, closed_by = ?, closed_at = ?,
          denominations = ?, counted_cash = ?, expected_cash = ?, difference = ?,
          remarks = ?, reopen_history = ?
         WHERE id = ?`,
        [
          status,
          has_variance ? 1 : 0,
          edited ? 1 : 0,
          closed_by || null,
          closed_at,
          JSON.stringify(denominations),
          counted_cash,
          expected_cash,
          difference,
          remarks || null,
          JSON.stringify(reopen_history),
          existing.id
        ]
      );
      return this.findEodRecordByBranchAndDate(db, branch, date);
    }

    const [result] = await db.query(
      `INSERT INTO eod_records
        (branch, date, status, has_variance, edited, closed_by, closed_at, denominations, counted_cash, expected_cash, difference, remarks, reopen_history)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        branch,
        date,
        status,
        has_variance ? 1 : 0,
        edited ? 1 : 0,
        closed_by || null,
        closed_at,
        JSON.stringify(denominations),
        counted_cash,
        expected_cash,
        difference,
        remarks || null,
        JSON.stringify(reopen_history)
      ]
    );

    const [rows] = await db.query('SELECT * FROM eod_records WHERE id = ?', [result.insertId]);
    return {
      ...rows[0],
      denominations: typeof rows[0].denominations === 'string' ? JSON.parse(rows[0].denominations) : (rows[0].denominations || {}),
      reopen_history: typeof rows[0].reopen_history === 'string' ? JSON.parse(rows[0].reopen_history) : (rows[0].reopen_history || [])
    };
  }

  static async resolveVariance(db, { id, resolution_note, reviewed_by }) {
    await db.query(
      `UPDATE eod_records SET
        status = 'CLOSED', has_variance = 0, resolution_note = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [resolution_note || 'Resolved by Manager', reviewed_by || 'Admin', id]
    );
    const [rows] = await db.query('SELECT * FROM eod_records WHERE id = ?', [id]);
    return rows[0];
  }

  static async addReopenHistory(db, { id, reopenRecord }) {
    const [rows] = await db.query('SELECT * FROM eod_records WHERE id = ?', [id]);
    if (!rows.length) return null;
    const history = typeof rows[0].reopen_history === 'string' ? JSON.parse(rows[0].reopen_history) : (rows[0].reopen_history || []);
    history.push(reopenRecord);

    await db.query(
      `UPDATE eod_records SET reopen_history = ? WHERE id = ?`,
      [JSON.stringify(history), id]
    );
    return this.findEodRecords(db, { branch: rows[0].branch, date: rows[0].date });
  }

  static async findDenominationSettings(db) {
    const [rows] = await db.query('SELECT * FROM eod_denomination_settings ORDER BY value DESC');
    return rows;
  }
}
