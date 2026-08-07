export function validateLoanCreationPayload(payload) {
  const errors = [];
  if (!payload.borrower_name || payload.borrower_name.trim().length < 2) {
    errors.push('Borrower name must be at least 2 characters.');
  }
  if (!payload.principal_amount || Number(payload.principal_amount) <= 0) {
    errors.push('Principal amount must be greater than zero.');
  }
  if (payload.monthly_interest_rate === undefined || Number(payload.monthly_interest_rate) < 0) {
    errors.push('Monthly interest rate cannot be negative.');
  }
  if (!payload.tenure_days || Number(payload.tenure_days) < 1) {
    errors.push('Tenure in days must be at least 1 day.');
  }
  if (errors.length) {
    const err = new Error(`Loan validation failed: ${errors.join(' ')}`);
    err.statusCode = 400;
    throw err;
  }
}
