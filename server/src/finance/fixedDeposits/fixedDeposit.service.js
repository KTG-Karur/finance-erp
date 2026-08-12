import { insertVoucherOnConnection } from '../ledger/ledger.service.js';

const VALID_SCHEMES = ['CUMULATIVE', 'MONTHLY_PAYOUT'];
const VALID_PAYMENT_MODES = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'];

const CASH_ACCOUNT = '1001';
const BANK_ACCOUNT = '1002';
const FD_LIABILITY_ACCOUNT = '2200';
const FD_INTEREST_EXPENSE_ACCOUNT = '5003';

function cashOrBankAccount(paymentMode) {
  return ['BANK_TRANSFER', 'UPI', 'CHEQUE'].includes(paymentMode) ? BANK_ACCOUNT : CASH_ACCOUNT;
}

// Simple interest over the full tenure — matches what the booking form shows
// staff before they submit (client/src/finance/fixedDeposits/FixedDepositsView.jsx's
// computeMaturity). Kept server-side too so the stored value can never just be
// whatever a client happened to send; this is the authoritative calculation.
// MONTHLY_PAYOUT schemes return principal only at maturity — their interest is
// paid out each month instead via payFdMonthlyInterest() below.
function computeMaturityValue(principal, rate, tenureMonths, scheme) {
  if (scheme === 'MONTHLY_PAYOUT') return Math.round(principal);
  const interest = principal * (rate / 100) * (tenureMonths / 12);
  return Math.round(principal + interest);
}

function computeMonthlyInterestAmount(principal, rate) {
  return Math.round(principal * (rate / 100) / 12);
}

// Premature closure prorates interest for the days actually held, at the FD's
// contracted rate, with no separate penalty layered on top (staff can still
// type a different settlement amount in the UI). For MONTHLY_PAYOUT FDs,
// interest already paid out via payFdMonthlyInterest() is deducted so the
// customer isn't double-paid for months already settled.
function computeProRatedValue(principal, rate, bookingDate, closureDate) {
  const daysHeld = Math.max(0, Math.round((new Date(closureDate) - new Date(bookingDate)) / (1000 * 60 * 60 * 24)));
  const interest = principal * (rate / 100) * (daysHeld / 365);
  return Math.round(principal + interest);
}

async function nextFdAccountNo(db) {
  const year = new Date().getFullYear();
  const [rows] = await db.query(
    "SELECT fd_account_no FROM fixed_deposits WHERE fd_account_no LIKE ? ORDER BY id DESC LIMIT 1",
    [`FD-${year}-%`]
  );
  const last = rows[0]?.fd_account_no;
  const lastSeq = last ? parseInt(last.split('-')[2], 10) || 0 : 0;
  return `FD-${year}-${String(lastSeq + 1).padStart(3, '0')}`;
}

export async function getFixedDeposits(db) {
  const [rows] = await db.query('SELECT * FROM fixed_deposits ORDER BY id DESC');
  return rows;
}

function assertValidCreatePayload(payload) {
  const required = ['customer_name', 'principal_amount', 'tenure_months', 'interest_rate', 'booking_date', 'maturity_date'];
  for (const field of required) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
      const err = new Error(`${field} is required.`);
      err.statusCode = 400;
      throw err;
    }
  }
  const principal = Number(payload.principal_amount);
  if (!Number.isFinite(principal) || principal <= 0) {
    const err = new Error('Principal amount must be a positive number.');
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
  if (payload.scheme && !VALID_SCHEMES.includes(payload.scheme)) {
    const err = new Error(`'${payload.scheme}' is not a valid scheme. Must be one of: ${VALID_SCHEMES.join(', ')}.`);
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

export async function createFixedDeposit(db, payload, createdBy) {
  assertValidCreatePayload(payload);

  if (payload.borrower_id) {
    const [borrowerRows] = await db.query('SELECT id FROM borrowers WHERE id = ?', [payload.borrower_id]);
    if (!borrowerRows.length) {
      const err = new Error('Selected customer was not found.');
      err.statusCode = 404;
      throw err;
    }
  }

  const principal = Number(payload.principal_amount);
  const tenure = Number(payload.tenure_months);
  const rate = Number(payload.interest_rate);
  const scheme = payload.scheme || 'CUMULATIVE';
  const paymentMode = payload.payment_mode || 'CASH';
  const maturityValue = computeMaturityValue(principal, rate, tenure, scheme);

  for (let attempt = 0; attempt < 2; attempt++) {
    const accountNo = await nextFdAccountNo(db);
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.execute(
        `INSERT INTO fixed_deposits (fd_account_no, borrower_id, customer_name, branch, principal_amount,
          tenure_months, interest_rate, scheme, payment_mode, notes, booking_date, maturity_date,
          maturity_value, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
        [accountNo, payload.borrower_id || null, payload.customer_name, payload.branch || null,
          principal, tenure, rate,
          scheme, paymentMode, payload.notes || null,
          payload.booking_date, payload.maturity_date, maturityValue]
      );
      const fdId = result.insertId;

      await insertVoucherOnConnection(conn, {
        entry_date: payload.booking_date,
        description: `Fixed deposit booked — ${accountNo} (${payload.customer_name})`,
        voucher_type: 'PAYMENT',
        is_auto: true,
        ref_type: 'FD_BOOKING',
        ref_id: fdId,
        branch: payload.branch || null,
        created_by: createdBy || null,
        lines: [
          { account_code: cashOrBankAccount(paymentMode), debit: principal, credit: 0 },
          { account_code: FD_LIABILITY_ACCOUNT, account_name: 'Fixed Deposit Liability', debit: 0, credit: principal }
        ]
      });

      await conn.commit();
      const [rows] = await conn.query('SELECT * FROM fixed_deposits WHERE id = ?', [fdId]);
      return rows[0];
    } catch (err) {
      await conn.rollback();
      if (err.code === 'ER_DUP_ENTRY' && attempt === 0) continue;
      throw err;
    } finally {
      conn.release();
    }
  }
}

async function getFdOr404(db, id) {
  const [rows] = await db.query('SELECT * FROM fixed_deposits WHERE id = ?', [id]);
  if (!rows.length) {
    const err = new Error('Fixed deposit not found.');
    err.statusCode = 404;
    throw err;
  }
  return rows[0];
}

// Total interest already paid out via payFdMonthlyInterest() for this FD, and
// how many of those monthly payouts have been recorded — used both to stop a
// MONTHLY_PAYOUT FD being paid twice in the same month or beyond its tenure,
// and to net already-paid interest out of a premature closure settlement.
async function getMonthlyPayoutSummary(db, fdId) {
  const [rows] = await db.query(
    `SELECT COUNT(*) as payout_count, COALESCE(SUM(total_amount), 0) as total_paid, MAX(entry_date) as last_payout_date
     FROM journal_entries WHERE ref_type = 'FD_INTEREST_PAYOUT' AND ref_id = ?`,
    [fdId]
  );
  const row = rows[0] || {};
  return {
    payoutCount: Number(row.payout_count) || 0,
    totalPaid: Number(row.total_paid) || 0,
    lastPayoutDate: row.last_payout_date || null
  };
}

export async function getFdInterestPayoutStatus(db, id) {
  const fd = await getFdOr404(db, id);
  const summary = await getMonthlyPayoutSummary(db, id);
  const monthlyAmount = fd.scheme === 'MONTHLY_PAYOUT'
    ? computeMonthlyInterestAmount(Number(fd.principal_amount), Number(fd.interest_rate))
    : 0;
  const now = new Date();
  const lastPayoutMonth = summary.lastPayoutDate ? new Date(summary.lastPayoutDate).toISOString().slice(0, 7) : null;
  const currentMonth = now.toISOString().slice(0, 7);
  return {
    scheme: fd.scheme,
    status: fd.status,
    monthlyInterestAmount: monthlyAmount,
    tenureMonths: fd.tenure_months,
    monthsPaid: summary.payoutCount,
    totalInterestPaid: summary.totalPaid,
    monthsRemaining: Math.max(0, fd.tenure_months - summary.payoutCount),
    eligibleForPayoutNow: fd.scheme === 'MONTHLY_PAYOUT' && fd.status === 'ACTIVE'
      && summary.payoutCount < fd.tenure_months && lastPayoutMonth !== currentMonth
  };
}

export async function payFdMonthlyInterest(db, id, payload = {}, createdBy) {
  const fd = await getFdOr404(db, id);
  if (fd.status !== 'ACTIVE') {
    const err = new Error(`This fixed deposit is already ${fd.status}.`);
    err.statusCode = 409;
    throw err;
  }
  if (fd.scheme !== 'MONTHLY_PAYOUT') {
    const err = new Error('This fixed deposit is not on the monthly payout scheme.');
    err.statusCode = 400;
    throw err;
  }
  const paymentMode = payload.payment_mode || 'CASH';
  if (!VALID_PAYMENT_MODES.includes(paymentMode)) {
    const err = new Error(`'${paymentMode}' is not a valid payment mode. Must be one of: ${VALID_PAYMENT_MODES.join(', ')}.`);
    err.statusCode = 400;
    throw err;
  }

  const summary = await getMonthlyPayoutSummary(db, id);
  if (summary.payoutCount >= fd.tenure_months) {
    const err = new Error('All monthly interest payouts for this fixed deposit\'s tenure have already been recorded.');
    err.statusCode = 409;
    throw err;
  }
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const lastPayoutMonth = summary.lastPayoutDate ? new Date(summary.lastPayoutDate).toISOString().slice(0, 7) : null;
  if (lastPayoutMonth === currentMonth) {
    const err = new Error('Monthly interest for this fixed deposit has already been paid this month.');
    err.statusCode = 409;
    throw err;
  }

  const amount = computeMonthlyInterestAmount(Number(fd.principal_amount), Number(fd.interest_rate));
  if (amount <= 0) {
    const err = new Error('Computed monthly interest amount is zero — nothing to pay out.');
    err.statusCode = 400;
    throw err;
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const voucher = await insertVoucherOnConnection(conn, {
      entry_date: now.toISOString().slice(0, 10),
      description: `FD monthly interest payout — ${fd.fd_account_no} (${fd.customer_name}), month ${summary.payoutCount + 1} of ${fd.tenure_months}`,
      voucher_type: 'PAYMENT',
      is_auto: false,
      ref_type: 'FD_INTEREST_PAYOUT',
      ref_id: fd.id,
      branch: fd.branch || null,
      created_by: createdBy || null,
      lines: [
        { account_code: FD_INTEREST_EXPENSE_ACCOUNT, account_name: 'Fixed Deposit Interest Expense', debit: amount, credit: 0 },
        { account_code: cashOrBankAccount(paymentMode), debit: 0, credit: amount }
      ]
    });
    await conn.commit();
    return {
      ...voucher,
      amount,
      month_number: summary.payoutCount + 1,
      tenure_months: fd.tenure_months
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function matureFixedDeposit(db, id, createdBy) {
  const fd = await getFdOr404(db, id);
  if (fd.status !== 'ACTIVE') {
    const err = new Error(`This fixed deposit is already ${fd.status}.`);
    err.statusCode = 409;
    throw err;
  }

  const principal = Number(fd.principal_amount);
  const maturityValue = Number(fd.maturity_value);
  const interestPortion = Math.max(0, maturityValue - principal);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [updateResult] = await conn.execute(
      "UPDATE fixed_deposits SET status = 'MATURED' WHERE id = ? AND status = 'ACTIVE'",
      [id]
    );
    if (updateResult.affectedRows === 0) {
      const err = new Error('This fixed deposit was already updated by another request.');
      err.statusCode = 409;
      throw err;
    }

    const lines = [{ account_code: FD_LIABILITY_ACCOUNT, account_name: 'Fixed Deposit Liability', debit: principal, credit: 0 }];
    if (interestPortion > 0) {
      lines.push({ account_code: FD_INTEREST_EXPENSE_ACCOUNT, account_name: 'Fixed Deposit Interest Expense', debit: interestPortion, credit: 0 });
    }
    lines.push({ account_code: cashOrBankAccount(fd.payment_mode), debit: 0, credit: maturityValue });

    await insertVoucherOnConnection(conn, {
      entry_date: new Date().toISOString().slice(0, 10),
      description: `Fixed deposit matured — ${fd.fd_account_no} (${fd.customer_name})`,
      voucher_type: 'PAYMENT',
      is_auto: true,
      ref_type: 'FD_MATURITY',
      ref_id: fd.id,
      branch: fd.branch || null,
      created_by: createdBy || null,
      lines
    });

    await conn.commit();
    const [rows] = await conn.query('SELECT * FROM fixed_deposits WHERE id = ?', [id]);
    return rows[0];
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function prematureCloseFixedDeposit(db, id, payoutAmount, createdBy) {
  const fd = await getFdOr404(db, id);
  if (fd.status !== 'ACTIVE') {
    const err = new Error(`This fixed deposit is already ${fd.status}.`);
    err.statusCode = 409;
    throw err;
  }
  const principal = Number(fd.principal_amount);
  let payout;
  if (payoutAmount !== undefined && payoutAmount !== null && payoutAmount !== '') {
    payout = Math.round(Number(payoutAmount));
    if (!Number.isFinite(payout) || payout < 0) {
      const err = new Error('Payout amount must be a non-negative number.');
      err.statusCode = 400;
      throw err;
    }
  } else {
    payout = computeProRatedValue(principal, Number(fd.interest_rate), fd.booking_date, new Date().toISOString().slice(0, 10));
    if (fd.scheme === 'MONTHLY_PAYOUT') {
      const summary = await getMonthlyPayoutSummary(db, id);
      payout = Math.max(principal, payout - summary.totalPaid);
    }
  }
  const interestPortion = payout - principal;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [updateResult] = await conn.execute(
      "UPDATE fixed_deposits SET status = 'CLOSED_PREMATURE', payout_amount = ? WHERE id = ? AND status = 'ACTIVE'",
      [payout, id]
    );
    if (updateResult.affectedRows === 0) {
      const err = new Error('This fixed deposit was already updated by another request.');
      err.statusCode = 409;
      throw err;
    }

    const lines = [{ account_code: FD_LIABILITY_ACCOUNT, account_name: 'Fixed Deposit Liability', debit: principal, credit: 0 }];
    if (interestPortion > 0) {
      lines.push({ account_code: FD_INTEREST_EXPENSE_ACCOUNT, account_name: 'Fixed Deposit Interest Expense', debit: interestPortion, credit: 0 });
    } else if (interestPortion < 0) {
      lines.push({ account_code: FD_INTEREST_EXPENSE_ACCOUNT, account_name: 'Fixed Deposit Interest Expense', debit: 0, credit: -interestPortion });
    }
    lines.push({ account_code: cashOrBankAccount(fd.payment_mode), debit: 0, credit: payout });

    await insertVoucherOnConnection(conn, {
      entry_date: new Date().toISOString().slice(0, 10),
      description: `Fixed deposit premature closure — ${fd.fd_account_no} (${fd.customer_name})`,
      voucher_type: 'PAYMENT',
      is_auto: true,
      ref_type: 'FD_PREMATURE_CLOSE',
      ref_id: fd.id,
      branch: fd.branch || null,
      created_by: createdBy || null,
      lines
    });

    await conn.commit();
    const [rows] = await conn.query('SELECT * FROM fixed_deposits WHERE id = ?', [id]);
    return rows[0];
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
