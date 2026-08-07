import { LoanRepository } from './loan.repository.js';
import { validateLoanCreationPayload } from './loan.validation.js';
import { generateEmiSchedule } from '../../shared/interest-engine/interestEngine.js';
import { createDisbursalVoucher } from '../../shared/voucher-engine/voucherEngine.js';

export class LoanService {
  static async getAllLoans(db, filters) {
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

      const loanAccountNo = `LN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
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
      }

      const [res] = await conn.query(
        `INSERT INTO loans (
          loan_account_no, borrower_id, borrower_name, phone, scheme_id, branch, collector,
          principal_amount, total_payable, pending_amount, installment_amount, monthly_interest_rate,
          tenure_days, repayment_method, interest_calculation, repayment_frequency, status, loan_date, next_due
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
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
          loanData.loan_date || new Date().toISOString().slice(0, 10),
          schedule[0]?.due_date || loanData.loan_date
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

      // Auto Double-Entry Disbursal Voucher Posting via shared voucher engine
      await createDisbursalVoucher(conn, {
        loanId,
        loanAccountNo,
        borrowerName: loanData.borrower_name,
        amount: principal,
        entryDate: loanData.loan_date
      });

      await conn.commit();
      return { id: loanId, loan_account_no: loanAccountNo, status: 'ACTIVE', total_payable: totalPayable, schedule };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  static async updateStatus(db, id, status) {
    return LoanRepository.updateStatus(db, id, status);
  }
}
