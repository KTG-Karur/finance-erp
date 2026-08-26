const COLUMNS = [
  'name', 'unit_base', 'rate_per_unit', 'formula_type', 'repayment_method',
  'interest_calculation', 'interest_basis', 'accrual_mode', 'interest_formula',
  'installment_formula', 'custom_formula_name', 'repayment_frequency',
  'min_amount', 'max_amount', 'min_tenure_months', 'max_tenure_months', 'is_active'
];

// interest_formula / installment_formula are token arrays — stored as JSON text,
// parsed back out on every read so callers always see real arrays, never a raw string.
function parseRow(row) {
  if (!row) return row;
  return {
    ...row,
    interest_formula: parseJsonField(row.interest_formula),
    installment_formula: parseJsonField(row.installment_formula)
  };
}

function parseJsonField(value) {
  if (value == null || Array.isArray(value)) return value || [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function toRowValues(payload) {
  return COLUMNS.map(col => {
    if (col === 'interest_formula' || col === 'installment_formula') {
      return JSON.stringify(payload[col] || []);
    }
    if (col === 'is_active') {
      return payload.is_active === undefined ? 1 : (payload.is_active ? 1 : 0);
    }
    return payload[col] ?? null;
  });
}

// mysql2 reports a unique-constraint violation as err.code === 'ER_DUP_ENTRY'; the
// in-memory mock DB (server/src/plugins/tenantDb.js) throws the same shape for a
// duplicate `name` on INSERT/UPDATE, so both paths land here identically. This is
// the actual race-safety guarantee — the pre-flight SELECT check in
// SchemeService is only a fast, friendly first pass and can never be relied on
// alone, since two concurrent requests can both pass it before either INSERTs.
function isDuplicateNameError(err) {
  return err?.code === 'ER_DUP_ENTRY';
}

function duplicateNameError(name) {
  const err = new Error(`A loan scheme named '${name}' already exists.`);
  err.statusCode = 409;
  return err;
}

export class SchemeRepository {
  static async findAll(db) {
    const [rows] = await db.query('SELECT * FROM loan_schemes WHERE deleted_at IS NULL ORDER BY id');
    return rows.map(parseRow);
  }

  static async findById(db, id) {
    const [rows] = await db.query('SELECT * FROM loan_schemes WHERE id = ? AND deleted_at IS NULL', [id]);
    return rows.length ? parseRow(rows[0]) : null;
  }

  static async findActiveNameConflict(db, name, excludeId = null) {
    const [rows] = await db.query('SELECT id FROM loan_schemes WHERE LOWER(name) = LOWER(?) AND deleted_at IS NULL', [name]);
    return rows.some(r => !excludeId || r.id != excludeId);
  }

  static async create(db, payload) {
    let result;
    try {
      [result] = await db.execute(
        `INSERT INTO loan_schemes (${COLUMNS.join(', ')}) VALUES (${COLUMNS.map(() => '?').join(', ')})`,
        toRowValues(payload)
      );
    } catch (err) {
      if (isDuplicateNameError(err)) throw duplicateNameError(payload.name);
      throw err;
    }
    return this.findById(db, result.insertId);
  }

  static async update(db, id, payload) {
    try {
      await db.execute(
        `UPDATE loan_schemes SET ${COLUMNS.map(c => `${c} = ?`).join(', ')} WHERE id = ?`,
        [...toRowValues(payload), id]
      );
    } catch (err) {
      if (isDuplicateNameError(err)) throw duplicateNameError(payload.name);
      throw err;
    }
    return this.findById(db, id);
  }

  static async remove(db, id) {
    const [result] = await db.execute('UPDATE loan_schemes SET deleted_at = CURRENT_TIMESTAMP, is_active = 0 WHERE id = ? AND deleted_at IS NULL', [id]);
    return result.affectedRows > 0;
  }

  static async countActiveLoansUsingScheme(db, id) {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS cnt FROM loans WHERE scheme_id = ? AND status IN ('PENDING', 'ACTIVE', 'OVERDUE')`,
      [id]
    );
    return rows[0]?.cnt || 0;
  }
}
