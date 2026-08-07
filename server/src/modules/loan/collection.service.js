import { calculatePaymentAllocation, generateEmiSchedule } from './paymentAllocation.service.js';

export async function getActiveLoans(db, companyId) {
  const [loans] = await db.query(
    'SELECT * FROM loans WHERE company_id = ? ORDER BY id DESC',
    [companyId]
  );
  return loans;
}

export async function createLoan(db, companyId, loanData) {
  const {
    loan_account_no, borrower_name, phone, principal_amount, interest_rate = 10,
    tenure_days, installment_amount, monthly_interest_rate, repayment_method = 'EMI',
    interest_calculation = 'CONSTANT_FLAT', repayment_frequency = 'DAILY', scheme_id = null
  } = loanData;

  const loanDate = new Date().toISOString().slice(0, 10);
  const mRate = monthly_interest_rate != null ? parseFloat(monthly_interest_rate) : parseFloat(interest_rate);
  const repaymentSchedule = repayment_method === 'EMI' ? generateEmiSchedule({
    principal: principal_amount,
    monthlyInterestRate: mRate,
    tenureMonths: (tenure_days || 120) / 30,
    repaymentFrequency: repayment_frequency,
    interestCalculation: interest_calculation,
    startDate: loanDate
  }) : null;

  const [result] = await db.execute(
    `INSERT INTO loans (company_id, loan_account_no, borrower_name, phone, principal_amount, total_payable, collected_amount, pending_amount, installment_amount, tenure_days, status, loan_date, monthly_interest_rate, repayment_method, interest_calculation, repayment_frequency, repayment_schedule, scheme_id)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?)`,
    [
      companyId,
      loan_account_no || `LN-${Date.now().toString().slice(-6)}`,
      borrower_name,
      phone,
      principal_amount,
      interest_rate,
      tenure_days,
      installment_amount,
      loanDate,
      mRate,
      repayment_method,
      interest_calculation,
      repayment_frequency,
      repaymentSchedule,
      scheme_id
    ]
  );

  return { id: result.insertId, ...loanData, company_id: companyId, status: 'ACTIVE' };
}

export async function recordCollection(db, companyId, collectorId, payload) {
  const { loan_id, amount, payment_mode = 'CASH', notes = '', payment_date } = payload;
  const paymentDate = payment_date || new Date().toISOString().slice(0, 10);

  // Interest owed (accrued day-by-day, or from the loan's fixed EMI schedule) is
  // always settled before principal — extra paid beyond what's owed accelerates
  // principal payoff instead of just prepaying future installments blindly.
  const [loanRows] = await db.query('SELECT * FROM loans WHERE id = ? AND company_id = ?', [loan_id, companyId]);
  const loan = loanRows[0];
  const allocation = calculatePaymentAllocation({ loan, paymentAmount: amount, paymentDate });

  const receiptNo = `REC-${paymentDate.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

  const [result] = await db.execute(
    `INSERT INTO collections (company_id, loan_id, collector_id, amount, payment_mode, notes, receipt_no, collection_date, principal_portion, interest_portion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [companyId, loan_id, collectorId, amount, payment_mode, notes, receiptNo, paymentDate, allocation.principalPortion, allocation.interestPortion]
  );

  // Update loan summary using the computed split, not the raw amount.
  await db.execute(
    `UPDATE loans
     SET collected_amount = collected_amount + ?,
         pending_amount = ?,
         last_payment_date = ?,
         repayment_schedule = ?,
         status = IF(? <= 0, 'CLOSED', status)
     WHERE id = ? AND company_id = ?`,
    [amount, allocation.newPendingPrincipal, paymentDate, allocation.updatedSchedule || loan?.repayment_schedule || null, allocation.newPendingPrincipal, loan_id, companyId]
  );

  return {
    collection_id: result.insertId,
    receipt_no: receiptNo,
    loan_id,
    amount,
    principal_portion: allocation.principalPortion,
    interest_portion: allocation.interestPortion,
    new_pending_balance: allocation.newPendingPrincipal,
    payment_mode,
    status: 'SUCCESS'
  };
}

export async function getCollectionsHistory(db, companyId) {
  const [rows] = await db.query(
    `SELECT c.*, l.borrower_name, l.loan_account_no, u.name as collector_name 
     FROM collections c
     JOIN loans l ON c.loan_id = l.id
     LEFT JOIN users u ON c.collector_id = u.id
     WHERE c.company_id = ?
     ORDER BY c.id DESC`,
    [companyId]
  );
  return rows;
}
