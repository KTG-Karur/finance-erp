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

export async function createCollectionVoucher(conn, { collectionId, receiptNo, borrowerName, amount, principalPaid, interestPaid, entryDate }) {
  const voucherNo = `VOU-COLL-${collectionId}-${Date.now().toString().slice(-4)}`;
  const dateStr = entryDate || new Date().toISOString().slice(0, 10);
  const totalAmount = parseFloat(amount);
  const pPaid = parseFloat(principalPaid);
  const iPaid = parseFloat(interestPaid);

  const lines = [
    { account_code: '1001', account_name: 'Cash in Hand', debit: totalAmount, credit: 0, description: 'Cash Received' },
    { account_code: '1100', account_name: 'Loan Receivables Portfolio', debit: 0, credit: pPaid, description: 'Principal Reduction' },
    { account_code: '4001', account_name: 'Loan Interest Income', debit: 0, credit: iPaid, description: 'Interest Income Realized' }
  ];

  validateDoubleEntry(lines);

  const [vRes] = await conn.query(
    `INSERT INTO journal_entries (voucher_no, entry_date, description, voucher_type, is_auto, total_amount) VALUES (?, ?, ?, 'RECEIPT', 1, ?)`,
    [voucherNo, dateStr, `Collection Receipt ${receiptNo} for ${borrowerName}`, totalAmount]
  );
  const entryId = vRes.insertId;

  await conn.query(
    `INSERT INTO journal_lines (journal_entry_id, account_code, account_name, debit, credit, description) VALUES
     (?, '1001', 'Cash in Hand', ?, 0, 'Cash Received'),
     (?, '1100', 'Loan Receivables Portfolio', 0, ?, 'Principal Reduction'),
     (?, '4001', 'Loan Interest Income', 0, ?, 'Interest Income Realized')`,
    [entryId, totalAmount, entryId, pPaid, entryId, iPaid]
  );

  return { entryId, voucherNo, totalAmount };
}
