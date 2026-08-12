// Column set matches client/src/finance/borrowers/CustomerFormPage.jsx's EMPTY_FORM
// field-for-field (see the schema audit that drove the borrowers table redesign).
const COLUMNS = [
  'full_name', 'father_spouse_name', 'phone', 'alt_phone', 'email', 'dob', 'gender',
  'marital_status', 'address_line1', 'address_line2', 'city', 'state', 'pincode',
  'id_proof_type', 'aadhaar_number', 'pan_number', 'voter_id', 'occupation',
  'monthly_income', 'employer_name', 'bank_name', 'account_number', 'ifsc_code',
  'guarantor_name', 'guarantor_phone', 'nominee_name', 'nominee_relation', 'branch',
  'status', 'notes', 'profile_image', 'documents'
];

function toRowValues(data) {
  return COLUMNS.map(col => {
    if (col === 'documents') return JSON.stringify(data.documents || []);
    if (col === 'status') return data.status || 'ACTIVE';
    return data[col] ?? null;
  });
}

function parseRow(row) {
  if (!row) return row;
  if (row.documents == null || Array.isArray(row.documents)) return row;
  try {
    return { ...row, documents: JSON.parse(row.documents) };
  } catch {
    return { ...row, documents: [] };
  }
}

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
    return rows.map(parseRow);
  }

  static async findById(db, id) {
    const [rows] = await db.query(`SELECT * FROM borrowers WHERE id = ?`, [id]);
    if (!rows.length) return null;

    const borrower = parseRow(rows[0]);
    const [loans] = await db.query(`SELECT * FROM loans WHERE borrower_id = ?`, [id]);
    borrower.loans = loans;
    return borrower;
  }

  static async findByPhone(db, phone, excludeId = null) {
    let sql = `SELECT id FROM borrowers WHERE phone = ?`;
    const params = [phone];
    if (excludeId) {
      sql += ` AND id != ?`;
      params.push(excludeId);
    }
    const [rows] = await db.query(sql, params);
    return rows[0] || null;
  }

  static async nextBorrowerCode(db) {
    const [rows] = await db.query(
      "SELECT borrower_code FROM borrowers WHERE borrower_code LIKE 'BR-%' ORDER BY id DESC LIMIT 1"
    );
    const last = rows[0]?.borrower_code;
    const lastSeq = last ? parseInt(last.split('-')[1], 10) || 1000 : 1000;
    return `BR-${lastSeq + 1}`;
  }

  static async create(db, data) {
    const insertColumns = ['borrower_code', ...COLUMNS];

    // borrower_code is derived from MAX(id), which is racy under concurrent
    // double-submits — retry once on the unique-constraint collision (same
    // pattern as investor.service.js's nextInvestorCode) rather than take a
    // table lock for what's a rare, self-resolving conflict.
    for (let attempt = 0; attempt < 2; attempt++) {
      const code = await this.nextBorrowerCode(db);
      try {
        const [res] = await db.query(
          `INSERT INTO borrowers (${insertColumns.join(', ')}) VALUES (${insertColumns.map(() => '?').join(', ')})`,
          [code, ...toRowValues(data)]
        );
        return this.findById(db, res.insertId);
      } catch (err) {
        // `phone` is unique too now (closes the race where two near-simultaneous
        // submits both pass createBorrower's check-then-insert phone check) —
        // that collision isn't self-resolving like a borrower_code clash is, so
        // retrying would just fail identically. Surface the same friendly
        // message createBorrower's normal (non-race) duplicate check already
        // gives, instead of a raw MySQL "Duplicate entry" error.
        if (err.code === 'ER_DUP_ENTRY' && /phone/.test(err.sqlMessage || '')) {
          const dupErr = new Error('A customer with this phone number already exists.');
          dupErr.statusCode = 409;
          throw dupErr;
        }
        if (err.code === 'ER_DUP_ENTRY' && attempt === 0) continue;
        throw err;
      }
    }
  }

  static async update(db, id, data) {
    const sets = COLUMNS.map(col => `${col} = ?`);
    const values = toRowValues(data);
    try {
      await db.query(
        `UPDATE borrowers SET ${sets.join(', ')} WHERE id = ?`,
        [...values, id]
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' && /phone/.test(err.sqlMessage || '')) {
        const dupErr = new Error('Another customer already uses this phone number.');
        dupErr.statusCode = 409;
        throw dupErr;
      }
      throw err;
    }
    return this.findById(db, id);
  }

  static async delete(db, id) {
    const [res] = await db.query(`DELETE FROM borrowers WHERE id = ?`, [id]);
    return res.affectedRows > 0;
  }

  static async countLinkedLoans(db, id) {
    const [borrowerRows] = await db.query(`SELECT phone FROM borrowers WHERE id = ?`, [id]);
    if (!borrowerRows.length) return 0;
    // Loans link to a borrower by borrower_id when created through the
    // Customer Directory, but the quick-disburse flow can also create a loan
    // for a phone number with no borrower_id set at all — count both so a
    // borrower with either kind of linked loan can't be silently deleted.
    const [rows] = await db.query(
      `SELECT COUNT(*) as cnt FROM loans WHERE borrower_id = ? OR phone = ?`,
      [id, borrowerRows[0].phone]
    );
    return rows[0]?.cnt || 0;
  }
}
