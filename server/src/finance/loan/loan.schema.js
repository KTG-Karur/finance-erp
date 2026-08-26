import { REPAYMENT_METHOD, INTEREST_CALCULATION, REPAYMENT_FREQUENCY } from './loan.constants.js';

export const createLoanSchema = {
  body: {
    type: 'object',
    required: ['borrower_name', 'principal_amount', 'monthly_interest_rate', 'tenure_days'],
    properties: {
      borrower_id: { type: ['integer', 'null'] },
      borrower_name: { type: 'string', minLength: 2 },
      phone: { type: 'string' },
      scheme_id: { type: ['integer', 'null'] },
      branch: { type: 'string' },
      collector: { type: ['string', 'null'] },
      principal_amount: { type: 'number', minimum: 100 },
      monthly_interest_rate: { type: 'number', minimum: 0 },
      tenure_days: { type: 'integer', minimum: 1 },
      repayment_method: { type: 'string', enum: Object.values(REPAYMENT_METHOD) },
      interest_calculation: { type: 'string', enum: Object.values(INTEREST_CALCULATION) },
      repayment_frequency: { type: 'string', enum: Object.values(REPAYMENT_FREQUENCY) },
      loan_date: { type: 'string', format: 'date' },
      guarantor: { type: ['object', 'string', 'null'] },
      purpose: { type: ['string', 'null'] },
      nominee: { type: ['object', 'string', 'null'] },
      security: { type: ['object', 'string', 'null'] }
    }
  }
};
