import { insertVoucherOnConnection } from '../../finance/ledger/ledger.service.js';

export async function createDisbursalVoucher(conn, { 
  loanId, 
  loanAccountNo, 
  borrowerName, 
  amount, 
  entryDate, 
  branch, 
  createdBy,
  paymentMode = 'CASH',
  sourceAccountCode,
  sourceAccountName,
  transactionRef,
  processingFee = 0,
  advanceEmi = 0,
  otherDeductions = 0
}) {
  const grossPrincipal = parseFloat(amount) || 0;
  const procFee = parseFloat(processingFee) || 0;
  const advEmi = parseFloat(advanceEmi) || 0;
  const otherDed = parseFloat(otherDeductions) || 0;

  const totalDeductions = Math.round((procFee + advEmi + otherDed) * 100) / 100;
  const netDisbursed = Math.round((grossPrincipal - totalDeductions) * 100) / 100;

  if (netDisbursed < 0) {
    const err = new Error(`Net disbursal cannot be negative (Gross: ₹${grossPrincipal}, Deductions: ₹${totalDeductions}).`);
    err.statusCode = 400;
    throw err;
  }

  const isBank = (paymentMode || '').toUpperCase().includes('BANK') || (paymentMode || '').toUpperCase().includes('ONLINE') || (paymentMode || '').toUpperCase().includes('CHEQUE');
  
  const creditCode = sourceAccountCode || (isBank ? '1002' : '1001');
  const creditName = sourceAccountName || (isBank ? 'Bank Account' : 'Cash in Hand');
  const refText = transactionRef ? ` [Ref/UTR: ${transactionRef}]` : '';
  const modeText = isBank ? (paymentMode === 'CHEQUE' ? 'Cheque' : 'Bank Transfer') : 'Cash';
  const dedText = totalDeductions > 0 ? ` (Gross: ₹${grossPrincipal.toLocaleString('en-IN')}, Net Disbursed: ₹${netDisbursed.toLocaleString('en-IN')})` : '';

  const lines = [
    { account_code: '1100', account_name: 'Loan Receivables Portfolio', debit: grossPrincipal, credit: 0, description: 'Loan Principal Receivable' },
    { account_code: creditCode, account_name: creditName, debit: 0, credit: netDisbursed, description: `${modeText} Net Disbursal${refText}` }
  ];

  if (procFee > 0) {
    lines.push({ account_code: '4002', account_name: 'Loan Penalty / Overdue Fee Income', debit: 0, credit: procFee, description: 'Processing Fee Deducted at Source' });
  }
  if (advEmi > 0) {
    lines.push({ account_code: '2001', account_name: 'Advance EMI / Member Deposits', debit: 0, credit: advEmi, description: 'Advance EMI Deducted at Source' });
  }
  if (otherDed > 0) {
    lines.push({ account_code: '4099', account_name: 'Miscellaneous Income', debit: 0, credit: otherDed, description: 'Other Charges Deducted at Source' });
  }

  const result = await insertVoucherOnConnection(conn, {
    entry_date: entryDate,
    description: `Loan Disbursal to ${borrowerName} (${loanAccountNo}) via ${modeText}${refText}${dedText}`,
    voucher_type: 'PAYMENT',
    is_auto: true,
    ref_type: 'DISBURSAL',
    ref_id: loanId,
    branch: branch || null,
    created_by: createdBy || null,
    lines
  });

  return { entryId: result.id, voucherNo: result.voucher_no, totalAmount: grossPrincipal, netDisbursed };
}

export async function createCollectionVoucher(conn, { collectionId, receiptNo, borrowerName, amount, principalPaid, interestPaid, penaltyPaid, entryDate, branch, createdBy, paymentMode = 'CASH' }) {
  const totalAmount = parseFloat(amount);
  const pPaid = parseFloat(principalPaid) || 0;
  const iPaid = parseFloat(interestPaid) || 0;
  const penPaid = parseFloat(penaltyPaid) || 0;

  // This used to hardcode account 1001 (Cash in Hand) for every collection
  // regardless of how it was actually received — a UPI/Bank Transfer/Cheque
  // payment never touched a vault, but was posted as if it had, inflating
  // Cash in Hand (and therefore Day-End Closing's "Expected Closing Cash")
  // by the full amount of every non-cash collection ever recorded. Routes to
  // Bank (1002) for non-cash modes instead, matching how createDisbursalVoucher
  // already branches on payment mode just above.
  const isBank = (paymentMode || '').toUpperCase() !== 'CASH';
  const debitCode = isBank ? '1002' : '1001';
  const debitName = isBank ? 'Bank Account' : 'Cash in Hand';

  // Cash/Bank received (debit) must equal principal + interest + penalty (credits) —
  // omitting penalty here used to leave the voucher short by exactly the
  // penalty amount, which insertVoucherOnConnection's balance check below
  // would reject outright, failing the whole collection whenever a penalty
  // was collected. Each credit line is only included when its amount is
  // actually positive — a payment fully absorbed by interest (principalPaid
  // === 0, a real, common case for a small/partial payment) would otherwise
  // emit a Loan Receivables line with both debit and credit at zero, which
  // insertVoucherOnConnection now correctly rejects as a meaningless line.
  const lines = [
    { account_code: debitCode, account_name: debitName, debit: totalAmount, credit: 0, description: `${isBank ? paymentMode : 'Cash'} Received` }
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
export async function createCollectionReversalVoucher(conn, { collectionId, receiptNo, borrowerName, amount, principalPaid, interestPaid, penaltyPaid, entryDate, narration, branch, createdBy, paymentMode = 'CASH' }) {
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
  // Must reverse whichever account the original collection actually debited —
  // a reversal always has to mirror-image the specific voucher it's undoing,
  // not assume everything was cash (see createCollectionVoucher above).
  const isBank = (paymentMode || '').toUpperCase() !== 'CASH';
  lines.push({
    account_code: isBank ? '1002' : '1001',
    account_name: isBank ? 'Bank Account' : 'Cash in Hand',
    debit: 0,
    credit: totalAmount,
    description: `${isBank ? paymentMode : 'Cash'} Reversed`
  });

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

export async function createPreclosureVoucher(conn, {
  loanId,
  loanAccountNo,
  receiptNo,
  borrowerName,
  totalAmount,
  principalPaid,
  interestPaid,
  penaltyPaid = 0,
  foreclosureFee = 0,
  entryDate,
  branch,
  createdBy,
  paymentMode = 'CASH',
  transactionRef = ''
}) {
  const tot = parseFloat(totalAmount) || 0;
  const pPaid = parseFloat(principalPaid) || 0;
  const iPaid = parseFloat(interestPaid) || 0;
  const penPaid = parseFloat(penaltyPaid) || 0;
  const fcFee = parseFloat(foreclosureFee) || 0;

  const isBank = (paymentMode || '').toUpperCase().includes('BANK') ||
                 (paymentMode || '').toUpperCase().includes('ONLINE') ||
                 (paymentMode || '').toUpperCase().includes('UPI') ||
                 (paymentMode || '').toUpperCase().includes('CHEQUE');
  const debitCode = isBank ? '1002' : '1001';
  const debitName = isBank ? 'Bank Account' : 'Cash in Hand';
  const refText = transactionRef ? ` [Ref: ${transactionRef}]` : '';

  const lines = [
    { account_code: debitCode, account_name: debitName, debit: tot, credit: 0, description: `Preclosure Settlement Receipt (${paymentMode})${refText}` }
  ];

  if (pPaid > 0) {
    lines.push({ account_code: '1100', account_name: 'Loan Receivables Portfolio', debit: 0, credit: pPaid, description: 'Loan Principal Cleared' });
  }
  if (iPaid > 0) {
    lines.push({ account_code: '4001', account_name: 'Loan Interest Income', debit: 0, credit: iPaid, description: 'Interest Realized on Settlement' });
  }
  if (penPaid > 0) {
    lines.push({ account_code: '4002', account_name: 'Loan Penalty / Overdue Fee Income', debit: 0, credit: penPaid, description: 'Overdue Penalty Realized' });
  }
  if (fcFee > 0) {
    lines.push({ account_code: '4002', account_name: 'Loan Penalty / Overdue Fee Income', debit: 0, credit: fcFee, description: 'Foreclosure / Preclosure Charges' });
  }

  const result = await insertVoucherOnConnection(conn, {
    entry_date: entryDate,
    description: `Loan Preclosure Settlement: ${borrowerName} (${loanAccountNo}) via ${paymentMode}${refText}`,
    voucher_type: 'RECEIPT',
    is_auto: true,
    ref_type: 'LOAN_PRECLOSURE',
    ref_id: loanId,
    branch: branch || null,
    created_by: createdBy || null,
    lines
  });

  return { entryId: result.id, voucherNo: result.voucher_no, totalAmount: tot };
}

export async function createEmergencyCloseVoucher(conn, {
  loanId,
  loanAccountNo,
  receiptNo,
  borrowerName,
  recoveryAmount = 0,
  writtenOffAmount = 0,
  reasonCategory,
  reasonDetails,
  entryDate,
  branch,
  createdBy,
  paymentMode = 'CASH',
  transactionRef = ''
}) {
  const rec = parseFloat(recoveryAmount) || 0;
  const woff = parseFloat(writtenOffAmount) || 0;
  const totalCleared = Math.round((rec + woff) * 100) / 100;

  const isBank = (paymentMode || '').toUpperCase().includes('BANK') ||
                 (paymentMode || '').toUpperCase().includes('ONLINE') ||
                 (paymentMode || '').toUpperCase().includes('UPI') ||
                 (paymentMode || '').toUpperCase().includes('CHEQUE');
  const debitCode = isBank ? '1002' : '1001';
  const debitName = isBank ? 'Bank Account' : 'Cash in Hand';
  const refText = transactionRef ? ` [Ref: ${transactionRef}]` : '';

  const lines = [];
  if (rec > 0) {
    lines.push({ account_code: debitCode, account_name: debitName, debit: rec, credit: 0, description: `Compromise Settlement Recovery (${paymentMode})${refText}` });
  }
  if (woff > 0) {
    lines.push({ account_code: '5001', account_name: 'Bad Debt Provision Expense', debit: woff, credit: 0, description: `Loan Loss Write-off: ${reasonCategory || 'Compromise'}` });
  }

  lines.push({ account_code: '1100', account_name: 'Loan Receivables Portfolio', debit: 0, credit: totalCleared, description: 'Loan Account Fully Terminated' });

  const result = await insertVoucherOnConnection(conn, {
    entry_date: entryDate,
    description: `Emergency / Compromise Loan Closure: ${borrowerName} (${loanAccountNo}) - Reason: ${reasonCategory || 'Emergency'}`,
    voucher_type: 'JOURNAL',
    is_auto: true,
    ref_type: 'LOAN_EMERGENCY_CLOSE',
    ref_id: loanId,
    branch: branch || null,
    created_by: createdBy || null,
    lines
  });

  return { entryId: result.id, voucherNo: result.voucher_no, totalCleared, recoveryAmount: rec, writtenOffAmount: woff };
}

