import { LoanRepository } from './loan.repository.js';
import { validateLoanCreationPayload } from './loan.validation.js';
import { generateEmiSchedule } from '../../shared/interest-engine/interestEngine.js';
import { createDisbursalVoucher } from '../../shared/voucher-engine/voucherEngine.js';
import { NpaService } from '../npa/npa.service.js';

// Statuses a loan can transition INTO via updateStatus, and which CURRENT
// status each is valid from. Anything not listed here is rejected with a
// clear error instead of silently corrupting the record — a loan's status is
// the single field every other screen (Loans, Applications, Detail) branches
// its rendering on, so an invalid jump (e.g. CLOSED -> PENDING) would leave
// the UI in a state nothing else expects.
const VALID_TRANSITIONS = {
  APPROVED: ['PENDING'],
  REJECTED: ['PENDING'],
  PENDING: ['APPROVED', 'REJECTED'], // revert
  ACTIVE: ['APPROVED', 'PENDING_CLOSURE', 'OVERDUE'], // disburse, or reject a closure request
  CLOSED: ['PENDING_CLOSURE'],
  OVERDUE: ['ACTIVE']
};

export class LoanService {
  static async getAllLoans(db, filters) {
    // Keep OVERDUE/DPD status fresh on every fetch — previously this only ever
    // updated when someone visited the separate NPA report page, so the Loans
    // page's own "Overdue" tab/badge/KPI could sit stale indefinitely.
    await NpaService.evaluateNpaClassifications(db);
    return LoanRepository.findAll(db, filters);
  }

  static async getLoanById(db, id) {
    return LoanRepository.findById(db, id);
  }

  static async createLoan(db, loanData) {
    validateLoanCreationPayload(loanData);

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // An APPLICATION is submitted for review — no cash moves and no voucher
      // posts until it's later approved and disbursed (see updateStatus's
      // APPROVED->ACTIVE transition). A direct disbursal skips the review step
      // and is immediately ACTIVE with cash out the door.
      const isApplication = loanData.mode === 'APPLICATION';
      const accountPrefix = isApplication ? 'APP' : 'LN';
      const loanAccountNo = `${accountPrefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const principal = Number(loanData.principal_amount);
      const rate = Number(loanData.monthly_interest_rate);
      const tenureDays = Number(loanData.tenure_days || 120);

      const repaymentMethod = loanData.repayment_method || 'EMI';
      const interestCalculation = loanData.interest_calculation || 'CONSTANT_FLAT';
      const repaymentFrequency = loanData.repayment_frequency || 'DAILY';

      let schedule = [];
      let totalPayable = principal;
      let installmentAmount = 0;

      if (repaymentMethod === 'EMI') {
        const tenureMonths = Math.ceil(tenureDays / 30);
        schedule = generateEmiSchedule({
          principal,
          monthlyInterestRate: rate,
          tenureMonths,
          repaymentFrequency,
          interestCalculation,
          startDate: loanData.loan_date
        });
        totalPayable = schedule.reduce((sum, item) => sum + item.emi, 0);
        installmentAmount = schedule[0]?.emi || 0;
      } else {
        // INTEREST_ONLY — no fixed installment plan; interest accrues live
        // against the outstanding principal (see collection.service.js /
        // interestEngine.js's calculateInterestOnlyAllocation). installment_amount
        // here is only an informational estimate of one period's interest —
        // actual collection math never reads it.
        const periodDays = repaymentFrequency === 'MONTHLY' ? 30 : repaymentFrequency === 'WEEKLY' ? 7 : 1;
        const dailyRate = rate / 100 / 30;
        installmentAmount = Math.round(principal * dailyRate * periodDays);
        totalPayable = principal;
      }

      const status = isApplication ? 'PENDING' : 'ACTIVE';

      // First due date gets one full collection cycle of grace from disbursal —
      // a loan isn't overdue on the day it's handed out. EMI loans already carry
      // this via their generated schedule's first installment date; INTEREST_ONLY
      // loans have no schedule, so it's computed the same way collections advance
      // next_due afterwards (see collection.service.js).
      let firstDueDate = schedule[0]?.due_date || null;
      if (!firstDueDate && !isApplication) {
        const cycleDays = repaymentFrequency === 'MONTHLY' ? 30 : repaymentFrequency === 'WEEKLY' ? 7 : 1;
        const d = new Date(loanData.loan_date || new Date().toISOString().slice(0, 10));
        d.setDate(d.getDate() + cycleDays);
        firstDueDate = d.toISOString().slice(0, 10);
      }

      const [res] = await conn.query(
        `INSERT INTO loans (
          loan_account_no, borrower_id, borrower_name, phone, scheme_id, branch, collector,
          principal_amount, total_payable, pending_amount, installment_amount, monthly_interest_rate,
          tenure_days, repayment_method, interest_calculation, repayment_frequency,
          formula_type, accrual_mode, interest_formula, installment_formula,
          aadhaar, pan, guarantor, purpose, nominee, security,
          status, loan_date, next_due
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          loanAccountNo,
          loanData.borrower_id || null,
          loanData.borrower_name,
          loanData.phone || '',
          loanData.scheme_id || null,
          loanData.branch || 'Main Branch',
          loanData.collector || null,
          principal,
          totalPayable,
          totalPayable,
          installmentAmount,
          rate,
          tenureDays,
          repaymentMethod,
          interestCalculation,
          repaymentFrequency,
          loanData.formula_type || 'STANDARD',
          loanData.accrual_mode || null,
          loanData.interest_formula ? JSON.stringify(loanData.interest_formula) : null,
          loanData.installment_formula ? JSON.stringify(loanData.installment_formula) : null,
          loanData.aadhaar || null,
          loanData.pan || null,
          loanData.guarantor || null,
          loanData.purpose || null,
          loanData.nominee ? JSON.stringify(loanData.nominee) : null,
          loanData.security ? JSON.stringify(loanData.security) : null,
          status,
          loanData.loan_date || new Date().toISOString().slice(0, 10),
          isApplication ? null : firstDueDate
        ]
      );

      const loanId = res.insertId;

      if (schedule.length) {
        const scheduleValues = schedule.map(item => [
          loanId,
          item.period,
          item.due_date,
          item.principal,
          item.interest,
          item.emi,
          0,
          0,
          'PENDING'
        ]);
        await conn.query(
          `INSERT INTO repayment_schedules (
            loan_id, period, due_date, principal, interest, emi, principal_paid, interest_paid, status
          ) VALUES ?`,
          [scheduleValues]
        );
      }

      // Cash only actually leaves the vault on a real disbursal — an
      // APPLICATION has no cash movement yet, so no voucher until it's later
      // approved and disbursed.
      if (!isApplication) {
        await createDisbursalVoucher(conn, {
          loanId,
          loanAccountNo,
          borrowerName: loanData.borrower_name,
          amount: principal,
          entryDate: loanData.loan_date
        });
      }

      await conn.commit();
      return { id: loanId, loan_account_no: loanAccountNo, status, total_payable: totalPayable, schedule };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  static async updateStatus(db, id, status, reason) {
    if (!VALID_TRANSITIONS[status]) {
      const err = new Error(`'${status}' is not a valid loan status.`);
      err.statusCode = 400;
      throw err;
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.query(`SELECT * FROM loans WHERE id = ? FOR UPDATE`, [id]);
      if (!rows.length) {
        await conn.rollback();
        return false;
      }
      const loan = rows[0];

      if (!VALID_TRANSITIONS[status].includes(loan.status)) {
        const err = new Error(`Cannot move a loan from '${loan.status}' to '${status}'.`);
        err.statusCode = 409;
        throw err;
      }

      if (status === 'APPROVED') {
        // PENDING application -> reviewed, not yet disbursed. Flip the account
        // number's prefix so it reads as a real (pending-disbursal) account.
        const newAccountNo = loan.loan_account_no.replace(/^APP-/, 'LN-');
        await conn.query(`UPDATE loans SET status = 'APPROVED', loan_account_no = ? WHERE id = ?`, [newAccountNo, id]);
      } else if (status === 'REJECTED') {
        await conn.query(`UPDATE loans SET status = 'REJECTED', rejection_reason = ? WHERE id = ?`, [reason || 'Not specified', id]);
      } else if (status === 'PENDING') {
        // Revert an APPROVED or REJECTED application back to review.
        const newAccountNo = loan.loan_account_no.replace(/^LN-/, 'APP-');
        await conn.query(`UPDATE loans SET status = 'PENDING', loan_account_no = ?, rejection_reason = NULL WHERE id = ?`, [newAccountNo, id]);
      } else if (status === 'ACTIVE' && loan.status === 'APPROVED') {
        // The actual disbursal — cash leaves the vault now, not at application
        // time. Same voucher path as an immediate (non-application) disbursal.
        // next_due was left null while the application sat PENDING (it wasn't
        // NPA-eligible yet); the due-date clock starts now, from the real
        // disbursal date, not whenever the application happened to be filed.
        const [firstSchedRow] = await conn.query(
          `SELECT due_date FROM repayment_schedules WHERE loan_id = ? ORDER BY period ASC LIMIT 1`,
          [id]
        );
        let disbursalNextDue = firstSchedRow[0]?.due_date || null;
        if (!disbursalNextDue) {
          const cycleDays = loan.repayment_frequency === 'MONTHLY' ? 30 : loan.repayment_frequency === 'WEEKLY' ? 7 : 1;
          const d = new Date();
          d.setDate(d.getDate() + cycleDays);
          disbursalNextDue = d.toISOString().slice(0, 10);
        }
        await conn.query(`UPDATE loans SET status = 'ACTIVE', next_due = ? WHERE id = ?`, [disbursalNextDue, id]);
        await createDisbursalVoucher(conn, {
          loanId: id,
          loanAccountNo: loan.loan_account_no,
          borrowerName: loan.borrower_name,
          amount: loan.principal_amount,
          entryDate: new Date().toISOString().slice(0, 10)
        });
      } else if (status === 'ACTIVE' && loan.status === 'PENDING_CLOSURE') {
        // Rejecting a closure request — a mis-recorded "fully paid" needs a
        // human to look at it, not silently stay closed.
        await conn.query(
          `UPDATE loans SET status = 'ACTIVE', closure_rejection_reason = ?, closure_requested_at = NULL, closure_requested_by = NULL WHERE id = ?`,
          [reason || 'Not specified', id]
        );
      } else if (status === 'ACTIVE' && loan.status === 'OVERDUE') {
        await conn.query(`UPDATE loans SET status = 'ACTIVE' WHERE id = ?`, [id]);
      } else if (status === 'CLOSED') {
        await conn.query(`UPDATE loans SET status = 'CLOSED' WHERE id = ?`, [id]);
      }

      await conn.commit();
      return true;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}
