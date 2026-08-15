export function validateDoubleEntry(lines) {
  if (!lines || !lines.length) {
    const err = new Error('Journal voucher must contain at least 2 journal lines.');
    err.statusCode = 400;
    throw err;
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    totalDebit += parseFloat(line.debit || 0);
    totalCredit += parseFloat(line.credit || 0);
  }

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    const err = new Error(`Double-entry accounting violation: Total Debit (${totalDebit.toFixed(2)}) does not equal Total Credit (${totalCredit.toFixed(2)}).`);
    err.statusCode = 400;
    throw err;
  }

  return { totalDebit, totalCredit, isBalanced: true };
}
