import { insertVoucherOnConnection } from '../ledger/ledger.service.js';

const VALID_PAYMENT_MODES = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'];

const CASH_ACCOUNT = '1001';
const BANK_ACCOUNT = '1002';
const RD_LIABILITY_ACCOUNT = '2201';
const RD_INTEREST_EXPENSE_ACCOUNT = '5004';

function cashOrBankAccount(paymentMode) {
  return ['BANK_TRANSFER', 'UPI', 'CHEQUE'].includes(paymentMode) ? BANK_ACCOUNT : CASH_ACCOUNT;
}

// Standard "simple interest" Recurring Deposit maturity formula used by Indian
// banks/post offices, matching what the booking form shows staff before they
// submit (client/src/finance/recurringDeposits/RecurringDepositsView.jsx's
// computeRdMaturity). Kept server-side too so the stored value can never just
// be whatever a client happened to send; this is the authoritative calculation.
// Interest = P × n × (n+1) × r / (2 × 12 × 100), where P = monthly
// installment, n = number of installments, r = annual interest rate (%).
function computeRdValue(monthlyInstallment, installmentCount, annualRate) {
  const p = Number(monthlyInstallment) || 0;
  const n = Number(installmentCount) || 0;
  const r = Number(annualRate) || 0;
  const totalDeposited = p * n;
  const interest = (p * n * (n + 1) * r) / (2 * 12 * 100);
  return Math.round(totalDeposited + interest);
}

async function nextRdAccountNo(db) {
  const year = new Date().getFullYear();
  const [rows] = await db.query(
    "SELECT rd_account_no FROM recurring_deposits WHERE rd_account_no LIKE ? ORDER BY id DESC LIMIT 1",
    [`RD-${year}-%`]
  );
  const last = rows[0]?.rd_account_no;
  const lastSeq = last ? parseInt(last.split('-')[2], 10) || 0 : 0;
  return `RD-${year}-${String(lastSeq + 1).padStart(3, '0')}`;
}

async function attachInstallments(db, rd) {
  const [installments] = await db.query(
    'SELECT id, rd_id, month_no, due_date, amount, status, paid_date, payment_mode, voucher_no FROM recurring_deposit_installments WHERE rd_id = ? ORDER BY month_no',
    [rd.id]
  );
  return { ...rd, installments };
}

export async function getRecurringDeposits(db) {
  const [rows] = await db.query('SELECT * FROM recurring_deposits ORDER BY id DESC');
  const withInstallments = [];
  for (const rd of rows) {
    withInstallments.push(await attachInstallments(db, rd));
  }
  return withInstallments;
}

function assertValidCreatePayload(payload) {
  const required = ['customer_name', 'monthly_installment', 'tenure_months', 'interest_rate', 'booking_date', 'maturity_date'];
  for (const field of required) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
      const err = new Error(`${field} is required.`);
      err.statusCode = 400;
      throw err;
    }
  }
  const installment = Number(payload.monthly_installment);
  if (!Number.isFinite(installment) || installment <= 0) {
    const err = new Error('Monthly installment must be a positive number.');
    err.statusCode = 400;
    throw err;
  }
  const tenure = Number(payload.tenure_months);
  if (!Number.isInteger(tenure) || tenure < 3 || tenure > 60) {
    const err = new Error('Tenure must be a whole number of months between 3 and 60.');
    err.statusCode = 400;
    throw err;
  }
  const rate = Number(payload.interest_rate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    const err = new Error('Interest rate must be between 0 and 100.');
    err.statusCode = 400;
    throw err;
  }
  if (payload.payment_mode && !VALID_PAYMENT_MODES.includes(payload.payment_mode)) {
    const err = new Error(`'${payload.payment_mode}' is not a valid payment mode. Must be one of: ${VALID_PAYMENT_MODES.join(', ')}.`);
    err.statusCode = 400;
    throw err;
  }
  if (new Date(payload.maturity_date) <= new Date(payload.booking_date)) {
    const err = new Error('Maturity date must be after the booking date.');
    err.statusCode = 400;
    throw err;
  }
}

export async function createRecurringDeposit(db, payload) {
  assertValidCreatePayload(payload);

  if (payload.borrower_id) {
    const [borrowerRows] = await db.query('SELECT id FROM borrowers WHERE id = ?', [payload.borrower_id]);
    if (!borrowerRows.length) {
      const err = new Error('Selected customer was not found.');
      err.statusCode = 404;
      throw err;
    }
  }

  const monthlyInstallment = Number(payload.monthly_installment);
  const tenureMonths = Number(payload.tenure_months);
  const rate = Number(payload.interest_rate);
  const maturityValue = computeRdValue(monthlyInstallment, tenureMonths, rate);

  for (let attempt = 0; attempt < 2; attempt++) {
    const accountNo = await nextRdAccountNo(db);
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.execute(
        `INSERT INTO recurring_deposits (rd_account_no, borrower_id, customer_name, branch, monthly_installment,
          tenure_months, interest_rate, payment_mode, notes, booking_date, maturity_date, maturity_value,
          collected_amount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'ACTIVE')`,
        [accountNo, payload.borrower_id || null, payload.customer_name, payload.branch || null,
          monthlyInstallment, tenureMonths, rate, payload.payment_mode || 'CASH',
          payload.notes || null, payload.booking_date, payload.maturity_date, maturityValue]
      );
      const rdId = result.insertId;

      const start = new Date(`${payload.booking_date}T00:00:00Z`);
      for (let i = 1; i <= tenureMonths; i++) {
        const due = new Date(start);
        due.setUTCMonth(due.getUTCMonth() + i);
        await conn.execute(
          'INSERT INTO recurring_deposit_installments (rd_id, month_no, due_date, amount, status) VALUES (?, ?, ?, ?, ?)',
          [rdId, i, due.toISOString().slice(0, 10), monthlyInstallment, 'PENDING']
        );
      }

      await conn.commit();
      const [rows] = await conn.query('SELECT * FROM recurring_deposits WHERE id = ?', [rdId]);
      return attachInstallments(db, rows[0]);
    } catch (err) {
      await conn.rollback();
      if (err.code === 'ER_DUP_ENTRY' && attempt === 0) continue;
      throw err;
    } finally {
      conn.release();
    }
  }
}

async function getRdOr404(db, id) {
  const [rows] = await db.query('SELECT * FROM recurring_deposits WHERE id = ?', [id]);
  if (!rows.length) {
    const err = new Error('Recurring deposit not found.');
    err.statusCode = 404;
    throw err;
  }
  return rows[0];
}

export async function collectRdInstallment(db, id, monthNo, paymentMode = 'CASH', createdBy, extra = {}) {
  const rd = await getRdOr404(db, id);
  if (rd.status !== 'ACTIVE') {
    const err = new Error(`This recurring deposit is already ${rd.status}.`);
    err.statusCode = 409;
    throw err;
  }
  if (!VALID_PAYMENT_MODES.includes(paymentMode)) {
    const err = new Error(`'${paymentMode}' is not a valid payment mode. Must be one of: ${VALID_PAYMENT_MODES.join(', ')}.`);
    err.statusCode = 400;
    throw err;
  }
  const [instRows] = await db.query(
    'SELECT * FROM recurring_deposit_installments WHERE rd_id = ? AND month_no = ?',
    [id, monthNo]
  );
  if (!instRows.length) {
    const err = new Error('Installment not found.');
    err.statusCode = 404;
    throw err;
  }
  const installment = instRows[0];
  if (installment.status === 'PAID') {
    // Already paid (duplicate submit) — return current state instead of erroring,
    // same idempotent-on-repeat-click treatment as the other deposit actions.
    return attachInstallments(db, rd);
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const paidDate = new Date().toISOString().slice(0, 10);
    const amount = Number(installment.amount);

    let description = `Recurring deposit installment collected — ${rd.rd_account_no} (${rd.customer_name}) — month ${monthNo}`;
    if (extra.bank_name) {
      const bankTag = `[Bank: ${extra.bank_name}${extra.bank_account_number ? ' A/C ...' + String(extra.bank_account_number).slice(-4) : ''}${extra.ifsc_code ? ' IFSC: ' + extra.ifsc_code : ''}]`;
      description += ` ${bankTag}`;
    }

    const voucher = await insertVoucherOnConnection(conn, {
      entry_date: paidDate,
      description,
      voucher_type: 'RECEIPT',
      is_auto: true,
      ref_type: 'RD_INSTALLMENT',
      ref_id: rd.id,
      branch: rd.branch || null,
      created_by: createdBy || null,
      lines: [
        { account_code: cashOrBankAccount(paymentMode), debit: amount, credit: 0 },
        { account_code: RD_LIABILITY_ACCOUNT, account_name: 'Recurring Deposit Liability', debit: 0, credit: amount }
      ]
    });

    const [updateResult] = await conn.execute(
      "UPDATE recurring_deposit_installments SET status = 'PAID', paid_date = ?, payment_mode = ?, voucher_no = ? WHERE id = ? AND status = 'PENDING'",
      [paidDate, paymentMode, voucher.voucher_no, installment.id]
    );
    if (updateResult.affectedRows === 0) {
      await conn.rollback();
      return attachInstallments(db, rd);
    }
    await conn.execute(
      'UPDATE recurring_deposits SET collected_amount = collected_amount + ? WHERE id = ?',
      [amount, id]
    );

    await conn.commit();
    const [rows] = await conn.query('SELECT * FROM recurring_deposits WHERE id = ?', [id]);
    return attachInstallments(db, rows[0]);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function matureRecurringDeposit(db, id, createdBy) {
  const rd = await getRdOr404(db, id);
  if (rd.status !== 'ACTIVE') {
    const err = new Error(`This recurring deposit is already ${rd.status}.`);
    err.statusCode = 409;
    throw err;
  }

  const collected = Number(rd.collected_amount) || 0;
  const maturityValue = Number(rd.maturity_value) || 0;
  const interestPortion = Math.max(0, maturityValue - collected);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [updateResult] = await conn.execute(
      "UPDATE recurring_deposits SET status = 'MATURED' WHERE id = ? AND status = 'ACTIVE'",
      [id]
    );
    if (updateResult.affectedRows === 0) {
      const err = new Error('This recurring deposit was already updated by another request.');
      err.statusCode = 409;
      throw err;
    }

    const lines = [{ account_code: RD_LIABILITY_ACCOUNT, account_name: 'Recurring Deposit Liability', debit: collected, credit: 0 }];
    if (interestPortion > 0) {
      lines.push({ account_code: RD_INTEREST_EXPENSE_ACCOUNT, account_name: 'Recurring Deposit Interest Expense', debit: interestPortion, credit: 0 });
    }
    lines.push({ account_code: cashOrBankAccount(rd.payment_mode), debit: 0, credit: maturityValue });

    await insertVoucherOnConnection(conn, {
      entry_date: new Date().toISOString().slice(0, 10),
      description: `Recurring deposit matured — ${rd.rd_account_no} (${rd.customer_name})`,
      voucher_type: 'PAYMENT',
      is_auto: true,
      ref_type: 'RD_MATURITY',
      ref_id: rd.id,
      branch: rd.branch || null,
      created_by: createdBy || null,
      lines
    });

    await conn.commit();
    const [rows] = await conn.query('SELECT * FROM recurring_deposits WHERE id = ?', [id]);
    return attachInstallments(db, rows[0]);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function prematureCloseRecurringDeposit(db, id, payoutAmount, createdBy) {
  const rd = await getRdOr404(db, id);
  if (rd.status !== 'ACTIVE') {
    const err = new Error(`This recurring deposit is already ${rd.status}.`);
    err.statusCode = 409;
    throw err;
  }
  const collected = Number(rd.collected_amount) || 0;
  let payout;
  if (payoutAmount !== undefined && payoutAmount !== null && payoutAmount !== '') {
    payout = Math.round(Number(payoutAmount));
    if (!Number.isFinite(payout) || payout < 0) {
      const err = new Error('Payout amount must be a non-negative number.');
      err.statusCode = 400;
      throw err;
    }
  } else {
    // Prorated by installments actually paid — the same series formula used
    // for the full-tenure maturity value, run for the number of installments
    // collected instead of the full tenure. Replaces the previous flat
    // "98% of whatever was collected" rule, which paid out nearly the same
    // interest whether the customer closed after month 1 or month 11.
    const [paidRows] = await db.query(
      "SELECT COUNT(*) as c FROM recurring_deposit_installments WHERE rd_id = ? AND status = 'PAID'",
      [id]
    );
    const monthsPaid = Number(paidRows[0]?.c) || 0;
    payout = computeRdValue(rd.monthly_installment, monthsPaid, rd.interest_rate);
  }
  const interestPortion = payout - collected;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [updateResult] = await conn.execute(
      "UPDATE recurring_deposits SET status = 'CLOSED_PREMATURE', payout_amount = ? WHERE id = ? AND status = 'ACTIVE'",
      [payout, id]
    );
    if (updateResult.affectedRows === 0) {
      const err = new Error('This recurring deposit was already updated by another request.');
      err.statusCode = 409;
      throw err;
    }

    const lines = [{ account_code: RD_LIABILITY_ACCOUNT, account_name: 'Recurring Deposit Liability', debit: collected, credit: 0 }];
    if (interestPortion > 0) {
      lines.push({ account_code: RD_INTEREST_EXPENSE_ACCOUNT, account_name: 'Recurring Deposit Interest Expense', debit: interestPortion, credit: 0 });
    } else if (interestPortion < 0) {
      lines.push({ account_code: RD_INTEREST_EXPENSE_ACCOUNT, account_name: 'Recurring Deposit Interest Expense', debit: 0, credit: -interestPortion });
    }
    lines.push({ account_code: cashOrBankAccount(rd.payment_mode), debit: 0, credit: payout });

    await insertVoucherOnConnection(conn, {
      entry_date: new Date().toISOString().slice(0, 10),
      description: `Recurring deposit premature closure — ${rd.rd_account_no} (${rd.customer_name})`,
      voucher_type: 'PAYMENT',
      is_auto: true,
      ref_type: 'RD_PREMATURE_CLOSE',
      ref_id: rd.id,
      branch: rd.branch || null,
      created_by: createdBy || null,
      lines
    });

    await conn.commit();
    const [rows] = await conn.query('SELECT * FROM recurring_deposits WHERE id = ?', [id]);
    return attachInstallments(db, rows[0]);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
