export async function getActiveLoans(db, companyId) {
  const [loans] = await db.query(
    'SELECT * FROM loans WHERE company_id = ? ORDER BY id DESC',
    [companyId]
  );
  return loans;
}

export async function createLoan(db, companyId, loanData) {
  const { loan_account_no, borrower_name, phone, principal_amount, interest_rate = 10, tenure_days, installment_amount } = loanData;

  const [result] = await db.execute(
    `INSERT INTO loans (company_id, loan_account_no, borrower_name, phone, principal_amount, total_payable, collected_amount, pending_amount, installment_amount, tenure_days, status) 
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'ACTIVE')`,
    [
      companyId,
      loan_account_no || `LN-${Date.now().toString().slice(-6)}`,
      borrower_name,
      phone,
      principal_amount,
      interest_rate,
      tenure_days,
      installment_amount
    ]
  );

  return { id: result.insertId, ...loanData, company_id: companyId, status: 'ACTIVE' };
}

export async function recordCollection(db, companyId, collectorId, payload) {
  const { loan_id, amount, payment_mode = 'CASH', notes = '' } = payload;

  const receiptNo = `REC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(100 + Math.random() * 900)}`;

  const [result] = await db.execute(
    `INSERT INTO collections (company_id, loan_id, collector_id, amount, payment_mode, notes, receipt_no)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [companyId, loan_id, collectorId, amount, payment_mode, notes, receiptNo]
  );

  // Update loan summary
  await db.execute(
    `UPDATE loans 
     SET collected_amount = collected_amount + ?, 
         pending_amount = GREATEST(0, total_payable - (collected_amount + ?)),
         status = IF(total_payable - (collected_amount + ?) <= 0, 'CLOSED', 'ACTIVE')
     WHERE id = ? AND company_id = ?`,
    [amount, amount, amount, loan_id, companyId]
  );

  return {
    collection_id: result.insertId,
    receipt_no: receiptNo,
    loan_id,
    amount,
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
