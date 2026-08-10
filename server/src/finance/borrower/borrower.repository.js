// Column set matches client/src/finance/borrowers/CustomerFormPage.jsx's EMPTY_FORM
// field-for-field (see the schema audit that drove the borrowers table redesign).
const COLUMNS = [
  'full_name', 'father_spouse_name', 'phone', 'alt_phone', 'email', 'dob', 'gender',
  'marital_status', 'address_line1', 'address_line2', 'city', 'state', 'pincode',
  'id_proof_type', 'aadhaar_number', 'pan_number', 'voter_id', 'occupation',
  'monthly_income', 'employer_name', 'bank_name', 'account_number', 'ifsc_code',
  'guarantor_name', 'guarantor_phone', 'nominee_name', 'nominee_relation', 'branch',
  'status', 'notes', 'profile_image', 'documents', 'kyc_status'
];

function toRowValues(data) {
  return COLUMNS.map(col => {
    if (col === 'documents') return JSON.stringify(data.documents || []);
    if (col === 'status') return data.status || 'ACTIVE';
    if (col === 'kyc_status') return data.kyc_status || 'PENDING';
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

  static async create(db, data) {
    const code = `BR-${Date.now().toString().slice(-4)}`;
    const insertColumns = ['borrower_code', ...COLUMNS];
    const [res] = await db.query(
      `INSERT INTO borrowers (${insertColumns.join(', ')}) VALUES (${insertColumns.map(() => '?').join(', ')})`,
      [code, ...toRowValues(data)]
    );
    return this.findById(db, res.insertId);
  }
}
