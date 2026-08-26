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
    const { id, resolution_note, post_adjustment_voucher = false } = payload;
    if (!id) {
      const err = new Error('EOD Record ID is required to resolve variance.');
      err.statusCode = 400;
      throw err;
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.query('SELECT * FROM eod_records WHERE id = ? FOR UPDATE', [id]);
      if (!rows.length) {
        const err = new Error('EOD record not found.');
        err.statusCode = 404;
        throw err;
      }
      const record = rows[0];
      const difference = parseFloat(record.difference || 0);

      let adjustmentVoucherNo = null;
      if (post_adjustment_voucher && Math.abs(difference) > 0.01) {
        const { insertVoucherOnConnection } = await import('../ledger/ledger.service.js');
        const absDiff = Math.abs(difference);
        const isShortage = difference < 0;

        const lines = isShortage ? [
          { account_code: '5099', account_name: 'Miscellaneous Expense', debit: absDiff, credit: 0, description: `EOD Cash Shortage Adjustment - ${record.branch} (${record.date})` },
          { account_code: '1001', account_name: 'Cash in Hand', debit: 0, credit: absDiff, description: 'Cash Drawer Shortage Written Off' }
        ] : [
          { account_code: '1001', account_name: 'Cash in Hand', debit: absDiff, credit: 0, description: 'Cash Drawer Overage Realized' },
          { account_code: '4099', account_name: 'Miscellaneous Income', debit: 0, credit: absDiff, description: `EOD Cash Overage Adjustment - ${record.branch} (${record.date})` }
        ];

        const voucher = await insertVoucherOnConnection(conn, {
          entry_date: record.date || new Date().toISOString().slice(0, 10),
          description: `EOD Cash Variance Adjustment: ${record.branch} on ${record.date} (Diff: ₹${difference.toFixed(2)})`,
          voucher_type: 'JOURNAL',
          is_auto: true,
          ref_type: 'EOD_VARIANCE_ADJUSTMENT',
          ref_id: record.id,
          branch: record.branch,
          created_by: user?.name || user?.email || 'Admin',
          lines
        });
        adjustmentVoucherNo = voucher.voucher_no;
      }

      const note = adjustmentVoucherNo 
        ? `${resolution_note || 'Resolved by Manager'} [Adjustment Voucher: ${adjustmentVoucherNo}]`
        : (resolution_note || 'Resolved by Manager');

      await conn.query(
        `UPDATE eod_records SET
          status = 'CLOSED', has_variance = 0, resolution_note = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [note, user?.name || user?.email || 'Admin', id]
      );

      await conn.commit();
      const [updatedRows] = await conn.query('SELECT * FROM eod_records WHERE id = ?', [id]);
      return updatedRows[0];
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
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
