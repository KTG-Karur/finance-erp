import { LedgerRepository } from './ledger.repository.js';
import { validateDoubleEntry } from '../../shared/accounting-engine/accountingEngine.js';

const VALID_VOUCHER_TYPES = ['RECEIPT', 'PAYMENT', 'JOURNAL', 'CONTRA', 'CASH_RECEIPT', 'CASH_PAYMENT', 'BANK_RECEIPT', 'BANK_PAYMENT'];

// Every caller of insertVoucherOnConnection — the internal ones (FD/RD booking,
// maturity, closure) and the external one (the Manual Voucher API, which takes
// account codes and amounts straight from a form) — goes through this same
// check, so a typo'd or malicious account code can never silently create a
// journal line against an account that doesn't exist, and a zero-amount or
// single-sided "voucher" can never post as if it were a real transaction.
async function assertValidVoucherInput(conn, { description, entry_date, voucher_type, lines }) {
  if (!description || !String(description).trim()) {
    const err = new Error('Voucher narration/description is required.');
    err.statusCode = 400;
    throw err;
  }
  if (!entry_date) {
    const err = new Error('Voucher entry date is required.');
    err.statusCode = 400;
    throw err;
  }
  if (voucher_type && !VALID_VOUCHER_TYPES.includes(voucher_type)) {
    const err = new Error(`'${voucher_type}' is not a valid voucher type. Must be one of: ${VALID_VOUCHER_TYPES.join(', ')}.`);
    err.statusCode = 400;
    throw err;
  }
  if (!Array.isArray(lines) || lines.length < 2) {
    const err = new Error('A voucher must contain at least 2 journal lines.');
    err.statusCode = 400;
    throw err;
  }
  for (const line of lines) {
    const debit = Number(line.debit) || 0;
    const credit = Number(line.credit) || 0;
    if (!line.account_code) {
      const err = new Error('Every journal line must reference an account code.');
      err.statusCode = 400;
      throw err;
    }
    if ((debit > 0) === (credit > 0)) {
      const err = new Error(`Journal line for account ${line.account_code} must have exactly one of debit or credit greater than zero.`);
      err.statusCode = 400;
      throw err;
    }
  }

  const codes = [...new Set(lines.map(l => l.account_code))];
  const [rows] = await conn.query(
    `SELECT account_code FROM chart_of_accounts WHERE account_code IN (?) AND is_active = 1`,
    [codes]
  );
  const foundCodes = new Set(rows.map(r => r.account_code));
  const missing = codes.filter(c => !foundCodes.has(c));
  if (missing.length) {
    const err = new Error(`These account codes don't exist in the chart of accounts (or are inactive): ${missing.join(', ')}.`);
    err.statusCode = 400;
    throw err;
  }
}

// Shared insert used both by the standalone Manual Voucher API (its own
// transaction) and by other modules (Fixed Deposits, etc.) that need to post
// a voucher as part of a larger transaction they already own — so a state
// change (e.g. FD booked) and its ledger posting either both commit or both
// roll back together, never one without the other.
export async function insertVoucherOnConnection(conn, voucherData) {
  const { entry_date, description, voucher_type, lines, ref_type, ref_id, branch, created_by, is_auto } = voucherData;
  await assertValidVoucherInput(conn, { description, entry_date, voucher_type, lines });
  const { totalDebit } = validateDoubleEntry(lines);
  if (totalDebit <= 0) {
    const err = new Error('Voucher total amount must be greater than zero.');
    err.statusCode = 400;
    throw err;
  }

  const voucherNo = `VOU-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const [vRes] = await conn.query(
    `INSERT INTO journal_entries (voucher_no, entry_date, description, voucher_type, is_auto, total_amount, ref_type, ref_id, branch, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      voucherNo,
      entry_date || new Date().toISOString().slice(0, 10),
      description,
      voucher_type || 'JOURNAL',
      is_auto ? 1 : 0,
      totalDebit,
      ref_type || null,
      ref_id || null,
      branch || null,
      created_by || null
    ]
  );
  const entryId = vRes.insertId;

  const lineValues = lines.map(l => [
    entryId,
    l.account_code,
    l.account_name || 'General Ledger Account',
    parseFloat(l.debit || 0),
    parseFloat(l.credit || 0),
    l.description || ''
  ]);

  await conn.query(
    `INSERT INTO journal_lines (journal_entry_id, account_code, account_name, debit, credit, description) VALUES ?`,
    [lineValues]
  );

  return {
    id: entryId,
    voucher_no: voucherNo,
    entry_date: entry_date,
    description,
    voucher_type: voucher_type || 'JOURNAL',
    is_auto: Boolean(is_auto),
    total_amount: totalDebit,
    ref_type: ref_type || null,
    ref_id: ref_id || null,
    branch: branch || null,
    created_by: created_by || null,
    lines: lineValues.map(([, account_code, account_name, debit, credit, description]) => ({ account_code, account_name, debit, credit, description })),
    lines_count: lines.length
  };
}

export class LedgerService {
  static async getChartOfAccounts(db) {
    return LedgerRepository.findAccounts(db);
  }

  static async getJournalEntries(db, filters) {
    return LedgerRepository.findEntries(db, filters);
  }

  static async postVoucher(db, voucherData) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const result = await insertVoucherOnConnection(conn, voucherData);
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  static async getTrialBalance(db) {
    const [accounts] = await db.query(`SELECT * FROM chart_of_accounts WHERE is_active = 1`);
    const [lines] = await db.query(
      `SELECT account_code, SUM(debit) as total_debit, SUM(credit) as total_credit FROM journal_lines GROUP BY account_code`
    );

    const lineMap = new Map();
    for (const l of lines) {
      lineMap.set(l.account_code, l);
    }

    const trialBalance = accounts.map(acc => {
      const summary = lineMap.get(acc.account_code) || { total_debit: 0, total_credit: 0 };
      return {
        account_code: acc.account_code,
        account_name: acc.account_name,
        account_type: acc.account_type,
        total_debit: parseFloat(summary.total_debit || 0),
        total_credit: parseFloat(summary.total_credit || 0),
        net_balance: parseFloat(summary.total_debit || 0) - parseFloat(summary.total_credit || 0)
      };
    });

    const totalDebit = trialBalance.reduce((sum, item) => sum + item.total_debit, 0);
    const totalCredit = trialBalance.reduce((sum, item) => sum + item.total_credit, 0);

    return {
      accounts: trialBalance,
      totals: {
        total_debit: totalDebit,
        total_credit: totalCredit,
        is_balanced: Math.abs(totalDebit - totalCredit) < 0.01
      }
    };
  }
}
