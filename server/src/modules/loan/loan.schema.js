export const createLoanSchema = {
  body: {
    type: 'object',
    required: ['borrower_name', 'phone', 'principal_amount', 'installment_amount', 'tenure_days'],
    properties: {
      loan_account_no: { type: 'string' },
      borrower_name: { type: 'string', minLength: 2 },
      phone: { type: 'string', minLength: 10 },
      principal_amount: { type: 'number', minimum: 1 },
      interest_rate: { type: 'number', minimum: 0, default: 10 },
      tenure_days: { type: 'integer', minimum: 1 },
      installment_amount: { type: 'number', minimum: 1 },
      monthly_interest_rate: { type: 'number', minimum: 0 },
      repayment_method: { type: 'string', enum: ['EMI', 'INTEREST_ONLY'], default: 'EMI' },
      interest_calculation: { type: 'string', enum: ['CONSTANT_FLAT', 'FLEXIBLE_REDUCING'], default: 'CONSTANT_FLAT' },
      repayment_frequency: { type: 'string', enum: ['DAILY', 'WEEKLY', 'MONTHLY'], default: 'DAILY' },
      scheme_id: { type: ['integer', 'null'] }
    }
  }
};

export const recordCollectionSchema = {
  body: {
    type: 'object',
    required: ['loan_id', 'amount'],
    properties: {
      loan_id: { type: 'integer' },
      amount: { type: 'number', minimum: 1 },
      payment_mode: { type: 'string', enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'], default: 'CASH' },
      notes: { type: 'string' },
      payment_date: { type: 'string' }
    }
  }
};
