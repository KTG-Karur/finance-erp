import { LedgerRepository } from './ledger.repository.js';
import { validateDoubleEntry } from '../../shared/accounting-engine/accountingEngine.js';

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

      const { entry_date, description, voucher_type, lines } = voucherData;
      const { totalDebit } = validateDoubleEntry(lines);

      const voucherNo = `VOU-${Date.now().toString().slice(-6)}`;
      const [vRes] = await conn.query(
        `INSERT INTO journal_entries (voucher_no, entry_date, description, voucher_type, is_auto, total_amount) VALUES (?, ?, ?, ?, 0, ?)`,
        [voucherNo, entry_date || new Date().toISOString().slice(0, 10), description, voucher_type || 'JOURNAL', totalDebit]
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

      await conn.commit();
      return { id: entryId, voucher_no: voucherNo, total_amount: totalDebit, lines_count: lines.length };
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
