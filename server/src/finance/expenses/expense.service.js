import { insertVoucherOnConnection } from '../ledger/ledger.service.js';

export async function getExpenseCategories(db) {
  const [rows] = await db.query('SELECT * FROM expense_categories ORDER BY id');
  return rows;
}

export async function getExpenseAllocationRequests(db) {
  const [rows] = await db.query('SELECT * FROM expense_allocation_requests ORDER BY requested_at DESC');
  return rows;
}

export async function getExpenseVouchers(db) {
  const [rows] = await db.query('SELECT * FROM expense_vouchers ORDER BY id DESC');
  return rows;
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
  const name = String(payload.name || '').trim();
  if (!name) {
    const err = new Error('Category name is required.');
    err.statusCode = 400;
    throw err;
  }
  const [existing] = await db.query('SELECT id FROM expense_categories WHERE name = ?', [name]);
  if (existing.length) {
    const err = new Error(`An expense category named '${name}' already exists.`);
    err.statusCode = 409;
    throw err;
  }
  const amount = Number(payload.amount) || 0;
  const [result] = await db.execute(
    "INSERT INTO expense_categories (name, status, balance, allocated_total) VALUES (?, 'ACTIVE', ?, ?)",
    [name, amount, amount]
  );
  await insertAllocationRequest(db, {
    categoryId: result.insertId, categoryName: name, type: 'INITIAL', amount, reason: payload.reason, requestedBy
  });
  const [rows] = await db.query('SELECT * FROM expense_categories WHERE id = ?', [result.insertId]);
  return rows[0];
}

export async function updateExpenseCategory(db, id, payload) {
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
  await db.execute('UPDATE expense_categories SET name = ? WHERE id = ?', [name, id]);
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
  const amount = Number(payload.amount) || 0;
  if (amount <= 0) {
    const err = new Error('Amount must be greater than zero.');
    err.statusCode = 400;
    throw err;
  }
  await db.execute(
    "UPDATE expense_categories SET status = 'ACTIVE', balance = balance + ?, allocated_total = allocated_total + ? WHERE id = ?",
    [amount, amount, categoryId]
  );
  await insertAllocationRequest(db, {
    categoryId, categoryName: category.name, type: payload.type || 'TOPUP', amount, reason: payload.reason, requestedBy
  });
  const [updated] = await db.query('SELECT * FROM expense_categories WHERE id = ?', [categoryId]);
  return updated[0];
}

async function nextVoucherNo(db) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const [rows] = await db.query(
    "SELECT voucher_no FROM expense_vouchers WHERE voucher_no LIKE ? ORDER BY id DESC LIMIT 1",
    [`EXP-${today}-%`]
  );
  const last = rows[0]?.voucher_no;
  const lastSeq = last ? parseInt(last.split('-')[2], 10) || 0 : 0;
  return `EXP-${today}-${String(lastSeq + 1).padStart(2, '0')}`;
}

export async function createExpenseVoucher(db, payload, createdBy) {
  const categoryId = Number(payload.category_id);
  const amount = Number(payload.amount) || 0;

  const [rows] = await db.query('SELECT * FROM expense_categories WHERE id = ?', [categoryId]);
  if (!rows.length || rows[0].status !== 'ACTIVE' || amount <= 0) {
    const err = new Error('Insufficient balance in this expense account.');
    err.statusCode = 409;
    throw err;
  }
  const category = rows[0];

  for (let attempt = 0; attempt < 2; attempt++) {
    const voucherNo = await nextVoucherNo(db);
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Conditional UPDATE (`balance >= ?`) so a concurrent double-submit can't
      // push a category negative even if both requests read the same starting
      // balance. Runs inside the same transaction as the voucher insert and
      // the real ledger posting below now, instead of the previous pattern of
      // a bare UPDATE with a manual compensating "refund" on failure — a real
      // transaction rollback can't leave the debit applied with no voucher to
      // show for it, which the old refund-on-catch pattern theoretically could
      // (e.g. if the process died between the debit and the refund).
      const [updateResult] = await conn.execute(
        'UPDATE expense_categories SET balance = balance - ? WHERE id = ? AND balance >= ?',
        [amount, categoryId, amount]
      );
      if (!updateResult.affectedRows) {
        const err = new Error('Insufficient balance in this expense account.');
        err.statusCode = 409;
        throw err;
      }

      const voucherDate = new Date().toISOString().slice(0, 10);
      const [result] = await conn.execute(
        `INSERT INTO expense_vouchers (voucher_no, payee, category_id, category, amount, date, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, 'APPROVED', ?)`,
        [voucherNo, payload.payee || payload.notes || 'Unnamed Payee', categoryId, category.name, amount,
          voucherDate, payload.notes || null]
      );

      // Real double-entry posting — '5002' (Branch Operating Expenses) rather
      // than the old client-mock's '5001', which in the real chart of accounts
      // is Bad Debt Provision Expense, an unrelated account. Every category
      // shares this one ledger expense account; the category name is captured
      // in the voucher narration instead of inventing a chart-of-accounts
      // entry per funded category.
      await insertVoucherOnConnection(conn, {
        entry_date: voucherDate,
        description: `Expense voucher ${voucherNo} — ${payload.payee || 'Unnamed Payee'} (${category.name})`,
        voucher_type: 'CASH_PAYMENT',
        is_auto: true,
        ref_type: 'EXPENSE',
        ref_id: result.insertId,
        branch: payload.branch || null,
        created_by: createdBy || null,
        lines: [
          { account_code: '5002', account_name: 'Branch Operating Expenses', debit: amount, credit: 0 },
          { account_code: '1001', account_name: 'Cash in Hand', debit: 0, credit: amount }
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
