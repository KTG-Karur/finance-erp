import { insertVoucherOnConnection } from '../../finance/ledger/ledger.service.js';

export async function createDisbursalVoucher(conn, { loanId, loanAccountNo, borrowerName, amount, entryDate, branch, createdBy }) {
  const totalAmount = parseFloat(amount);

  const result = await insertVoucherOnConnection(conn, {
    entry_date: entryDate,
    description: `Loan Disbursal to ${borrowerName} (${loanAccountNo})`,
    voucher_type: 'PAYMENT',
    is_auto: true,
    ref_type: 'DISBURSAL',
    ref_id: loanId,
    branch: branch || null,
    created_by: createdBy || null,
    lines: [
      { account_code: '1100', account_name: 'Loan Receivables Portfolio', debit: totalAmount, credit: 0, description: 'Loan Principal Receivable' },
      { account_code: '1001', account_name: 'Cash in Hand', debit: 0, credit: totalAmount, description: 'Cash Disbursal' }
    ]
  });

  return { entryId: result.id, voucherNo: result.voucher_no, totalAmount };
}

export async function createCollectionVoucher(conn, { collectionId, receiptNo, borrowerName, amount, principalPaid, interestPaid, penaltyPaid, entryDate, branch, createdBy }) {
  const totalAmount = parseFloat(amount);
  const pPaid = parseFloat(principalPaid) || 0;
  const iPaid = parseFloat(interestPaid) || 0;
  const penPaid = parseFloat(penaltyPaid) || 0;

  // Cash received (debit) must equal principal + interest + penalty (credits) —
  // omitting penalty here used to leave the voucher short by exactly the
  // penalty amount, which insertVoucherOnConnection's balance check below
  // would reject outright, failing the whole collection whenever a penalty
  // was collected. Each credit line is only included when its amount is
  // actually positive — a payment fully absorbed by interest (principalPaid
  // === 0, a real, common case for a small/partial payment) would otherwise
  // emit a Loan Receivables line with both debit and credit at zero, which
  // insertVoucherOnConnection now correctly rejects as a meaningless line.
  const lines = [
    { account_code: '1001', account_name: 'Cash in Hand', debit: totalAmount, credit: 0, description: 'Cash Received' }
  ];
  if (pPaid > 0) {
    lines.push({ account_code: '1100', account_name: 'Loan Receivables Portfolio', debit: 0, credit: pPaid, description: 'Principal Reduction' });
  }
  if (iPaid > 0) {
    lines.push({ account_code: '4001', account_name: 'Loan Interest Income', debit: 0, credit: iPaid, description: 'Interest Income Realized' });
  }
  if (penPaid > 0) {
    lines.push({ account_code: '4002', account_name: 'Loan Penalty / Overdue Fee Income', debit: 0, credit: penPaid, description: 'Penalty Income Realized' });
  }

  const result = await insertVoucherOnConnection(conn, {
    entry_date: entryDate,
    description: `Collection Receipt ${receiptNo} for ${borrowerName}`,
    voucher_type: 'RECEIPT',
    is_auto: true,
    ref_type: 'COLLECTION',
    ref_id: collectionId,
    branch: branch || null,
    created_by: createdBy || null,
    lines
  });

  return { entryId: result.id, voucherNo: result.voucher_no, totalAmount };
}

// Mirror image of createCollectionVoucher — used when a collection is reverted
// or a cheque bounces (see collection.service.js). Reverses exactly the lines
// the original voucher posted: cash goes back out, receivable/interest income
// go back up/down.
export async function createCollectionReversalVoucher(conn, { collectionId, receiptNo, borrowerName, amount, principalPaid, interestPaid, penaltyPaid, entryDate, narration, branch, createdBy }) {
  const totalAmount = parseFloat(amount);
  const pPaid = parseFloat(principalPaid) || 0;
  const iPaid = parseFloat(interestPaid) || 0;
  const penPaid = parseFloat(penaltyPaid) || 0;

  const lines = [];
  if (pPaid > 0) {
    lines.push({ account_code: '1100', account_name: 'Loan Receivables Portfolio', debit: pPaid, credit: 0, description: 'Principal Reinstated' });
  }
  if (iPaid > 0) {
    lines.push({ account_code: '4001', account_name: 'Loan Interest Income', debit: iPaid, credit: 0, description: 'Interest Income Reversed' });
  }
  if (penPaid > 0) {
    lines.push({ account_code: '4002', account_name: 'Loan Penalty / Overdue Fee Income', debit: penPaid, credit: 0, description: 'Penalty Income Reversed' });
  }
  lines.push({ account_code: '1001', account_name: 'Cash in Hand', debit: 0, credit: totalAmount, description: 'Cash Reversed' });

  const result = await insertVoucherOnConnection(conn, {
    entry_date: entryDate,
    description: narration || `Collection Reversal ${receiptNo} for ${borrowerName}`,
    voucher_type: 'RECEIPT',
    is_auto: true,
    ref_type: 'COLLECTION_REVERSAL',
    ref_id: collectionId,
    branch: branch || null,
    created_by: createdBy || null,
    lines
  });

  return { entryId: result.id, voucherNo: result.voucher_no, totalAmount };
}
