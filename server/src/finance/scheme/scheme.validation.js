import { FORMULA_TYPE, REPAYMENT_METHOD, INTEREST_CALCULATION, INTEREST_BASIS, ACCRUAL_MODE, REPAYMENT_FREQUENCY } from './scheme.constants.js';

export function validateSchemePayload(payload) {
  const errors = [];

  if (!payload.name || !String(payload.name).trim()) {
    errors.push('Scheme name is required.');
  }
  if (payload.rate_per_unit === undefined || payload.rate_per_unit === null || Number(payload.rate_per_unit) <= 0) {
    errors.push('Interest rate must be greater than zero.');
  }
  if (payload.formula_type && !Object.values(FORMULA_TYPE).includes(payload.formula_type)) {
    errors.push(`formula_type must be one of: ${Object.values(FORMULA_TYPE).join(', ')}`);
  }
  if (payload.repayment_method && !Object.values(REPAYMENT_METHOD).includes(payload.repayment_method)) {
    errors.push(`repayment_method must be one of: ${Object.values(REPAYMENT_METHOD).join(', ')}`);
  }
  if (payload.interest_calculation && !Object.values(INTEREST_CALCULATION).includes(payload.interest_calculation)) {
    errors.push(`interest_calculation must be one of: ${Object.values(INTEREST_CALCULATION).join(', ')}`);
  }
  if (payload.interest_basis && !Object.values(INTEREST_BASIS).includes(payload.interest_basis)) {
    errors.push(`interest_basis must be one of: ${Object.values(INTEREST_BASIS).join(', ')}`);
  }
  if (payload.repayment_frequency && !Object.values(REPAYMENT_FREQUENCY).includes(payload.repayment_frequency)) {
    errors.push(`repayment_frequency must be one of: ${Object.values(REPAYMENT_FREQUENCY).join(', ')}`);
  }
  if (payload.formula_type === FORMULA_TYPE.CUSTOM) {
    if (payload.accrual_mode && !Object.values(ACCRUAL_MODE).includes(payload.accrual_mode)) {
      errors.push(`accrual_mode must be one of: ${Object.values(ACCRUAL_MODE).join(', ')}`);
    }
    if (!payload.interest_formula || !payload.interest_formula.length) {
      errors.push('A custom scheme requires an interest formula.');
    }
  }
  if (payload.min_amount != null && payload.max_amount != null && Number(payload.min_amount) > Number(payload.max_amount)) {
    errors.push('Minimum amount cannot exceed maximum amount.');
  }
  if (payload.min_tenure_months != null && payload.max_tenure_months != null && Number(payload.min_tenure_months) > Number(payload.max_tenure_months)) {
    errors.push('Minimum tenure cannot exceed maximum tenure.');
  }

  if (errors.length) {
    const err = new Error(`Loan scheme validation failed: ${errors.join(' ')}`);
    err.statusCode = 400;
    throw err;
  }
}
