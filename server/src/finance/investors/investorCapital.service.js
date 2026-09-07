import { insertVoucherOnConnection, LedgerService } from '../ledger/ledger.service.js';

const PROFIT_CLEARING_ACCOUNT = '3002';
const PROFIT_CLEARING_ACCOUNT_NAME = 'Investor Profit Distribution';
const SHARE_CAPITAL_ACCOUNT = '3001';
const SHARE_CAPITAL_ACCOUNT_NAME = 'Promoter Share Capital';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function insertCapitalTxn(conn, { investorId, txnType, amount, balanceAfter, txnDate, refType, refId, journalEntryId, notes, createdBy }) {
  await conn.execute(
    `INSERT INTO investor_capital_transactions
      (investor_id, txn_type, amount, balance_after, txn_date, ref_type, ref_id, journal_entry_id, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [investorId, txnType, amount, balanceAfter, txnDate, refType || null, refId || null, journalEntryId || null, notes || null, createdBy || null]
  );
}

// Live ownership share % per active investor, based on current capital balances.
export async function getInvestorShareSnapshot(db) {
  const [rows] = await db.query(
    "SELECT id, investor_code, name, capital_amount FROM investors WHERE status = 'ACTIVE' AND deleted_at IS NULL ORDER BY capital_amount DESC"
  );
  const totalCapital = rows.reduce((sum, r) => sum + (Number(r.capital_amount) || 0), 0);
  return {
    total_capital: totalCapital,
    investors: rows.map(r => ({
      investor_id: r.id,
      investor_code: r.investor_code,
      name: r.name,
      capital_amount: Number(r.capital_amount) || 0,
      share_percent: totalCapital > 0 ? (Number(r.capital_amount) || 0) / totalCapital * 100 : 0
    }))
  };
}

// Ledger-derived hint only — never authoritative. Sums REVENUE minus EXPENSE
// journal_lines for the given month, mirroring the join shape used by
// LedgerService.getAccountBalances.
export async function getSuggestedMonthlyProfit(db, { periodMonth, branch } = {}) {
  if (!periodMonth || !/^\d{4}-\d{2}$/.test(periodMonth)) {
    const err = new Error('A valid period (YYYY-MM) is required.');
    err.statusCode = 400;
    throw err;
  }
  let sql = `
    SELECT coa.account_type, COALESCE(SUM(jl.debit),0) as total_debit, COALESCE(SUM(jl.credit),0) as total_credit
    FROM journal_lines jl
    JOIN journal_entries je ON jl.journal_entry_id = je.id
    JOIN chart_of_accounts coa ON coa.account_code = jl.account_code
    WHERE coa.account_type IN ('REVENUE','EXPENSE')
      AND DATE_FORMAT(je.entry_date, '%Y-%m') = ?
  `;
  const params = [periodMonth];
  if (branch && branch !== 'ALL') {
    sql += ` AND (je.branch = ? OR je.branch IS NULL OR ? = '')`;
    params.push(branch, branch);
  }
  sql += ' GROUP BY coa.account_type';

  const [rows] = await db.query(sql, params);
  let revenue = 0;
  let expense = 0;
  for (const r of rows) {
    if (r.account_type === 'REVENUE') revenue = Number(r.total_credit) - Number(r.total_debit);
    if (r.account_type === 'EXPENSE') expense = Number(r.total_debit) - Number(r.total_credit);
  }
  return Math.round((revenue - expense) * 100) / 100;
}

export async function listDistributions(db) {
  const [rows] = await db.query('SELECT * FROM investor_profit_distributions ORDER BY period_month DESC');
  return rows;
}

export async function getDistribution(db, distributionId) {
  const [headerRows] = await db.query('SELECT * FROM investor_profit_distributions WHERE id = ?', [distributionId]);
  if (!headerRows.length) {
    const err = new Error('Profit distribution not found.');
    err.statusCode = 404;
    throw err;
  }
  const [lines] = await db.query(
    `SELECT l.*, i.name as investor_name, i.investor_code
     FROM investor_profit_distribution_lines l
     JOIN investors i ON i.id = l.investor_id
     WHERE l.distribution_id = ? ORDER BY l.share_percent DESC`,
    [distributionId]
  );
  return { ...headerRows[0], lines };
}

export async function createProfitDistributionDraft(db, { periodMonth, totalProfitManual, branch } = {}, createdBy = null) {
  if (!periodMonth || !/^\d{4}-\d{2}$/.test(periodMonth)) {
    const err = new Error('A valid period (YYYY-MM) is required.');
    err.statusCode = 400;
    throw err;
  }
  const totalProfit = Number(totalProfitManual);
  if (!Number.isFinite(totalProfit) || totalProfit <= 0) {
    const err = new Error('Total distributable profit must be a positive amount.');
    err.statusCode = 400;
    throw err;
  }

  const [existing] = await db.query('SELECT id FROM investor_profit_distributions WHERE period_month = ?', [periodMonth]);
  if (existing.length) {
    const err = new Error(`A profit distribution for ${periodMonth} already exists.`);
    err.statusCode = 409;
    throw err;
  }

  const snapshot = await getInvestorShareSnapshot(db);
  if (!snapshot.investors.length || snapshot.total_capital <= 0) {
    const err = new Error('No active investor capital available to distribute profit against.');
    err.statusCode = 400;
    throw err;
  }
  const autoCalc = await getSuggestedMonthlyProfit(db, { periodMonth, branch });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [headerResult] = await conn.execute(
      `INSERT INTO investor_profit_distributions
        (period_month, total_profit_manual, total_profit_auto_calc, total_capital_snapshot, status, created_by)
       VALUES (?, ?, ?, ?, 'DRAFT', ?)`,
      [periodMonth, totalProfit, autoCalc, snapshot.total_capital, createdBy || 'Admin']
    );
    const distributionId = headerResult.insertId;

    for (const inv of snapshot.investors) {
      const profitAmount = Math.round(totalProfit * (inv.share_percent / 100) * 100) / 100;
      await conn.execute(
        `INSERT INTO investor_profit_distribution_lines
          (distribution_id, investor_id, opening_capital, share_percent, profit_amount, withdraw_amount, reinvest_amount)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [distributionId, inv.investor_id, inv.capital_amount, inv.share_percent, profitAmount, profitAmount]
      );
    }

    await conn.commit();
    return getDistribution(db, distributionId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function deleteProfitDistributionDraft(db, distributionId) {
  const [headerRows] = await db.query('SELECT * FROM investor_profit_distributions WHERE id = ?', [distributionId]);
  if (!headerRows.length) {
    const err = new Error('Profit distribution not found.');
    err.statusCode = 404;
    throw err;
  }
  if (headerRows[0].status === 'FINALIZED') {
    const err = new Error('A finalized profit distribution cannot be deleted.');
    err.statusCode = 400;
    throw err;
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM investor_profit_distribution_lines WHERE distribution_id = ?', [distributionId]);
    await conn.execute('DELETE FROM investor_profit_distributions WHERE id = ?', [distributionId]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function updateDistributionLineSplit(db, lineId, { withdrawAmount } = {}) {
  const [rows] = await db.query(
    `SELECT l.*, d.status as distribution_status
     FROM investor_profit_distribution_lines l
     JOIN investor_profit_distributions d ON d.id = l.distribution_id
     WHERE l.id = ?`,
    [lineId]
  );
  if (!rows.length) {
    const err = new Error('Distribution line not found.');
    err.statusCode = 404;
    throw err;
  }
  const line = rows[0];
  if (line.distribution_status === 'FINALIZED') {
    const err = new Error('This profit distribution has already been finalized and cannot be edited.');
    err.statusCode = 400;
    throw err;
  }
  const withdraw = Number(withdrawAmount);
  const profitAmount = Number(line.profit_amount);
  if (!Number.isFinite(withdraw) || withdraw < 0 || withdraw > profitAmount) {
    const err = new Error(`Withdraw amount must be between 0 and ${profitAmount}.`);
    err.statusCode = 400;
    throw err;
  }
  const reinvest = Math.round((profitAmount - withdraw) * 100) / 100;

  await db.execute(
    'UPDATE investor_profit_distribution_lines SET withdraw_amount = ?, reinvest_amount = ? WHERE id = ?',
    [withdraw, reinvest, lineId]
  );
  const [updated] = await db.query('SELECT * FROM investor_profit_distribution_lines WHERE id = ?', [lineId]);
  return updated[0];
}

export async function finalizeProfitDistribution(db, distributionId, createdBy = null) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [headerRows] = await conn.query('SELECT * FROM investor_profit_distributions WHERE id = ? FOR UPDATE', [distributionId]);
    if (!headerRows.length) {
      const err = new Error('Profit distribution not found.');
      err.statusCode = 404;
      throw err;
    }
    const header = headerRows[0];
    if (header.status === 'FINALIZED') {
      const err = new Error('This profit distribution has already been finalized.');
      err.statusCode = 400;
      throw err;
    }

    const [lines] = await conn.query(
      `SELECT l.*, i.name as investor_name, i.investor_code, i.capital_amount as current_capital
       FROM investor_profit_distribution_lines l
       JOIN investors i ON i.id = l.investor_id
       WHERE l.distribution_id = ? FOR UPDATE`,
      [distributionId]
    );

    const txnDate = todayStr();

    for (const line of lines) {
      const profitAmount = Number(line.profit_amount);
      const withdrawAmount = Number(line.withdraw_amount) || 0;
      const reinvestAmount = Number(line.reinvest_amount) || 0;
      const currentCapital = Number(line.current_capital) || 0;

      if (profitAmount <= 0) continue;

      const voucherLines = [
        { account_code: PROFIT_CLEARING_ACCOUNT, account_name: PROFIT_CLEARING_ACCOUNT_NAME, debit: profitAmount, credit: 0, description: `Profit Share for ${line.investor_name} (${header.period_month})` }
      ];
      if (reinvestAmount > 0) {
        voucherLines.push({ account_code: SHARE_CAPITAL_ACCOUNT, account_name: SHARE_CAPITAL_ACCOUNT_NAME, debit: 0, credit: reinvestAmount, description: `Profit Reinvested - ${line.investor_name}` });
      }
      if (withdrawAmount > 0) {
        voucherLines.push({ account_code: '1002', account_name: 'Bank Account', debit: 0, credit: withdrawAmount, description: `Profit Payout - ${line.investor_name}` });
      }

      const voucher = await insertVoucherOnConnection(conn, {
        entry_date: txnDate,
        description: `Monthly Profit Distribution (${header.period_month}) — ${line.investor_name} (${line.investor_code})`,
        voucher_type: 'JOURNAL',
        is_auto: true,
        ref_type: 'PROFIT_DISTRIBUTION',
        ref_id: line.id,
        branch: 'Main Branch',
        created_by: createdBy || 'Admin',
        lines: voucherLines
      });

      await insertCapitalTxn(conn, {
        investorId: line.investor_id,
        txnType: 'PROFIT_CREDIT',
        amount: profitAmount,
        balanceAfter: currentCapital,
        txnDate,
        refType: 'PROFIT_DISTRIBUTION',
        refId: header.id,
        journalEntryId: voucher.id,
        notes: `Monthly profit share for ${header.period_month} (${line.share_percent}% share)`,
        createdBy: createdBy || 'Admin'
      });

      let runningCapital = currentCapital;
      if (reinvestAmount > 0) {
        runningCapital = Math.round((currentCapital + reinvestAmount) * 100) / 100;
        await conn.execute('UPDATE investors SET capital_amount = ? WHERE id = ?', [runningCapital, line.investor_id]);
        await insertCapitalTxn(conn, {
          investorId: line.investor_id,
          txnType: 'PROFIT_REINVEST',
          amount: reinvestAmount,
          balanceAfter: runningCapital,
          txnDate,
          refType: 'PROFIT_DISTRIBUTION',
          refId: header.id,
          journalEntryId: voucher.id,
          notes: `Reinvested from ${header.period_month} profit share`,
          createdBy: createdBy || 'Admin'
        });
      }
      if (withdrawAmount > 0) {
        await insertCapitalTxn(conn, {
          investorId: line.investor_id,
          txnType: 'PROFIT_WITHDRAWAL',
          amount: withdrawAmount,
          balanceAfter: runningCapital,
          txnDate,
          refType: 'PROFIT_DISTRIBUTION',
          refId: header.id,
          journalEntryId: voucher.id,
          notes: `Withdrawn from ${header.period_month} profit share`,
          createdBy: createdBy || 'Admin'
        });
      }

      await conn.execute('UPDATE investor_profit_distribution_lines SET settled = 1, settled_at = NOW() WHERE id = ?', [line.id]);
    }

    await conn.execute("UPDATE investor_profit_distributions SET status = 'FINALIZED', finalized_at = NOW() WHERE id = ?", [distributionId]);

    await conn.commit();
    return getDistribution(db, distributionId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ── Capital Withdrawal (reduces principal — separate from a profit withdrawal) ──
// Admin-only to initiate (enforced in the route/controller), requires every
// active investor's approval, and only executes once company cash is
// sufficient — otherwise it parks in APPROVED_WAITING_FUNDS.

export async function listCapitalWithdrawalRequests(db, { investorId, status } = {}) {
  let sql = `
    SELECT r.*, i.name as investor_name, i.investor_code
    FROM investor_capital_withdrawal_requests r
    JOIN investors i ON i.id = r.investor_id
    WHERE 1=1
  `;
  const params = [];
  if (investorId) { sql += ' AND r.investor_id = ?'; params.push(investorId); }
  if (status) { sql += ' AND r.status = ?'; params.push(status); }
  sql += ' ORDER BY r.requested_at DESC';
  const [rows] = await db.query(sql, params);
  return rows;
}

export async function getCapitalWithdrawalRequest(db, requestId) {
  const [rows] = await db.query(
    `SELECT r.*, i.name as investor_name, i.investor_code
     FROM investor_capital_withdrawal_requests r
     JOIN investors i ON i.id = r.investor_id
     WHERE r.id = ?`,
    [requestId]
  );
  if (!rows.length) {
    const err = new Error('Capital withdrawal request not found.');
    err.statusCode = 404;
    throw err;
  }
  const [approvals] = await db.query(
    `SELECT a.*, i.name as investor_name, i.investor_code
     FROM investor_capital_withdrawal_approvals a
     JOIN investors i ON i.id = a.investor_id
     WHERE a.request_id = ? ORDER BY i.name`,
    [requestId]
  );
  return { ...rows[0], approvals };
}

export async function createCapitalWithdrawalRequest(db, { investorId, amount, accountCode, notes } = {}, requestedBy = null) {
  const withdrawAmount = Number(amount);
  if (!Number.isFinite(withdrawAmount) || withdrawAmount <= 0) {
    const err = new Error('A valid withdrawal amount greater than 0 is required.');
    err.statusCode = 400;
    throw err;
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [investorRows] = await conn.query('SELECT * FROM investors WHERE id = ? AND deleted_at IS NULL FOR UPDATE', [investorId]);
    if (!investorRows.length) {
      const err = new Error('Investor not found.');
      err.statusCode = 404;
      throw err;
    }
    const investor = investorRows[0];
    if (withdrawAmount > Number(investor.capital_amount)) {
      const err = new Error(`Withdrawal amount cannot exceed the investor's current capital balance of ₹${investor.capital_amount}.`);
      err.statusCode = 400;
      throw err;
    }

    const [activeInvestors] = await conn.query("SELECT id FROM investors WHERE status = 'ACTIVE' AND deleted_at IS NULL");
    if (!activeInvestors.length) {
      const err = new Error('No active investors available to approve this withdrawal.');
      err.statusCode = 400;
      throw err;
    }

    const [reqResult] = await conn.execute(
      `INSERT INTO investor_capital_withdrawal_requests (investor_id, amount, requested_by, account_code, status, notes)
       VALUES (?, ?, ?, ?, 'PENDING_APPROVAL', ?)`,
      [investorId, withdrawAmount, requestedBy || 'Admin', accountCode || '1002', notes || null]
    );
    const requestId = reqResult.insertId;

    for (const activeInv of activeInvestors) {
      await conn.execute(
        `INSERT INTO investor_capital_withdrawal_approvals (request_id, investor_id, decision) VALUES (?, ?, 'PENDING')`,
        [requestId, activeInv.id]
      );
    }

    await conn.commit();
    return getCapitalWithdrawalRequest(db, requestId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function tryExecuteCapitalWithdrawal(db, requestId) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [reqRows] = await conn.query(
      `SELECT r.*, i.name as investor_name, i.investor_code, i.capital_amount as current_capital
       FROM investor_capital_withdrawal_requests r
       JOIN investors i ON i.id = r.investor_id
       WHERE r.id = ? FOR UPDATE`,
      [requestId]
    );
    if (!reqRows.length) {
      const err = new Error('Capital withdrawal request not found.');
      err.statusCode = 404;
      throw err;
    }
    const request = reqRows[0];

    if (request.status !== 'PENDING_APPROVAL' && request.status !== 'APPROVED_WAITING_FUNDS') {
      await conn.commit();
      return getCapitalWithdrawalRequest(db, requestId);
    }

    const balance = await LedgerService.getAccountBalance(conn, request.account_code);
    const available = balance ? Number(balance.available_balance) : 0;

    if (available < Number(request.amount)) {
      await conn.execute("UPDATE investor_capital_withdrawal_requests SET status = 'APPROVED_WAITING_FUNDS' WHERE id = ?", [requestId]);
      await conn.commit();
      return getCapitalWithdrawalRequest(db, requestId);
    }

    const accountName = balance?.account_name || (request.account_code === '1001' ? 'Cash in Hand' : 'Bank Account');
    const withdrawAmount = Number(request.amount);
    const newCapital = Math.round((Number(request.current_capital) - withdrawAmount) * 100) / 100;
    const txnDate = todayStr();

    const voucher = await insertVoucherOnConnection(conn, {
      entry_date: txnDate,
      description: `Investor Capital Withdrawal - ${request.investor_name} (${request.investor_code})`,
      voucher_type: request.account_code === '1001' ? 'CASH_PAYMENT' : 'BANK_PAYMENT',
      is_auto: true,
      ref_type: 'CAPITAL_WITHDRAWAL_REQUEST',
      ref_id: request.id,
      branch: 'Main Branch',
      created_by: 'Admin',
      lines: [
        { account_code: SHARE_CAPITAL_ACCOUNT, account_name: SHARE_CAPITAL_ACCOUNT_NAME, debit: withdrawAmount, credit: 0, description: `Capital Withdrawal - ${request.investor_name}` },
        { account_code: request.account_code, account_name: accountName, debit: 0, credit: withdrawAmount, description: `Capital Withdrawal Payout - ${request.investor_name}` }
      ]
    });

    await conn.execute('UPDATE investors SET capital_amount = ? WHERE id = ?', [newCapital, request.investor_id]);
    await insertCapitalTxn(conn, {
      investorId: request.investor_id,
      txnType: 'CAPITAL_WITHDRAWAL',
      amount: withdrawAmount,
      balanceAfter: newCapital,
      txnDate,
      refType: 'CAPITAL_WITHDRAWAL_REQUEST',
      refId: request.id,
      journalEntryId: voucher.id,
      notes: `Capital withdrawal approved by all investors`,
      createdBy: 'Admin'
    });

    await conn.execute(
      "UPDATE investor_capital_withdrawal_requests SET status = 'EXECUTED', executed_at = NOW(), journal_entry_id = ? WHERE id = ?",
      [voucher.id, requestId]
    );

    await conn.commit();
    return getCapitalWithdrawalRequest(db, requestId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function recordWithdrawalApproval(db, requestId, investorId, decision, decidedBy = null) {
  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    const err = new Error("Decision must be 'APPROVED' or 'REJECTED'.");
    err.statusCode = 400;
    throw err;
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [reqRows] = await conn.query('SELECT * FROM investor_capital_withdrawal_requests WHERE id = ? FOR UPDATE', [requestId]);
    if (!reqRows.length) {
      const err = new Error('Capital withdrawal request not found.');
      err.statusCode = 404;
      throw err;
    }
    const request = reqRows[0];
    if (request.status !== 'PENDING_APPROVAL') {
      const err = new Error(`This request is no longer pending approval (current status: ${request.status}).`);
      err.statusCode = 400;
      throw err;
    }

    const [approvalRows] = await conn.query(
      'SELECT * FROM investor_capital_withdrawal_approvals WHERE request_id = ? AND investor_id = ? FOR UPDATE',
      [requestId, investorId]
    );
    if (!approvalRows.length) {
      const err = new Error('This investor is not part of the approval list for this request.');
      err.statusCode = 404;
      throw err;
    }

    await conn.execute(
      'UPDATE investor_capital_withdrawal_approvals SET decision = ?, decided_by = ?, decided_at = NOW() WHERE request_id = ? AND investor_id = ?',
      [decision, decidedBy || 'Admin', requestId, investorId]
    );

    if (decision === 'REJECTED') {
      await conn.execute("UPDATE investor_capital_withdrawal_requests SET status = 'REJECTED' WHERE id = ?", [requestId]);
      await conn.commit();
      return getCapitalWithdrawalRequest(db, requestId);
    }

    const [allApprovals] = await conn.query('SELECT decision FROM investor_capital_withdrawal_approvals WHERE request_id = ?', [requestId]);
    const allApproved = allApprovals.every(a => a.decision === 'APPROVED');

    await conn.commit();

    if (allApproved) {
      return tryExecuteCapitalWithdrawal(db, requestId);
    }
    return getCapitalWithdrawalRequest(db, requestId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function cancelCapitalWithdrawalRequest(db, requestId) {
  const [result] = await db.execute(
    "UPDATE investor_capital_withdrawal_requests SET status = 'CANCELLED' WHERE id = ? AND status IN ('PENDING_APPROVAL','APPROVED_WAITING_FUNDS')",
    [requestId]
  );
  if (!result.affectedRows) {
    const err = new Error('Only a pending or funds-waiting request can be cancelled.');
    err.statusCode = 400;
    throw err;
  }
  return getCapitalWithdrawalRequest(db, requestId);
}
