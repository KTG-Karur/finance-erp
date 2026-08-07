export class BorrowerRepository {
  static async findAll(db, search = '') {
    let sql = `SELECT * FROM borrowers WHERE 1=1`;
    const params = [];

    if (search) {
      sql += ` AND (full_name LIKE ? OR borrower_code LIKE ? OR phone LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY created_at DESC`;
    const [rows] = await db.query(sql, params);
    return rows;
  }

  static async findById(db, id) {
    const [rows] = await db.query(`SELECT * FROM borrowers WHERE id = ?`, [id]);
    if (!rows.length) return null;

    const borrower = rows[0];
    const [loans] = await db.query(`SELECT * FROM loans WHERE borrower_id = ?`, [id]);
    borrower.loans = loans;
    return borrower;
  }

  static async create(db, data) {
    const code = `BR-${Date.now().toString().slice(-4)}`;
    const [res] = await db.query(
      `INSERT INTO borrowers (borrower_code, full_name, phone, email, aadhaar, pan, address, guarantor_name, kyc_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, data.full_name, data.phone, data.email || null, data.aadhaar || null, data.pan || null, data.address || null, data.guarantor_name || null, data.kyc_status || 'PENDING']
    );
    return { id: res.insertId, borrower_code: code, ...data };
  }
}
