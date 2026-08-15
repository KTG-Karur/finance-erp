/**
 * EOD Persistence & Lock Engine Service
 * Location: server/src/finance/eod/eod.service.js
 */
import { EodRepository } from './eod.repository.js';

export class EodService {
  static async assertEodNotLocked(db, branch, dateStr) {
    if (!dateStr) return;
    const record = await EodRepository.findEodRecordByBranchAndDate(db, branch || 'Main Branch', dateStr);
    if (!record) return;

    // Check if there is an active reopen window
    const now = Date.now();
    const activeReopen = (record.reopen_history || []).some(rh => {
      const exp = new Date(rh.expires_at).getTime();
      return exp > now;
    });

    if (!activeReopen && (record.status === 'CLOSED' || record.status === 'PENDING_REVIEW')) {
      const err = new Error(`${branch || 'This branch'}'s books for ${dateStr} are closed. Request an admin reopen window before recording new transactions.`);
      err.statusCode = 400;
      throw err;
    }
  }

  static async getRecords(db, filters) {
    return EodRepository.findEodRecords(db, filters);
  }

  static async closeDay(db, payload, user) {
    const { branch, date, denominations = {}, remarks } = payload;
    if (!branch || !date) {
      const err = new Error('Branch and Date are required for day-end closing.');
      err.statusCode = 400;
      throw err;
    }

    // 1. Calculate Expected Cash from Cash in Hand GL 1001 for this branch up to date
    const [cashRows] = await db.query(
      `SELECT SUM(jl.debit - jl.credit) as expected_cash
       FROM journal_lines jl
       JOIN journal_entries je ON jl.journal_entry_id = je.id
       WHERE jl.account_code = '1001'
       AND (je.branch = ? OR ? = '' OR je.branch IS NULL)
       AND je.entry_date <= ?`,
      [branch, branch, date]
    );
    const expectedCash = parseFloat(cashRows[0]?.expected_cash || 0);

    // 2. Calculate Counted Physical Cash from Denominations
    let countedCash = 0;
    for (const [denomStr, count] of Object.entries(denominations)) {
      const d = parseInt(denomStr, 10);
      const c = parseInt(count, 10) || 0;
      if (!isNaN(d) && c > 0) {
        countedCash += (d * c);
      }
    }

    const difference = countedCash - expectedCash;
    const hasVariance = Math.abs(difference) > 0.01;
    const status = hasVariance ? 'PENDING_REVIEW' : 'CLOSED';

    const saved = await EodRepository.saveEodRecord(db, {
      branch,
      date,
      status,
      has_variance: hasVariance,
      closed_by: user?.name || user?.email || 'Staff',
      closed_at: new Date(),
      denominations,
      counted_cash: countedCash,
      expected_cash: expectedCash,
      difference,
      remarks: remarks || (hasVariance ? `Variance of ₹${difference.toFixed(2)} recorded` : 'Day-end cash balanced')
    });

    return saved;
  }

  static async resolveVariance(db, payload, user) {
    const { id, resolution_note } = payload;
    if (!id) {
      const err = new Error('EOD Record ID is required to resolve variance.');
      err.statusCode = 400;
      throw err;
    }
    return EodRepository.resolveVariance(db, {
      id,
      resolution_note,
      reviewed_by: user?.name || 'Admin'
    });
  }

  static async grantReopen(db, payload, user) {
    const { id, reason, granted_hours = 4 } = payload;
    if (!id) {
      const err = new Error('EOD Record ID is required to grant reopen window.');
      err.statusCode = 400;
      throw err;
    }

    const expiresAt = new Date(Date.now() + granted_hours * 3600 * 1000).toISOString();
    const reopenRecord = {
      reopened_by: user?.name || 'Admin',
      reopened_at: new Date().toISOString(),
      expires_at: expiresAt,
      reason: reason || 'Audit adjustment',
      granted_hours
    };

    return EodRepository.addReopenHistory(db, { id, reopenRecord });
  }

  static async getDenominationSettings(db) {
    return EodRepository.findDenominationSettings(db);
  }
}
