import { LedgerRepository } from './ledger.repository.js';
import { validateDoubleEntry } from '../../shared/accounting-engine/accountingEngine.js';
import { EodService } from '../eod/eod.service.js';

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
  if (ref_type !== 'EOD_VARIANCE_ADJUSTMENT') {
    await EodService.assertEodNotLocked(conn, branch, entry_date);
  }
  const { totalDebit } = validateDoubleEntry(lines);
  if (totalDebit <= 0) {
    const err = new Error('Voucher total amount must be greater than zero.');
    err.statusCode = 400;
    throw err;
  }

  const finalRefType = ref_type || (voucher_type === 'CONTRA' ? 'CONTRA' : null);
  const finalBranch = branch || null;

  const voucherNo = voucherData.voucher_no || `VOU-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
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
      finalRefType,
      ref_id || null,
      finalBranch,
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

  static async createAccount(db, data) {
    return LedgerRepository.createAccount(db, data);
  }

  static async updateAccount(db, account_code, data) {
    return LedgerRepository.updateAccount(db, account_code, data);
  }

  static async deleteAccount(db, account_code) {
    return LedgerRepository.deleteAccount(db, account_code);
  }

  static async getJournalEntries(db, filters) {
    return LedgerRepository.findEntries(db, filters);
  }

  static async postVoucher(db, voucherData) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const result = await insertVoucherOnConnection(conn, voucherData);

      if (voucherData.expense_category_id && voucherData.lines) {
        const expenseLine = voucherData.lines.find(l => Number(l.debit) > 0);
        if (expenseLine) {
          const amount = Number(expenseLine.debit);
          const [catRows] = await conn.query(
            `SELECT balance, name FROM expense_categories WHERE id = ? FOR UPDATE`,
            [voucherData.expense_category_id]
          );

          if (!catRows.length || Number(catRows[0].balance) < amount) {
            const err = new Error('there is no enough money for this expense category please topup');
            err.statusCode = 400;
            throw err;
          }

          await conn.query(
            `UPDATE expense_categories SET balance = balance - ? WHERE id = ?`,
            [amount, voucherData.expense_category_id]
          );
        }
      }

      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // Undoes a wrongly-posted voucher (e.g. a Cash Payment entered when a Cash
  // Receipt was meant) by posting a mirror-image reversal — every line's
  // debit and credit swapped — rather than deleting the original. Deleting
  // would leave a gap in the voucher_no sequence and destroy the audit trail
  // of what was actually entered; a reversal is the standard accounting fix
  // and matches how this app already reverts loan/RD/FD collections.
  //
  // "Already reverted" is tracked via the existing ref_type/ref_id columns
  // (ref_type='VOUCHER_REVERSAL', ref_id=<original id>) rather than a new
  // schema column, so this needs no migration. Restricted to manual vouchers
  // (is_auto=0) — an auto-posted voucher (loan collection, FD/RD transaction,
  // ...) is tied to a real business record with its own dedicated revert flow
  // that also fixes non-ledger state (loan balances, installment status,
  // etc.); reverting only its ledger side here would desync the two.
  static async revertVoucher(db, id, reason, revertedBy) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [entryRows] = await conn.query(`SELECT * FROM journal_entries WHERE id = ? FOR UPDATE`, [id]);
      if (!entryRows.length) {
        const err = new Error('Voucher not found.');
        err.statusCode = 404;
        throw err;
      }
      const original = entryRows[0];

      if (original.is_auto) {
        const err = new Error('This voucher was posted automatically by another module (a loan/FD/RD transaction) and must be reverted from there, not from Manual Vouchers.');
        err.statusCode = 400;
        throw err;
      }
      if (original.ref_type === 'VOUCHER_REVERSAL') {
        const err = new Error('This is itself a reversal voucher and cannot be reverted again.');
        err.statusCode = 400;
        throw err;
      }

      const [alreadyReverted] = await conn.query(
        `SELECT id FROM journal_entries WHERE ref_type = 'VOUCHER_REVERSAL' AND ref_id = ?`,
        [id]
      );
      if (alreadyReverted.length) {
        const err = new Error('This voucher has already been reverted.');
        err.statusCode = 409;
        throw err;
      }

      const [originalLines] = await conn.query(`SELECT * FROM journal_lines WHERE journal_entry_id = ?`, [id]);
      const reversedLines = originalLines.map(l => ({
        account_code: l.account_code,
        account_name: l.account_name,
        debit: Number(l.credit) || 0,
        credit: Number(l.debit) || 0
      }));

      const reversal = await insertVoucherOnConnection(conn, {
        entry_date: new Date().toISOString().slice(0, 10),
        description: `Reversal of voucher ${original.voucher_no}${reason ? ` — ${reason}` : ''}`,
        voucher_type: original.voucher_type,
        is_auto: true,
        ref_type: 'VOUCHER_REVERSAL',
        ref_id: id,
        branch: original.branch,
        created_by: revertedBy || null,
        lines: reversedLines
      });

      await conn.commit();
      return reversal;
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

  static async getAccountBalances(db, { branch } = {}) {
    const [accounts] = await db.query(
      `SELECT id, account_code, account_name, account_type, category, balance FROM chart_of_accounts WHERE is_active = 1`
    );

    let sql = `
      SELECT jl.account_code,
             COALESCE(SUM(jl.debit), 0) as total_debit,
             COALESCE(SUM(jl.credit), 0) as total_credit
      FROM journal_lines jl
      JOIN journal_entries je ON jl.journal_entry_id = je.id
      WHERE 1=1
    `;
    const params = [];
    if (branch && branch !== 'ALL') {
      sql += ` AND (je.branch = ? OR je.branch IS NULL OR ? = '')`;
      params.push(branch, branch);
    }
    sql += ` GROUP BY jl.account_code`;

    const [lines] = await db.query(sql, params);
    const lineMap = new Map();
    for (const l of lines) {
      lineMap.set(l.account_code, l);
    }

    return accounts.map(acc => {
      const summary = lineMap.get(acc.account_code) || { total_debit: 0, total_credit: 0 };
      const openingBal = parseFloat(acc.balance || 0);
      const isDebitNormal = acc.account_type === 'ASSET' || acc.account_type === 'EXPENSE';
      const debit = parseFloat(summary.total_debit || 0);
      const credit = parseFloat(summary.total_credit || 0);
      const currentBalance = isDebitNormal
        ? (openingBal + debit - credit)
        : (openingBal + credit - debit);

      return {
        account_code: acc.account_code,
        account_name: acc.account_name,
        account_type: acc.account_type,
        category: acc.category,
        opening_balance: openingBal,
        total_debit: debit,
        total_credit: credit,
        available_balance: Math.round(currentBalance * 100) / 100
      };
    });
  }

  static async getAccountBalance(connOrDb, accountCode, { branch } = {}) {
    const [accRows] = await connOrDb.query(
      `SELECT account_code, account_name, account_type, category, balance FROM chart_of_accounts WHERE account_code = ?`,
      [accountCode]
    );
    if (!accRows.length) return null;
    const acc = accRows[0];

    let sql = `
      SELECT COALESCE(SUM(jl.debit), 0) as total_debit,
             COALESCE(SUM(jl.credit), 0) as total_credit
      FROM journal_lines jl
      JOIN journal_entries je ON jl.journal_entry_id = je.id
      WHERE jl.account_code = ?
    `;
    const params = [accountCode];
    if (branch && branch !== 'ALL') {
      sql += ` AND (je.branch = ? OR je.branch IS NULL OR ? = '')`;
      params.push(branch, branch);
    }
    const [lines] = await connOrDb.query(sql, params);
    const summary = lines[0] || { total_debit: 0, total_credit: 0 };
    const openingBal = parseFloat(acc.balance || 0);
    const debit = parseFloat(summary.total_debit || 0);
    const credit = parseFloat(summary.total_credit || 0);
    const isDebitNormal = acc.account_type === 'ASSET' || acc.account_type === 'EXPENSE';
    const currentBalance = isDebitNormal
      ? (openingBal + debit - credit)
      : (openingBal + credit - debit);

    return {
      account_code: acc.account_code,
      account_name: acc.account_name,
      account_type: acc.account_type,
      category: acc.category,
      opening_balance: openingBal,
      total_debit: debit,
      total_credit: credit,
      available_balance: Math.round(currentBalance * 100) / 100
    };
  }
}
