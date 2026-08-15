import { insertVoucherOnConnection } from '../ledger/ledger.service.js';

let schemaEnsured = false;
async function ensureExpenseColumns(db) {
  if (schemaEnsured) return;
  try {
    const [catCols] = await db.query(`SHOW COLUMNS FROM expense_categories LIKE 'branch'`);
    if (!catCols || catCols.length === 0) {
      await db.query(`ALTER TABLE expense_categories ADD COLUMN branch VARCHAR(255) DEFAULT NULL`);
    }
  } catch (e) {}
  try {
    const [vouchCols] = await db.query(`SHOW COLUMNS FROM expense_vouchers LIKE 'branch'`);
    if (!vouchCols || vouchCols.length === 0) {
      await db.query(`ALTER TABLE expense_vouchers ADD COLUMN branch VARCHAR(100) DEFAULT 'Main Branch'`);
    }
    await db.query(`UPDATE expense_vouchers SET branch = 'Main Branch' WHERE branch IS NULL OR branch = ''`);
  } catch (e) {}
  schemaEnsured = true;
}

export async function getExpenseCategories(db) {
  await ensureExpenseColumns(db);
  const [rows] = await db.query("SELECT id, name, branch, status, balance, allocated_total, created_at FROM expense_categories ORDER BY id");
  return rows;
}

export async function getExpenseAllocationRequests(db) {
  const [rows] = await db.query('SELECT * FROM expense_allocation_requests ORDER BY requested_at DESC');
  return rows;
}

export async function getExpenseVouchers(db) {
  await ensureExpenseColumns(db);
  try {
    const [rows] = await db.query(`
      SELECT ev.*,
             COALESCE(
               ev.branch,
               je.branch,
               ec.branch,
               'Main Branch'
             ) AS branch
      FROM expense_vouchers ev
      LEFT JOIN (
        SELECT ref_id, branch
        FROM journal_entries
        WHERE ref_type = 'EXPENSE'
        GROUP BY ref_id, branch
      ) je ON je.ref_id = ev.id
      LEFT JOIN expense_categories ec ON ec.id = ev.category_id
      ORDER BY ev.id DESC
    `);
    return rows;
  } catch (err) {
    const [rows] = await db.query('SELECT * FROM expense_vouchers ORDER BY id DESC');
    return rows;
  }
}

async function insertAllocationRequest(db, { categoryId, categoryName, type, amount, reason, requestedBy }) {
  const [result] = await db.execute(
    'INSERT INTO expense_allocation_requests (category_id, category_name, type, amount, reason, requested_by) VALUES (?, ?, ?, ?, ?, ?)',
    [categoryId, categoryName, type, amount, reason || null, requestedBy || null]
  );
  const [rows] = await db.query('SELECT * FROM expense_allocation_requests WHERE id = ?', [result.insertId]);
  return rows[0];
}

export async function createExpenseCategory(db, payload, requestedBy) {
  await ensureExpenseColumns(db);
  const name = String(payload.name || '').trim();
  let branch = null;
  if (Array.isArray(payload.branch)) {
    const filtered = payload.branch.filter(b => b && b !== 'ALL');
    branch = filtered.length > 0 ? filtered.join(', ') : null;
  } else if (payload.branch && String(payload.branch).trim() !== 'ALL') {
    branch = String(payload.branch).trim();
  }

  if (!name) {
    const err = new Error('Category name is required.');
    err.statusCode = 400;
    throw err;
  }
  const [existing] = await db.query(
    'SELECT id FROM expense_categories WHERE name = ?',
    [name]
  );
  if (existing.length) {
    const err = new Error(`An expense category named '${name}' already exists.`);
    err.statusCode = 409;
    throw err;
  }
  const amount = Number(payload.amount) || 0;
  const [result] = await db.execute(
    "INSERT INTO expense_categories (name, branch, status, balance, allocated_total) VALUES (?, ?, 'ACTIVE', ?, ?)",
    [name, branch, amount, amount]
  );
  await insertAllocationRequest(db, {
    categoryId: result.insertId, categoryName: name, type: 'INITIAL', amount, reason: payload.reason, requestedBy
  });
  const [rows] = await db.query('SELECT * FROM expense_categories WHERE id = ?', [result.insertId]);
  return rows[0];
}

export async function updateExpenseCategory(db, id, payload) {
  await ensureExpenseColumns(db);
  const [existing] = await db.query('SELECT id FROM expense_categories WHERE id = ?', [id]);
  if (!existing.length) {
    const err = new Error('Expense category not found.');
    err.statusCode = 404;
    throw err;
  }
  const name = String(payload.name || '').trim();
  if (!name) {
    const err = new Error('Category name is required.');
    err.statusCode = 400;
    throw err;
  }
  let branch = null;
  if (Array.isArray(payload.branch)) {
    const filtered = payload.branch.filter(b => b && b !== 'ALL');
    branch = filtered.length > 0 ? filtered.join(', ') : null;
  } else if (payload.branch !== undefined) {
    branch = (payload.branch && String(payload.branch).trim() !== 'ALL') ? String(payload.branch).trim() : null;
  }

  if (payload.branch !== undefined) {
    await db.execute('UPDATE expense_categories SET name = ?, branch = ? WHERE id = ?', [name, branch, id]);
  } else {
    await db.execute('UPDATE expense_categories SET name = ? WHERE id = ?', [name, id]);
  }
  const [rows] = await db.query('SELECT * FROM expense_categories WHERE id = ?', [id]);
  return rows[0];
}

export async function deleteExpenseCategory(db, id) {
  const [rows] = await db.query('SELECT * FROM expense_categories WHERE id = ?', [id]);
  if (!rows.length) {
    const err = new Error('Expense category not found.');
    err.statusCode = 404;
    throw err;
  }
  if (Number(rows[0].balance) > 0) {
    const err = new Error(`Cannot delete "${rows[0].name}" — it still has a ₹${Number(rows[0].balance).toLocaleString('en-IN')} balance. Spend it down first.`);
    err.statusCode = 409;
    throw err;
  }
  await db.execute('DELETE FROM expense_categories WHERE id = ?', [id]);
}

export async function addExpenseFunds(db, payload, requestedBy) {
  const categoryId = Number(payload.category_id);
  const [rows] = await db.query('SELECT * FROM expense_categories WHERE id = ?', [categoryId]);
  if (!rows.length) {
    const err = new Error('Expense category not found.');
    err.statusCode = 404;
    throw err;
  }
  const category = rows[0];
  const type = payload.type === 'EMERGENCY' ? 'EMERGENCY' : 'TOPUP';
  const amount = Number(payload.amount);
  if (!amount || amount <= 0) {
    const err = new Error('Amount must be greater than zero.');
    err.statusCode = 400;
    throw err;
  }
  await insertAllocationRequest(db, {
    categoryId, categoryName: category.name, type, amount, reason: payload.reason, requestedBy
  });
  await db.execute(
    "UPDATE expense_categories SET status = 'ACTIVE', balance = balance + ?, allocated_total = allocated_total + ? WHERE id = ?",
    [amount, amount, categoryId]
  );
  const [updated] = await db.query('SELECT * FROM expense_categories WHERE id = ?', [categoryId]);
  return updated[0];
}

async function nextVoucherNo(db) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `EXP-${today}-%`;
  const [rows] = await db.query(
    "SELECT voucher_no FROM expense_vouchers WHERE voucher_no LIKE ? ORDER BY id DESC LIMIT 1",
    [prefix]
  );
  let lastSeq = 0;
  if (rows.length && rows[0].voucher_no) {
    const match = rows[0].voucher_no.match(/EXP-\d+-(\d+)/);
    if (match) lastSeq = parseInt(match[1], 10) || 0;
  }
  return `EXP-${today}-${String(lastSeq + 1).padStart(2, '0')}`;
}

export async function createExpenseVoucher(db, payload, createdBy) {
  await ensureExpenseColumns(db);
  const categoryId = Number(payload.category_id);
  const amount = Number(payload.amount) || 0;

  const [rows] = await db.query('SELECT * FROM expense_categories WHERE id = ?', [categoryId]);
  if (!rows.length || rows[0].status !== 'ACTIVE' || amount <= 0) {
    const err = new Error('Insufficient balance in this expense account.');
    throw err;
  }
  const category = rows[0];
  if (Number(category.balance) < amount) {
    const err = new Error('There is no enough money in this expense category please topup');
    err.statusCode = 400;
    throw err;
  }

  const voucherBranch = payload.branch || 'Main Branch';

  for (let attempt = 0; attempt < 2; attempt++) {
    const voucherNo = await nextVoucherNo(db);
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [updateResult] = await conn.execute(
        'UPDATE expense_categories SET balance = balance - ? WHERE id = ? AND balance >= ?',
        [amount, categoryId, amount]
      );
      if (!updateResult.affectedRows) {
        const err = new Error('there is no enough money for this expense category please topup');
        err.statusCode = 400;
        throw err;
      }

      const voucherDate = payload.date || new Date().toISOString().slice(0, 10);
      const [result] = await conn.execute(
        `INSERT INTO expense_vouchers (voucher_no, branch, payee, category_id, category, amount, date, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?)`,
        [
          voucherNo,
          voucherBranch,
          payload.payee || payload.created_by || 'Staff',
          categoryId,
          category.name,
          amount,
          voucherDate,
          payload.narration || payload.notes || null
        ]
      );

      const isBank = (payload.payment_mode || '').toUpperCase().includes('BANK') ||
                     (payload.voucher_type || '').toUpperCase().includes('BANK') ||
                     (payload.payment_mode || '').toUpperCase().includes('ONLINE') ||
                     (payload.payment_mode || '').toUpperCase().includes('CHEQUE');

      const creditCode = payload.source_account_code || (isBank ? '1002' : '1001');
      const creditName = payload.source_account_name || (isBank ? 'Bank Account' : 'Cash in Hand');
      const voucherType = payload.voucher_type || (isBank ? 'BANK_PAYMENT' : 'CASH_PAYMENT');

      // Also record in general ledger journal for double-entry bookkeeping using matching voucher_no
      await insertVoucherOnConnection(conn, {
        voucher_no: voucherNo,
        entry_date: voucherDate,
        description: payload.narration || `Expense voucher ${voucherNo} — ${category.name}`,
        voucher_type: voucherType,
        is_auto: true,
        ref_type: 'EXPENSE',
        ref_id: result.insertId,
        branch: voucherBranch,
        created_by: createdBy || payload.created_by || null,
        lines: [
          { account_code: '5002', account_name: 'Branch Operating Expenses', debit: amount, credit: 0, description: `Expense for ${category.name}` },
          { account_code: creditCode, account_name: creditName, debit: 0, credit: amount, description: `Payment via ${creditName}` }
        ]
      });

      await conn.commit();
      const [voucherRows] = await conn.query('SELECT * FROM expense_vouchers WHERE id = ?', [result.insertId]);
      return voucherRows[0];
    } catch (err) {
      await conn.rollback();
      if (err.code === 'ER_DUP_ENTRY' && attempt === 0) continue;
      throw err;
    } finally {
      conn.release();
    }
  }
}
