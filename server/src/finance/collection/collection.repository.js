export class CollectionRepository {
  static async findAll(db, filters = {}) {
    let sql = `SELECT c.*, l.loan_account_no FROM collections c LEFT JOIN loans l ON c.loan_id = l.id WHERE 1=1`;
    const params = [];

    if (filters.loan_id) {
      sql += ` AND c.loan_id = ?`;
      params.push(filters.loan_id);
    }
    if (filters.collector) {
      sql += ` AND c.collector_name = ?`;
      params.push(filters.collector);
    }
    sql += ` ORDER BY c.collection_date DESC, c.id DESC`;

    const [rows] = await db.query(sql, params);
    return rows;
  }
}
