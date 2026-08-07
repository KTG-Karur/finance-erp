export class LoanRepository {
  static async findAll(db, filters = {}) {
    let sql = `SELECT * FROM loans WHERE 1=1`;
    const params = [];

    if (filters.status) {
      sql += ` AND status = ?`;
      params.push(filters.status);
    }
    if (filters.branch) {
      sql += ` AND branch = ?`;
      params.push(filters.branch);
    }
    sql += ` ORDER BY created_at DESC`;

    const [rows] = await db.query(sql, params);
    return rows;
  }

  static async findById(db, id) {
    const [rows] = await db.query(`SELECT * FROM loans WHERE id = ?`, [id]);
    if (!rows.length) return null;

    const loan = rows[0];
    const [schedules] = await db.query(
      `SELECT * FROM repayment_schedules WHERE loan_id = ? ORDER BY period ASC`,
      [id]
    );
    loan.repayment_schedule = schedules;
    return loan;
  }

  static async updateStatus(db, id, status) {
    const [res] = await db.query(`UPDATE loans SET status = ? WHERE id = ?`, [status, id]);
    return res.affectedRows > 0;
  }
}
