/**
 * Financial Year Engine Service
 * Location: server/src/finance/fy/fy.service.js
 *
 * Implements Financial Year (1 April - 31 March) lifecycle management, period locking,
 * subledger-to-GL pre-closing parity auditing, immutable year-end snapshotting,
 * double-entry P&L nominal account closing, and balance sheet carry-forward.
 */

import { insertVoucherOnConnection } from '../ledger/ledger.service.js';

export class FyService {
  /**
   * List all financial years with summary statistics
   */
  static async listFinancialYears(db) {
    const [years] = await db.query(
      `SELECT fy.*,
              (SELECT COUNT(*) FROM journal_entries WHERE financial_year_id = fy.id) as journal_count,
              (SELECT COUNT(*) FROM collections WHERE financial_year_id = fy.id) as collection_count,
              (SELECT COUNT(*) FROM loan_yearly_balances WHERE financial_year_id = fy.id) as loan_snapshot_count
       FROM financial_years fy
       ORDER BY fy.start_date DESC`
    );
    return years;
  }

  /**
   * Get a single financial year by ID
   */
  static async getFinancialYearById(db, id) {
    const [rows] = await db.query(`SELECT * FROM financial_years WHERE id = ?`, [id]);
    if (!rows.length) {
      const err = new Error('Financial year not found.');
      err.statusCode = 404;
      throw err;
    }
    return rows[0];
  }

  /**
   * Get the currently active financial year
   */
  static async getActiveFinancialYear(db) {
    const [rows] = await db.query(`SELECT * FROM financial_years WHERE is_current = 1 LIMIT 1`);
    if (rows.length) return rows[0];
    const [fallback] = await db.query(`SELECT * FROM financial_years WHERE status = 'ACTIVE' ORDER BY start_date DESC LIMIT 1`);
    return fallback[0] || null;
  }

  /**
   * Resolves the financial year ID for a given calendar date (YYYY-MM-DD)
   */
  static async resolveFinancialYear(db, dateStr) {
    if (!dateStr) return null;
    const targetDate = String(dateStr).slice(0, 10);
    const [rows] = await db.query(
      `SELECT id, code, status FROM financial_years WHERE ? BETWEEN start_date AND end_date LIMIT 1`,
      [targetDate]
    );
    if (rows.length) return rows[0];

    // If date does not match an existing FY, auto-derive the canonical Indian FY code
    const d = new Date(targetDate);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const startYear = month >= 4 ? year : year - 1;
    const code = `FY ${startYear}-${String(startYear + 1).slice(-2)}`;
    const startDate = `${startYear}-04-01`;
    const endDate = `${startYear + 1}-03-31`;

    const [ins] = await db.query(
      `INSERT INTO financial_years (code, start_date, end_date, status, is_current)
       VALUES (?, ?, ?, 'ACTIVE', 0)
       ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
      [code, startDate, endDate]
    );

    return { id: ins.insertId, code, status: 'ACTIVE' };
  }

  /**
   * Period Lock Guard: Verifies that the given date is in an open/writable period.
   * Throws HTTP 403 if the financial year is CLOSED or SOFT_LOCKED.
   */
  static async assertPeriodNotLocked(connOrDb, dateStr, user = null) {
    if (!dateStr) return;
    const targetDate = String(dateStr).slice(0, 10);
    const [rows] = await connOrDb.query(
      `SELECT id, code, status, start_date, end_date FROM financial_years WHERE ? BETWEEN start_date AND end_date LIMIT 1`,
      [targetDate]
    );
    if (!rows.length) return;

    const fy = rows[0];
    if (fy.status === 'CLOSED') {
      const err = new Error(
        `Financial Year ${fy.code} (${fy.start_date} to ${fy.end_date}) is permanently CLOSED. No transactions, collections, or modifications are permitted in closed periods.`
      );
      err.statusCode = 403;
      throw err;
    }

    if (fy.status === 'SOFT_LOCKED') {
      const role = (user?.role || '').toUpperCase();
      const isSuperOrAdmin = role === 'COMPANY_ADMIN' || role === 'SUPER_ADMIN' || role === 'ADMIN';
      if (!isSuperOrAdmin) {
        const err = new Error(
          `Financial Year ${fy.code} is currently SOFT_LOCKED for year-end audit & reconciliation. Standard transaction entry is temporarily paused.`
        );
        err.statusCode = 403;
        throw err;
      }
    }
  }

  /**
   * Pre-Closing Integrity & Reconciliation Auditor
   * Verifies Trial Balance equilibrium, Subledger-to-GL parity, uncleared queues, and P&L breakdown.
   */
  static async verifyPreClosingIntegrity(db, fyId) {
    const fy = await FyService.getFinancialYearById(db, fyId);
    const issues = [];
    const checks = {};

    // 1. Trial Balance Equilibrium for this FY
    const [tbRows] = await db.query(
      `SELECT COALESCE(SUM(jl.debit), 0) as total_debit,
              COALESCE(SUM(jl.credit), 0) as total_credit
       FROM journal_lines jl
       JOIN journal_entries je ON jl.journal_entry_id = je.id
       WHERE je.entry_date BETWEEN ? AND ?`,
      [fy.start_date, fy.end_date]
    );
    const totalDebit = parseFloat(tbRows[0]?.total_debit || 0);
    const totalCredit = parseFloat(tbRows[0]?.total_credit || 0);
    const tbVariance = Math.round(Math.abs(totalDebit - totalCredit) * 100) / 100;
    const tbBalanced = tbVariance < 0.01;

    checks.trialBalance = {
      totalDebit,
      totalCredit,
      variance: tbVariance,
      passed: tbBalanced
    };
    if (!tbBalanced) {
      issues.push(`Trial Balance is not in equilibrium (Debit: ₹${totalDebit.toLocaleString('en-IN')}, Credit: ₹${totalCredit.toLocaleString('en-IN')}, Variance: ₹${tbVariance}).`);
    }

    // 2. Active Loan Subledger vs GL Account 1100 (Loan Portfolio)
    const [loanSubRows] = await db.query(
      `SELECT COALESCE(SUM(pending_amount), 0) as total_pending,
              COUNT(*) as active_count
       FROM loans
       WHERE status IN ('ACTIVE', 'OVERDUE')
       AND loan_date <= ?`,
      [fy.end_date]
    );
    const loanSubledgerPrincipal = parseFloat(loanSubRows[0]?.total_pending || 0);
    const activeLoanCount = parseInt(loanSubRows[0]?.active_count || 0, 10);

    const [gl1100Rows] = await db.query(
      `SELECT COALESCE(SUM(jl.debit - jl.credit), 0) as gl_balance
       FROM journal_lines jl
       JOIN journal_entries je ON jl.journal_entry_id = je.id
       WHERE jl.account_code = '1100'
       AND je.entry_date BETWEEN ? AND ?`,
      [fy.start_date, fy.end_date]
    );
    const gl1100Balance = parseFloat(gl1100Rows[0]?.gl_balance || 0);
    const loanVariance = Math.round(Math.abs(loanSubledgerPrincipal - gl1100Balance) * 100) / 100;
    const loanParityPassed = loanVariance < 0.01;

    checks.loanParity = {
      subledgerPrincipal: loanSubledgerPrincipal,
      gl1100Balance,
      variance: loanVariance,
      activeLoanCount,
      passed: loanParityPassed
    };
    if (!loanParityPassed) {
      issues.push(`Loan Subledger (₹${loanSubledgerPrincipal.toLocaleString('en-IN')}) does not match GL Account 1100 (₹${gl1100Balance.toLocaleString('en-IN')}). Variance: ₹${loanVariance}.`);
    }

    // 3. Fixed Deposits Subledger vs GL Account 2200
    const [fdSubRows] = await db.query(
      `SELECT COALESCE(SUM(principal_amount), 0) as total_fd
       FROM fixed_deposits
       WHERE status = 'ACTIVE'
       AND booking_date <= ?`,
      [fy.end_date]
    );
    const fdSubledgerTotal = parseFloat(fdSubRows[0]?.total_fd || 0);

    const [gl2200Rows] = await db.query(
      `SELECT COALESCE(SUM(jl.credit - jl.debit), 0) as gl_balance
       FROM journal_lines jl
       JOIN journal_entries je ON jl.journal_entry_id = je.id
       WHERE jl.account_code = '2200'
       AND je.entry_date BETWEEN ? AND ?`,
      [fy.start_date, fy.end_date]
    );
    const gl2200Balance = parseFloat(gl2200Rows[0]?.gl_balance || 0);
    const fdVariance = Math.round(Math.abs(fdSubledgerTotal - gl2200Balance) * 100) / 100;
    const fdParityPassed = fdVariance < 0.01;

    checks.fdParity = {
      subledgerTotal: fdSubledgerTotal,
      gl2200Balance,
      variance: fdVariance,
      passed: fdParityPassed
    };
    if (!fdParityPassed) {
      issues.push(`Fixed Deposit Subledger (₹${fdSubledgerTotal.toLocaleString('en-IN')}) does not match GL Account 2200 (₹${gl2200Balance.toLocaleString('en-IN')}). Variance: ₹${fdVariance}.`);
    }

    // 4. Recurring Deposits Subledger vs GL Account 2201
    const [rdSubRows] = await db.query(
      `SELECT COALESCE(SUM(collected_amount), 0) as total_rd
       FROM recurring_deposits
       WHERE status = 'ACTIVE'
       AND booking_date <= ?`,
      [fy.end_date]
    );
    const rdSubledgerTotal = parseFloat(rdSubRows[0]?.total_rd || 0);

    const [gl2201Rows] = await db.query(
      `SELECT COALESCE(SUM(jl.credit - jl.debit), 0) as gl_balance
       FROM journal_lines jl
       JOIN journal_entries je ON jl.journal_entry_id = je.id
       WHERE jl.account_code = '2201'
       AND je.entry_date BETWEEN ? AND ?`,
      [fy.start_date, fy.end_date]
    );
    const gl2201Balance = parseFloat(gl2201Rows[0]?.gl_balance || 0);
    const rdVariance = Math.round(Math.abs(rdSubledgerTotal - gl2201Balance) * 100) / 100;
    const rdParityPassed = rdVariance < 0.01;

    checks.rdParity = {
      subledgerTotal: rdSubledgerTotal,
      gl2201Balance,
      variance: rdVariance,
      passed: rdParityPassed
    };
    if (!rdParityPassed) {
      issues.push(`Recurring Deposit Subledger (₹${rdSubledgerTotal.toLocaleString('en-IN')}) does not match GL Account 2201 (₹${gl2201Balance.toLocaleString('en-IN')}). Variance: ₹${rdVariance}.`);
    }

    // 5. Uncleared Cheques & Pending Waivers Queue
    const [unclearedRows] = await db.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount
       FROM collections
       WHERE clearance_status = 'PENDING_CLEARANCE'
       AND collection_date <= ?
       AND reverted = 0`,
      [fy.end_date]
    );
    const unclearedChequesCount = parseInt(unclearedRows[0]?.count || 0, 10);
    const unclearedChequesAmount = parseFloat(unclearedRows[0]?.total_amount || 0);

    const [pendingWaiversRows] = await db.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(interest_waiver), 0) as total_waiver
       FROM collections
       WHERE waiver_status = 'PENDING_APPROVAL'
       AND collection_date <= ?
       AND reverted = 0`,
      [fy.end_date]
    );
    const pendingWaiversCount = parseInt(pendingWaiversRows[0]?.count || 0, 10);

    checks.clearingQueue = {
      unclearedChequesCount,
      unclearedChequesAmount,
      pendingWaiversCount,
      passed: unclearedChequesCount === 0 && pendingWaiversCount === 0
    };
    if (unclearedChequesCount > 0) {
      issues.push(`${unclearedChequesCount} cheque(s) totaling ₹${unclearedChequesAmount.toLocaleString('en-IN')} are pending clearance.`);
    }
    if (pendingWaiversCount > 0) {
      issues.push(`${pendingWaiversCount} interest waiver(s) are pending approval.`);
    }

    // 6. P&L Nominal Breakdown for this FY (Revenue: 4000s, Expenses: 5000s)
    const [nominalRows] = await db.query(
      `SELECT coa.account_code, coa.account_name, coa.account_type, coa.category,
              COALESCE(SUM(jl.debit), 0) as total_debit,
              COALESCE(SUM(jl.credit), 0) as total_credit
       FROM chart_of_accounts coa
       LEFT JOIN journal_lines jl ON coa.account_code = jl.account_code
       LEFT JOIN journal_entries je ON jl.journal_entry_id = je.id AND je.entry_date BETWEEN ? AND ?
       WHERE coa.account_type IN ('REVENUE', 'EXPENSE')
       GROUP BY coa.account_code`,
      [fy.start_date, fy.end_date]
    );

    let totalRevenue = 0;
    let totalExpense = 0;
    const revenueAccounts = [];
    const expenseAccounts = [];

    for (const r of nominalRows) {
      const dr = parseFloat(r.total_debit || 0);
      const cr = parseFloat(r.total_credit || 0);
      if (r.account_type === 'REVENUE') {
        const netRev = Math.max(0, cr - dr);
        totalRevenue += netRev;
        if (netRev > 0) revenueAccounts.push({ ...r, net_amount: netRev });
      } else {
        const netExp = Math.max(0, dr - cr);
        totalExpense += netExp;
        if (netExp > 0) expenseAccounts.push({ ...r, net_amount: netExp });
      }
    }

    const netProfit = Math.round((totalRevenue - totalExpense) * 100) / 100;
    checks.pnlSummary = {
      totalRevenue,
      totalExpense,
      netProfit,
      revenueAccounts,
      expenseAccounts
    };

    return {
      financialYear: fy,
      isReadyToClose: issues.length === 0,
      issues,
      checks
    };
  }

  /**
   * Executes Year-End Closing atomically with a distributed lock and transactional safety.
   */
  static async executeYearEndClosing(db, fyId, payload, user) {
    const conn = await db.getConnection();
    let lockAcquired = false;

    try {
      // 1. Distributed Lock to prevent duplicate/concurrent closing attempts
      const [lockRes] = await conn.query(`SELECT GET_LOCK(?, 10) as acquired`, [`fy_closing_lock_${fyId}`]);
      if (!lockRes[0]?.acquired) {
        const err = new Error('Another administrator is currently closing this financial year. Please wait.');
        err.statusCode = 409;
        throw err;
      }
      lockAcquired = true;

      await conn.beginTransaction();

      // 2. Load and verify target Financial Year
      const [fyRows] = await conn.query(`SELECT * FROM financial_years WHERE id = ? FOR UPDATE`, [fyId]);
      if (!fyRows.length) {
        const err = new Error('Financial year not found.');
        err.statusCode = 404;
        throw err;
      }
      const fy = fyRows[0];
      if (fy.status === 'CLOSED') {
        const err = new Error(`Financial Year ${fy.code} is already CLOSED.`);
        err.statusCode = 400;
        throw err;
      }

      // 3. Pre-Closing Integrity Verification Check
      const integrity = await FyService.verifyPreClosingIntegrity(conn, fyId);
      if (!integrity.isReadyToClose) {
        const err = new Error(`Year-end closing blocked due to ${integrity.issues.length} audit issue(s): ${integrity.issues.join('; ')}`);
        err.statusCode = 409;
        err.issues = integrity.issues;
        throw err;
      }

      const pnl = integrity.checks.pnlSummary;

      // 4. Generate Double-Entry P&L Closing Journal Entry (31 March)
      // Debit all Revenue accounts, Credit all Expense accounts, balance into 3005 Retained Earnings
      const closingVoucherLines = [];
      for (const rev of pnl.revenueAccounts) {
        closingVoucherLines.push({
          account_code: rev.account_code,
          account_name: rev.account_name,
          debit: rev.net_amount,
          credit: 0,
          description: `Year-end closing of ${rev.account_name}`
        });
      }
      for (const exp of pnl.expenseAccounts) {
        closingVoucherLines.push({
          account_code: exp.account_code,
          account_name: exp.account_name,
          debit: 0,
          credit: exp.net_amount,
          description: `Year-end closing of ${exp.account_name}`
        });
      }

      if (pnl.netProfit > 0) {
        // Profit: Credit Retained Earnings
        closingVoucherLines.push({
          account_code: '3005',
          account_name: 'Retained Earnings / Reserve Fund',
          debit: 0,
          credit: pnl.netProfit,
          description: `Net Profit for ${fy.code} transferred to Reserves`
        });
      } else if (pnl.netProfit < 0) {
        // Loss: Debit Retained Earnings
        closingVoucherLines.push({
          account_code: '3005',
          account_name: 'Retained Earnings / Reserve Fund',
          debit: Math.abs(pnl.netProfit),
          credit: 0,
          description: `Net Loss for ${fy.code} absorbed by Reserves`
        });
      }

      let plVoucherNo = null;
      if (closingVoucherLines.length >= 2) {
        const plVoucher = await insertVoucherOnConnection(conn, {
          entry_date: fy.end_date,
          description: `P&L Year-End Closing for ${fy.code}`,
          voucher_type: 'JOURNAL',
          is_auto: true,
          ref_type: 'PERIOD_CLOSING',
          ref_id: fy.id,
          created_by: user?.name || user?.email || 'System Admin',
          lines: closingVoucherLines
        });
        plVoucherNo = plVoucher.voucher_no;

        // Tag the voucher with the closing financial_year_id
        await conn.query(`UPDATE journal_entries SET financial_year_id = ? WHERE id = ?`, [fy.id, plVoucher.id]);
      }

      // 5. Generate Immutable Year-End Snapshots for all Loans
      const [allLoans] = await conn.query(
        `SELECT l.*,
                COALESCE((SELECT SUM(amount) FROM collections WHERE loan_id = l.id AND collection_date BETWEEN ? AND ? AND reverted = 0), 0) as year_collected,
                COALESCE((SELECT SUM(principal_paid) FROM collections WHERE loan_id = l.id AND collection_date BETWEEN ? AND ? AND reverted = 0), 0) as year_principal_collected,
                COALESCE((SELECT SUM(interest_paid) FROM collections WHERE loan_id = l.id AND collection_date BETWEEN ? AND ? AND reverted = 0), 0) as year_interest_collected,
                COALESCE((SELECT SUM(penalty) FROM collections WHERE loan_id = l.id AND collection_date BETWEEN ? AND ? AND reverted = 0), 0) as year_penalty_collected,
                COALESCE((SELECT SUM(interest_waiver) FROM collections WHERE loan_id = l.id AND collection_date BETWEEN ? AND ? AND reverted = 0), 0) as year_waivers
         FROM loans l
         WHERE l.loan_date <= ?`,
        [fy.start_date, fy.end_date, fy.start_date, fy.end_date, fy.start_date, fy.end_date, fy.start_date, fy.end_date, fy.start_date, fy.end_date, fy.end_date]
      );

      for (const l of allLoans) {
        const closingPrincipal = parseFloat(l.pending_amount || 0);
        const closingArrears = parseFloat(l.pending_interest_arrears || 0);
        const closingStatus = l.status === 'CLOSED' ? 'CLOSED' : (l.status === 'OVERDUE' ? 'OVERDUE' : 'ACTIVE');

        await conn.query(
          `INSERT INTO loan_yearly_balances (
            loan_id, financial_year_id, borrower_id, loan_account_no,
            opening_principal, principal_collected, interest_collected, penalty_collected, waivers_given,
            closing_principal, closing_interest_arrears, closing_total_outstanding, closing_status, snapshot_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            closing_principal = VALUES(closing_principal),
            closing_interest_arrears = VALUES(closing_interest_arrears),
            closing_total_outstanding = VALUES(closing_total_outstanding),
            closing_status = VALUES(closing_status)`,
          [
            l.id,
            fy.id,
            l.borrower_id || 0,
            l.loan_account_no,
            parseFloat(l.principal_amount || 0),
            parseFloat(l.year_principal_collected || 0),
            parseFloat(l.year_interest_collected || 0),
            parseFloat(l.year_penalty_collected || 0),
            parseFloat(l.year_waivers || 0),
            closingPrincipal,
            closingArrears,
            closingPrincipal + closingArrears,
            closingStatus,
            fy.end_date
          ]
        );
      }

      // 6. Generate Immutable Year-End Snapshots for Fixed Deposits & Recurring Deposits
      const [allFds] = await conn.query(`SELECT * FROM fixed_deposits WHERE booking_date <= ?`, [fy.end_date]);
      for (const fd of allFds) {
        await conn.query(
          `INSERT INTO deposit_yearly_balances (
            deposit_type, deposit_id, financial_year_id, account_no,
            opening_principal, closing_principal, closing_status, snapshot_date
          ) VALUES ('FIXED_DEPOSIT', ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE closing_principal = VALUES(closing_principal), closing_status = VALUES(closing_status)`,
          [fd.id, fy.id, fd.fd_account_no, parseFloat(fd.principal_amount), parseFloat(fd.principal_amount), fd.status, fy.end_date]
        );
      }

      const [allRds] = await conn.query(`SELECT * FROM recurring_deposits WHERE booking_date <= ?`, [fy.end_date]);
      for (const rd of allRds) {
        await conn.query(
          `INSERT INTO deposit_yearly_balances (
            deposit_type, deposit_id, financial_year_id, account_no,
            opening_principal, closing_principal, closing_status, snapshot_date
          ) VALUES ('RECURRING_DEPOSIT', ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE closing_principal = VALUES(closing_principal), closing_status = VALUES(closing_status)`,
          [rd.id, fy.id, rd.rd_account_no, parseFloat(rd.monthly_installment), parseFloat(rd.collected_amount), rd.status, fy.end_date]
        );
      }

      // 7. Mark Old Financial Year as CLOSED
      await conn.query(
        `UPDATE financial_years
         SET status = 'CLOSED',
             is_current = 0,
             closed_by_user_id = ?,
             closed_by_name = ?,
             closed_at = NOW(),
             closing_notes = ?
         WHERE id = ?`,
        [user?.id || null, user?.name || user?.email || 'Admin', payload.notes || 'Normal Year-End Close', fy.id]
      );

      // 8. Provision and Activate Next Financial Year (e.g. FY 2026-27 starting 01 April)
      const prevEnd = new Date(fy.end_date);
      const nextStart = new Date(prevEnd);
      nextStart.setDate(nextStart.getDate() + 1); // 01 April
      const nextEnd = new Date(nextStart);
      nextEnd.setFullYear(nextEnd.getFullYear() + 1);
      nextEnd.setDate(nextEnd.getDate() - 1); // 31 March next year

      const nextStartStr = nextStart.toISOString().slice(0, 10);
      const nextEndStr = nextEnd.toISOString().slice(0, 10);
      const nextYearCode = `FY ${nextStart.getFullYear()}-${String(nextEnd.getFullYear()).slice(-2)}`;

      await conn.query(
        `INSERT INTO financial_years (code, start_date, end_date, status, is_current)
         VALUES (?, ?, ?, 'ACTIVE', 1)
         ON DUPLICATE KEY UPDATE status = 'ACTIVE', is_current = 1`,
        [nextYearCode, nextStartStr, nextEndStr]
      );

      const [[nextFy]] = await conn.query(`SELECT * FROM financial_years WHERE code = ?`, [nextYearCode]);

      // 9. Generate Opening Balance Journal Voucher for Real & Personal Accounts (01 April)
      const [bsAccounts] = await conn.query(
        `SELECT coa.account_code, coa.account_name, coa.account_type, coa.category,
                COALESCE(SUM(jl.debit), 0) as total_debit,
                COALESCE(SUM(jl.credit), 0) as total_credit
         FROM chart_of_accounts coa
         LEFT JOIN journal_lines jl ON coa.account_code = jl.account_code
         LEFT JOIN journal_entries je ON jl.journal_entry_id = je.id AND je.entry_date <= ?
         WHERE coa.account_type IN ('ASSET', 'LIABILITY', 'EQUITY')
         GROUP BY coa.account_code`,
        [fy.end_date]
      );

      const openingLines = [];
      for (const acc of bsAccounts) {
        const dr = parseFloat(acc.total_debit || 0);
        const cr = parseFloat(acc.total_credit || 0);
        if (acc.account_type === 'ASSET') {
          const bal = dr - cr;
          if (Math.abs(bal) > 0.01) {
            openingLines.push({
              account_code: acc.account_code,
              account_name: acc.account_name,
              debit: bal > 0 ? bal : 0,
              credit: bal < 0 ? Math.abs(bal) : 0,
              description: `Opening Balance for ${acc.account_name}`
            });
          }
        } else {
          // LIABILITY / EQUITY (normal credit balance)
          const bal = cr - dr;
          if (Math.abs(bal) > 0.01) {
            openingLines.push({
              account_code: acc.account_code,
              account_name: acc.account_name,
              debit: bal < 0 ? Math.abs(bal) : 0,
              credit: bal > 0 ? bal : 0,
              description: `Opening Balance for ${acc.account_name}`
            });
          }
        }
      }

      let openingVoucherNo = null;
      if (openingLines.length >= 2) {
        const openVoucher = await insertVoucherOnConnection(conn, {
          entry_date: nextStartStr,
          description: `Opening Balances for ${nextYearCode}`,
          voucher_type: 'JOURNAL',
          is_auto: true,
          ref_type: 'OPENING_BALANCE',
          ref_id: nextFy.id,
          created_by: user?.name || user?.email || 'System Admin',
          lines: openingLines
        });
        openingVoucherNo = openVoucher.voucher_no;
        await conn.query(`UPDATE journal_entries SET financial_year_id = ? WHERE id = ?`, [nextFy.id, openVoucher.id]);
      }

      // 10. Audit Log Record
      await conn.query(
        `INSERT INTO financial_year_audit_logs (financial_year_id, action_type, performed_by_user_id, performed_by_name, notes)
         VALUES (?, 'HARD_CLOSED', ?, ?, ?)`,
        [fy.id, user?.id || null, user?.name || user?.email || 'Admin', `Closed ${fy.code}, transitioned to ${nextYearCode}. PL Voucher: ${plVoucherNo}, Opening Voucher: ${openingVoucherNo}`]
      );

      await conn.commit();

      return {
        success: true,
        closedYear: fy.code,
        newYear: nextYearCode,
        plVoucherNo,
        openingVoucherNo,
        snapshotsCount: allLoans.length,
        netProfit: pnl.netProfit
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      if (lockAcquired) {
        await conn.query(`SELECT RELEASE_LOCK(?)`, [`fy_closing_lock_${fyId}`]);
      }
      conn.release();
    }
  }

  /**
   * Toggle Soft Lock on a Financial Year
   */
  static async toggleSoftLock(db, fyId, softLockState, user) {
    const status = softLockState ? 'SOFT_LOCKED' : 'ACTIVE';
    await db.query(`UPDATE financial_years SET status = ? WHERE id = ? AND status != 'CLOSED'`, [status, fyId]);
    await db.query(
      `INSERT INTO financial_year_audit_logs (financial_year_id, action_type, performed_by_user_id, performed_by_name, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [fyId, softLockState ? 'SOFT_LOCKED' : 'CREATED', user?.id || null, user?.name || user?.email || 'Admin', `Financial Year status changed to ${status}`]
    );
    return FyService.getFinancialYearById(db, fyId);
  }
}
