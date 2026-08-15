import { LoanRepository } from './loan.repository.js';
import { validateLoanCreationPayload } from './loan.validation.js';
import { generateEmiSchedule } from '../../shared/interest-engine/interestEngine.js';
import { createDisbursalVoucher, createPreclosureVoucher, createEmergencyCloseVoucher } from '../../shared/voucher-engine/voucherEngine.js';
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

  static async createLoan(db, loanData, createdBy) {
    validateLoanCreationPayload(loanData);

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // scheme_id is a real foreign key to loan_schemes — inserting one that
      // doesn't exist (the client used to silently fall back to a hardcoded
      // `1` when no scheme was actually selected) fails with a raw MySQL
      // foreign-key error that gives staff no idea what actually went wrong.
      // Whenever a tenant has no schemes configured yet, this is exactly what
      // happened on every single application attempt.
      if (loanData.scheme_id) {
        const [schemeRows] = await conn.query('SELECT id FROM loan_schemes WHERE id = ? AND is_active = 1', [loanData.scheme_id]);
        if (!schemeRows.length) {
          const err = new Error('Selected loan scheme was not found or is inactive. Create/activate a Loan Scheme under Settings before creating loans.');
          err.statusCode = 400;
          throw err;
        }
      }

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
          entryDate: loanData.loan_date || new Date().toISOString().slice(0, 10),
          branch: loanData.branch,
          createdBy,
          paymentMode: loanData.payment_mode || 'CASH',
          sourceAccountCode: loanData.source_account_code,
          sourceAccountName: loanData.source_account_name,
          transactionRef: loanData.transaction_ref,
          processingFee: loanData.processing_fee || loanData.processing_fee_amount || 0,
          advanceEmi: loanData.advance_emi || loanData.advance_emi_amount || 0,
          otherDeductions: loanData.other_deductions || 0
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

  static async updateStatus(db, id, status, reason, createdBy, extraData = {}) {
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
        // The actual disbursal — cash leaves the vault/bank now, not at application
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

        const disbursalBranch = extraData.branch || loan.branch;
        const disbursalDate = extraData.disbursal_date || new Date().toISOString().slice(0, 10);
        if (extraData.branch && extraData.branch !== loan.branch) {
          await conn.query(`UPDATE loans SET branch = ? WHERE id = ?`, [extraData.branch, id]);
        }

        // Task 4: Duplicate Disbursal Protection (Idempotency Guard)
        const [existingVouchers] = await conn.query(
          `SELECT id, voucher_no FROM journal_entries WHERE ref_type = 'DISBURSAL' AND ref_id = ?`,
          [id]
        );
        if (existingVouchers.length > 0) {
          const dupErr = new Error(`Loan ${loan.loan_account_no} has already been disbursed under voucher ${existingVouchers[0].voucher_no}. Duplicate disbursal rejected.`);
          dupErr.statusCode = 409;
          throw dupErr;
        }

        await conn.query(`UPDATE loans SET status = 'ACTIVE', next_due = ? WHERE id = ?`, [disbursalNextDue, id]);
        await createDisbursalVoucher(conn, {
          loanId: id,
          loanAccountNo: loan.loan_account_no,
          borrowerName: loan.borrower_name,
          amount: loan.principal_amount,
          entryDate: disbursalDate,
          branch: disbursalBranch,
          createdBy,
          paymentMode: extraData.payment_mode || 'CASH',
          sourceAccountCode: extraData.source_account_code,
          sourceAccountName: extraData.source_account_name,
          transactionRef: extraData.transaction_ref,
          processingFee: extraData.processing_fee || loan.processing_fee || 0,
          advanceEmi: extraData.advance_emi || loan.advance_emi || 0,
          otherDeductions: extraData.other_deductions || 0
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

  static async estimateLoan(payload) {
    const principal = Number(payload.principal_amount || 0);
    const monthlyRate = Number(payload.monthly_interest_rate || 0);
    const tenureMonths = Number(payload.tenure_months || 1);
    const repaymentFrequency = payload.repayment_frequency || 'DAILY';
    const repaymentMethod = payload.repayment_method || 'EMI';
    const interestCalculation = payload.interest_calculation || 'CONSTANT_FLAT';
    const processingFeePercent = Number(payload.processing_fee_percent || 0);
    const processingFeeFlat = Number(payload.processing_fee_flat || 0);
    const gstPercent = Number(payload.gst_percent != null ? payload.gst_percent : 18);
    const advanceEmiCount = Number(payload.advance_emi_count || 0);

    let processingFee = processingFeeFlat + (principal * (processingFeePercent / 100));
    let gstAmount = processingFee * (gstPercent / 100);
    let totalDeductions = processingFee + gstAmount;

    let schedule = [];
    if (repaymentMethod === 'EMI') {
      schedule = generateEmiSchedule({
        principal,
        monthlyInterestRate: monthlyRate,
        tenureMonths,
        repaymentFrequency,
        interestCalculation,
        startDate: payload.start_date || new Date().toISOString().slice(0, 10)
      });
    } else {
      // Interest-Only mode
      const totalDays = Math.max(Math.round(tenureMonths * 30), 1);
      let periodsCount = repaymentFrequency === 'WEEKLY' ? Math.ceil(totalDays / 7) : repaymentFrequency === 'MONTHLY' ? tenureMonths : totalDays;
      let interestPerPeriod = Math.round((principal * (monthlyRate / 100) * tenureMonths) / periodsCount);
      const base = payload.start_date ? new Date(payload.start_date) : new Date();
      const periodDays = repaymentFrequency === 'WEEKLY' ? 7 : repaymentFrequency === 'MONTHLY' ? 30 : 1;

      for (let i = 1; i <= periodsCount; i++) {
        const dueDate = new Date(base);
        dueDate.setDate(dueDate.getDate() + i * periodDays);
        const isLast = i === periodsCount;
        const pP = isLast ? principal : 0;
        schedule.push({
          period: i,
          due_date: dueDate.toISOString().slice(0, 10),
          principal: pP,
          interest: interestPerPeriod,
          emi: pP + interestPerPeriod,
          principal_paid: 0,
          interest_paid: 0
        });
      }
    }

    const totalInterest = schedule.reduce((sum, r) => sum + (r.interest || 0), 0);
    const totalPayable = principal + totalInterest;
    const installmentAmount = schedule.length > 0 ? schedule[0].emi : 0;
    
    let advanceEmiAmount = 0;
    if (advanceEmiCount > 0 && schedule.length > 0) {
      advanceEmiAmount = schedule.slice(0, advanceEmiCount).reduce((sum, r) => sum + r.emi, 0);
      totalDeductions += advanceEmiAmount;
    }

    const netDisbursed = Math.max(0, principal - totalDeductions);
    const effectiveApr = principal > 0 ? (((totalInterest + processingFee) / principal) / (tenureMonths / 12) * 100).toFixed(2) : 0;

    return {
      principal,
      monthlyRate,
      tenureMonths,
      repaymentFrequency,
      repaymentMethod,
      interestCalculation,
      processingFee: Math.round(processingFee),
      gstAmount: Math.round(gstAmount),
      advanceEmiAmount: Math.round(advanceEmiAmount),
      totalDeductions: Math.round(totalDeductions),
      netDisbursed: Math.round(netDisbursed),
      totalInterest: Math.round(totalInterest),
      totalPayable: Math.round(totalPayable),
      installmentAmount: Math.round(installmentAmount),
      effectiveApr: Number(effectiveApr),
      schedule
    };
  }

  /**
   * Preclosure Quote Calculator:
   * Rule A (EMI): Payoff = sum of all remaining pending EMIs (pending_amount).
   * Rule B (Normal Interest / Interest-Only): Payoff = Principal + Accrued Interest Till Date.
   */
  static async calculatePreclosurePayoff(db, loanId, asOfDate) {
    const loan = await LoanRepository.findById(db, loanId);
    if (!loan) {
      const err = new Error('Loan account not found.');
      err.statusCode = 404;
      throw err;
    }

    if (['CLOSED', 'REJECTED'].includes(loan.status)) {
      const err = new Error(`Loan is already ${loan.status} and cannot be preclosed.`);
      err.statusCode = 400;
      throw err;
    }

    const calcDate = asOfDate || new Date().toISOString().slice(0, 10);
    const schedules = loan.schedules || [];
    const pendingSchedules = schedules.filter(s => s.status !== 'PAID');

    if (loan.repayment_method === 'EMI') {
      const pendingEmisTotal = Number(loan.pending_amount) || 0;
      return {
        loanId: loan.id,
        loanAccountNo: loan.loan_account_no,
        borrowerName: loan.borrower_name,
        branch: loan.branch,
        repaymentMethod: 'EMI',
        asOfDate: calcDate,
        principalAmount: Number(loan.principal_amount),
        totalPayable: Number(loan.total_payable),
        collectedAmount: Number(loan.collected_amount),
        pendingAmount: pendingEmisTotal,
        pendingEmisCount: pendingSchedules.length,
        principalPayoff: Math.min(Number(loan.principal_amount), pendingEmisTotal),
        interestPayoff: Math.max(0, pendingEmisTotal - Number(loan.principal_amount)),
        preclosurePayoffAmount: pendingEmisTotal,
        ruleDescription: 'EMI Preclosure: Full payment of all pending installments.'
      };
    } else {
      // Normal Interest (INTEREST_ONLY)
      const principal = Number(loan.principal_amount) || 0;
      const monthlyRate = Number(loan.monthly_interest_rate) || 0;
      const startDate = loan.last_payment_date || loan.loan_date;
      
      const dStart = new Date(startDate);
      const dEnd = new Date(calcDate);
      const diffMs = Math.max(0, dEnd - dStart);
      const daysElapsed = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      
      const dailyRate = (monthlyRate / 100) / 30;
      const accruedInterest = Math.round(principal * dailyRate * daysElapsed);
      const totalPayoff = principal + accruedInterest;

      return {
        loanId: loan.id,
        loanAccountNo: loan.loan_account_no,
        borrowerName: loan.borrower_name,
        branch: loan.branch,
        repaymentMethod: 'INTEREST_ONLY',
        asOfDate: calcDate,
        principalAmount: principal,
        totalPayable: Number(loan.total_payable),
        collectedAmount: Number(loan.collected_amount),
        pendingAmount: Number(loan.pending_amount),
        lastPaymentDate: startDate,
        daysElapsed,
        monthlyInterestRate: monthlyRate,
        accruedInterest,
        preclosurePayoffAmount: totalPayoff,
        ruleDescription: 'Normal Interest Preclosure: Principal amount + accrued interest till settlement date.'
      };
    }
  }

  /**
   * Execute Early Loan Preclosure Settlement
   */
  static async executeLoanPreclosure(db, loanId, payload, createdBy) {
    const {
      settlement_date = new Date().toISOString().slice(0, 10),
      payment_mode = 'CASH',
      transaction_ref = '',
      foreclosure_fee = 0,
      notes = ''
    } = payload;

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.query('SELECT * FROM loans WHERE id = ? FOR UPDATE', [loanId]);
      if (!rows.length) {
        const err = new Error('Loan account not found.');
        err.statusCode = 404;
        throw err;
      }
      const loan = rows[0];

      if (['CLOSED', 'REJECTED'].includes(loan.status)) {
        const err = new Error(`Loan is already ${loan.status}.`);
        err.statusCode = 400;
        throw err;
      }

      // Calculate preclosure payoff based on loan type
      let principalPaid = 0;
      let interestPaid = 0;
      let totalAmount = 0;

      if (loan.repayment_method === 'EMI') {
        totalAmount = Number(loan.pending_amount);
        principalPaid = Math.min(Number(loan.principal_amount), totalAmount);
        interestPaid = Math.max(0, totalAmount - principalPaid);
      } else {
        const principal = Number(loan.principal_amount) || 0;
        const monthlyRate = Number(loan.monthly_interest_rate) || 0;
        const startDate = loan.last_payment_date || loan.loan_date;
        const dStart = new Date(startDate);
        const dEnd = new Date(settlement_date);
        const diffMs = Math.max(0, dEnd - dStart);
        const daysElapsed = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        const dailyRate = (monthlyRate / 100) / 30;
        interestPaid = Math.round(principal * dailyRate * daysElapsed);
        principalPaid = principal;
        totalAmount = principalPaid + interestPaid;
      }

      const totalCollection = totalAmount + Number(foreclosure_fee || 0);
      const receiptNo = `REC-PRECLOSE-${loan.id}-${Date.now().toString().slice(-4)}`;

      // 1. Insert collection receipt
      const [colRes] = await conn.query(
        `INSERT INTO collections (
          loan_id, receipt_no, collection_date, amount, principal_paid, interest_paid, penalty_paid,
          payment_mode, collector_name, branch, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          loan.id,
          receiptNo,
          settlement_date,
          totalCollection,
          principalPaid,
          interestPaid,
          Number(foreclosure_fee || 0),
          payment_mode,
          createdBy || 'Staff Manager',
          loan.branch,
          notes ? `[PRECLOSURE] ${notes}` : '[PRECLOSURE] Early settlement in full'
        ]
      );
      const collectionId = colRes.insertId;

      // 2. Mark all repayment schedules for this loan as PAID
      await conn.query(
        `UPDATE repayment_schedules 
         SET principal_paid = principal, interest_paid = interest, status = 'PAID' 
         WHERE loan_id = ?`,
        [loan.id]
      );

      // 3. Post Double-Entry General Ledger Settlement Voucher
      const { voucherNo } = await createPreclosureVoucher(conn, {
        loanId: loan.id,
        loanAccountNo: loan.loan_account_no,
        receiptNo,
        borrowerName: loan.borrower_name,
        totalAmount: totalCollection,
        principalPaid,
        interestPaid,
        foreclosureFee: Number(foreclosure_fee || 0),
        entryDate: settlement_date,
        branch: loan.branch,
        createdBy,
        paymentMode: payment_mode,
        transactionRef: transaction_ref
      });

      await conn.query(
        `UPDATE collections SET voucher_no = ?, new_principal_balance = 0 WHERE id = ?`,
        [voucherNo, collectionId]
      );

      // 4. Update Loan Status to CLOSED with Preclosure Snapshot
      const [historyRows] = await conn.query(
        `SELECT * FROM collections WHERE loan_id = ? ORDER BY collection_date DESC, id DESC`,
        [loan.id]
      );

      const snapshot = JSON.stringify({
        closure_type: 'PRECLOSURE',
        repayment_method: loan.repayment_method,
        settlement_date,
        total_settlement_paid: totalCollection,
        principal_cleared: principalPaid,
        interest_cleared: interestPaid,
        foreclosure_fee: Number(foreclosure_fee || 0),
        payment_mode,
        transaction_ref,
        voucher_no: voucherNo,
        receipt_no: receiptNo,
        closed_by: createdBy || 'Staff Manager',
        payment_history: historyRows
      });

      const newCollected = Number(loan.collected_amount) + totalCollection;

      await conn.query(
        `UPDATE loans SET 
           collected_amount = ?,
           pending_amount = 0,
           status = 'CLOSED',
           last_payment_date = ?,
           closure_requested_at = NOW(),
           closure_requested_by = ?,
           closure_snapshot = ?
         WHERE id = ?`,
        [newCollected, settlement_date, createdBy || 'Staff Manager', snapshot, loan.id]
      );

      await conn.commit();
      return {
        success: true,
        loanId: loan.id,
        loanAccountNo: loan.loan_account_no,
        borrowerName: loan.borrower_name,
        status: 'CLOSED',
        closureType: 'PRECLOSURE',
        totalPaid: totalCollection,
        receiptNo,
        voucherNo,
        settlementDate: settlement_date
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Execute Emergency / Hardship / Compromise Loan Closing
   */
  static async executeEmergencyClose(db, loanId, payload, createdBy) {
    const {
      recovery_amount = 0,
      reason_category = 'COMPROMISE_SETTLEMENT',
      reason_details = '',
      payment_mode = 'CASH',
      transaction_ref = '',
      closed_date = new Date().toISOString().slice(0, 10)
    } = payload;

    const recovery = parseFloat(recovery_amount) || 0;

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.query('SELECT * FROM loans WHERE id = ? FOR UPDATE', [loanId]);
      if (!rows.length) {
        const err = new Error('Loan account not found.');
        err.statusCode = 404;
        throw err;
      }
      const loan = rows[0];

      if (['CLOSED', 'REJECTED'].includes(loan.status)) {
        const err = new Error(`Loan is already ${loan.status}.`);
        err.statusCode = 400;
        throw err;
      }

      const pendingBalance = parseFloat(loan.pending_amount) || 0;
      if (recovery > pendingBalance) {
        const err = new Error(`Recovery amount (₹${recovery}) cannot exceed pending balance (₹${pendingBalance}).`);
        err.statusCode = 400;
        throw err;
      }

      const writtenOffLoss = Math.round((pendingBalance - recovery) * 100) / 100;
      let receiptNo = null;

      // 1. If recovery amount received > 0, insert collection record
      if (recovery > 0) {
        receiptNo = `REC-EMERGENCY-${loan.id}-${Date.now().toString().slice(-4)}`;
        await conn.query(
          `INSERT INTO collections (
            loan_id, receipt_no, collection_date, amount, principal_paid, interest_paid, penalty_paid,
            payment_mode, collector_name, branch, notes
          ) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)`,
          [
            loan.id,
            receiptNo,
            closed_date,
            recovery,
            recovery,
            payment_mode,
            createdBy || 'Authorized Manager',
            loan.branch,
            `[EMERGENCY CLOSURE] Compromise Recovery - Reason: ${reason_category}. ${reason_details}`
          ]
        );
      }

      // 2. Mark remaining repayment schedules as PAID (settled)
      await conn.query(
        `UPDATE repayment_schedules 
         SET principal_paid = principal, interest_paid = interest, status = 'PAID' 
         WHERE loan_id = ?`,
        [loan.id]
      );

      // 3. Post Double-Entry Bad Debt Write-Off Voucher
      const { voucherNo } = await createEmergencyCloseVoucher(conn, {
        loanId: loan.id,
        loanAccountNo: loan.loan_account_no,
        receiptNo,
        borrowerName: loan.borrower_name,
        recoveryAmount: recovery,
        writtenOffAmount: writtenOffLoss,
        reasonCategory: reason_category,
        reasonDetails,
        entryDate: closed_date,
        branch: loan.branch,
        createdBy,
        paymentMode: payment_mode,
        transactionRef: transaction_ref
      });

      // 4. Update Loan Status to CLOSED with Emergency Snapshot
      const [historyRows] = await conn.query(
        `SELECT * FROM collections WHERE loan_id = ? ORDER BY collection_date DESC, id DESC`,
        [loan.id]
      );

      const snapshot = JSON.stringify({
        closure_type: 'EMERGENCY_WRITE_OFF',
        reason_category,
        reason_details,
        closed_date,
        compromise_recovery: recovery,
        written_off_loss: writtenOffLoss,
        payment_mode: recovery > 0 ? payment_mode : null,
        transaction_ref: recovery > 0 ? transaction_ref : null,
        voucher_no: voucherNo,
        receipt_no: receiptNo,
        closed_by: createdBy || 'Authorized Manager',
        payment_history: historyRows
      });

      const newCollected = Number(loan.collected_amount) + recovery;

      await conn.query(
        `UPDATE loans SET 
           collected_amount = ?,
           pending_amount = 0,
           status = 'CLOSED',
           last_payment_date = ?,
           closure_requested_at = NOW(),
           closure_requested_by = ?,
           closure_snapshot = ?
         WHERE id = ?`,
        [newCollected, closed_date, createdBy || 'Authorized Manager', snapshot, loan.id]
      );

      await conn.commit();
      return {
        success: true,
        loanId: loan.id,
        loanAccountNo: loan.loan_account_no,
        borrowerName: loan.borrower_name,
        status: 'CLOSED',
        closureType: 'EMERGENCY_WRITE_OFF',
        recoveryAmount: recovery,
        writtenOffLoss,
        reasonCategory: reason_category,
        voucherNo,
        receiptNo,
        closedDate: closed_date
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}


