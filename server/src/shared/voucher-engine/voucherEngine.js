import { validateDoubleEntry } from '../accounting-engine/accountingEngine.js';

export async function createDisbursalVoucher(conn, { loanId, loanAccountNo, borrowerName, amount, entryDate }) {
  const voucherNo = `VOU-DISB-${loanId}-${Date.now().toString().slice(-4)}`;
  const dateStr = entryDate || new Date().toISOString().slice(0, 10);
  const totalAmount = parseFloat(amount);

  const lines = [
    { account_code: '1100', account_name: 'Loan Receivables Portfolio', debit: totalAmount, credit: 0, description: 'Loan Principal Receivable' },
    { account_code: '1001', account_name: 'Cash in Hand', debit: 0, credit: totalAmount, description: 'Cash Disbursal' }
  ];

  validateDoubleEntry(lines);

  const [vRes] = await conn.query(
    `INSERT INTO journal_entries (voucher_no, entry_date, description, voucher_type, is_auto, total_amount) VALUES (?, ?, ?, 'PAYMENT', 1, ?)`,
    [voucherNo, dateStr, `Loan Disbursal to ${borrowerName} (${loanAccountNo})`, totalAmount]
  );
  const entryId = vRes.insertId;

  await conn.query(
    `INSERT INTO journal_lines (journal_entry_id, account_code, account_name, debit, credit, description) VALUES
     (?, '1100', 'Loan Receivables Portfolio', ?, 0, 'Loan Principal Receivable'),
     (?, '1001', 'Cash in Hand', 0, ?, 'Cash Disbursal')`,
    [entryId, totalAmount, entryId, totalAmount]
  );

  return { entryId, voucherNo, totalAmount };
}

export async function createCollectionVoucher(conn, { collectionId, receiptNo, borrowerName, amount, principalPaid, interestPaid, penaltyPaid, entryDate }) {
  const voucherNo = `VOU-COLL-${collectionId}-${Date.now().toString().slice(-4)}`;
  const dateStr = entryDate || new Date().toISOString().slice(0, 10);
  const totalAmount = parseFloat(amount);
  const pPaid = parseFloat(principalPaid) || 0;
  const iPaid = parseFloat(interestPaid) || 0;
  const penPaid = parseFloat(penaltyPaid) || 0;

  // Cash received (debit) must equal principal + interest + penalty (credits) —
  // omitting penalty here used to leave the voucher short by exactly the
  // penalty amount, which validateDoubleEntry below would reject outright,
  // failing the whole collection whenever a penalty was collected.
  const lines = [
    { account_code: '1001', account_name: 'Cash in Hand', debit: totalAmount, credit: 0, description: 'Cash Received' },
    { account_code: '1100', account_name: 'Loan Receivables Portfolio', debit: 0, credit: pPaid, description: 'Principal Reduction' },
    { account_code: '4001', account_name: 'Loan Interest Income', debit: 0, credit: iPaid, description: 'Interest Income Realized' }
  ];
  if (penPaid > 0) {
    lines.push({ account_code: '4002', account_name: 'Loan Penalty / Overdue Fee Income', debit: 0, credit: penPaid, description: 'Penalty Income Realized' });
  }

  validateDoubleEntry(lines);

  const [vRes] = await conn.query(
    `INSERT INTO journal_entries (voucher_no, entry_date, description, voucher_type, is_auto, total_amount) VALUES (?, ?, ?, 'RECEIPT', 1, ?)`,
    [voucherNo, dateStr, `Collection Receipt ${receiptNo} for ${borrowerName}`, totalAmount]
  );
  const entryId = vRes.insertId;

  const lineValues = lines.map(l => [entryId, l.account_code, l.account_name, l.debit, l.credit, l.description]);
  await conn.query(
    `INSERT INTO journal_lines (journal_entry_id, account_code, account_name, debit, credit, description) VALUES ?`,
    [lineValues]
  );

  return { entryId, voucherNo, totalAmount };
}

// Mirror image of createCollectionVoucher — used when a collection is reverted
// or a cheque bounces (see collection.service.js). Reverses exactly the lines
// the original voucher posted: cash goes back out, receivable/interest income
// go back up/down.
export async function createCollectionReversalVoucher(conn, { collectionId, receiptNo, borrowerName, amount, principalPaid, interestPaid, penaltyPaid, entryDate, narration }) {
  const voucherNo = `VOU-REV-${collectionId}-${Date.now().toString().slice(-4)}`;
  const dateStr = entryDate || new Date().toISOString().slice(0, 10);
  const totalAmount = parseFloat(amount);
  const pPaid = parseFloat(principalPaid) || 0;
  const iPaid = parseFloat(interestPaid) || 0;
  const penPaid = parseFloat(penaltyPaid) || 0;

  const lines = [
    { account_code: '1100', account_name: 'Loan Receivables Portfolio', debit: pPaid, credit: 0, description: 'Principal Reinstated' },
    { account_code: '4001', account_name: 'Loan Interest Income', debit: iPaid, credit: 0, description: 'Interest Income Reversed' }
  ];
  if (penPaid > 0) {
    lines.push({ account_code: '4002', account_name: 'Loan Penalty / Overdue Fee Income', debit: penPaid, credit: 0, description: 'Penalty Income Reversed' });
  }
  lines.push({ account_code: '1001', account_name: 'Cash in Hand', debit: 0, credit: totalAmount, description: 'Cash Reversed' });

  validateDoubleEntry(lines);

  const [vRes] = await conn.query(
    `INSERT INTO journal_entries (voucher_no, entry_date, description, voucher_type, is_auto, total_amount) VALUES (?, ?, ?, 'RECEIPT', 1, ?)`,
    [voucherNo, dateStr, narration || `Collection Reversal ${receiptNo} for ${borrowerName}`, totalAmount]
  );
  const entryId = vRes.insertId;

  const lineValues = lines.map(l => [entryId, l.account_code, l.account_name, l.debit, l.credit, l.description]);
  await conn.query(
    `INSERT INTO journal_lines (journal_entry_id, account_code, account_name, debit, credit, description) VALUES ?`,
    [lineValues]
  );

  return { entryId, voucherNo, totalAmount };
}
