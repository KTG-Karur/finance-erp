// Mock seed data for the Finance Operations modules (Customer Loans scheme linkage,
// Investor Capital, Fixed Deposits, Expense Categories, Chart of Accounts).
// Frontend-only — no backend. Same convention as mockAuthData.js: plain arrays,
// consumed as React useState initial values, mutated only via local state.

export const INITIAL_LOAN_SCHEMES = [
  {
    id: 1,
    name: 'Standard Microfinance Plan',
    unit_base: 1000, // per ₹1000
    rate_per_unit: 14.0, // % per annum on the unit base
    day_slabs: [
      { from_day: 1, to_day: 90, rate: 14.0 },
      { from_day: 91, to_day: 180, rate: 16.0 },
      { from_day: 181, to_day: 270, rate: 18.0 },
      { from_day: 271, to_day: null, rate: 22.0 } // null = open-ended (penalty slab)
    ],
    repayment_mode: 'FIXED_EMI', // 'INTEREST_ONLY' | 'FLEXIBLE' | 'FIXED_EMI'
    is_active: true
  },
  {
    id: 2,
    name: 'Gold Loan Prime Rate',
    unit_base: 100, // per ₹100
    rate_per_unit: 1.25,
    day_slabs: [
      { from_day: 1, to_day: 180, rate: 12.5 },
      { from_day: 181, to_day: null, rate: 15.0 }
    ],
    repayment_mode: 'INTEREST_ONLY',
    is_active: true
  },
  {
    id: 3,
    name: 'Chit Auction Standard Rate',
    unit_base: 1000,
    rate_per_unit: 18.0,
    day_slabs: [
      { from_day: 1, to_day: 90, rate: 18.0 },
      { from_day: 91, to_day: null, rate: 21.0 }
    ],
    repayment_mode: 'FLEXIBLE',
    is_active: true
  }
];

export const INITIAL_INVESTORS = [
  {
    id: 1,
    investor_code: 'INV-0001',
    name: 'Venkatesh Capital Investments',
    phone: '9845012345',
    email: 'venkatesh@capitalinv.com',
    address: '78 Financial Hub, Main Branch',
    kyc_status: 'VERIFIED',
    bank_name: 'HDFC Bank',
    account_holder_name: 'Venkatesh Capital Ltd',
    account_no: '50100234567891',
    ifsc_no: 'HDFC0001234',
    nominee_name: 'Srinivas Rao',
    nominee_phone: '9845012346',
    status: 'ACTIVE'
  },
  {
    id: 2,
    investor_code: 'INV-0002',
    name: 'Lakshmi Micro Ventures',
    phone: '9443210987',
    email: 'contact@lakshmiventures.com',
    address: '104 Commerce Park, East Branch',
    kyc_status: 'VERIFIED',
    bank_name: 'ICICI Bank',
    account_holder_name: 'Lakshmi Ventures',
    account_no: '001205009876',
    ifsc_no: 'ICIC0000012',
    nominee_name: 'Sundaram Murthy',
    nominee_phone: '9443210988',
    status: 'ACTIVE'
  }
];

export const INITIAL_INVESTOR_TRANSACTIONS = [
  { id: 1, investor_id: 1, type: 'CAPITAL_INJECTION', amount: 2000000, date: '2026-01-10', notes: 'Initial capital injection' },
  { id: 2, investor_id: 1, type: 'YIELD_PAYOUT', amount: 20000, date: '2026-02-10', notes: 'Monthly yield payout — Jan' },
  { id: 3, investor_id: 1, type: 'TOP_UP', amount: 500000, date: '2026-03-05', notes: 'Additional capital top-up' },
  { id: 4, investor_id: 2, type: 'CAPITAL_INJECTION', amount: 1200000, date: '2026-02-01', notes: 'Initial capital injection' },
  { id: 5, investor_id: 2, type: 'YIELD_PAYOUT', amount: 12000, date: '2026-03-01', notes: 'Monthly yield payout — Feb' }
];

export const INITIAL_FIXED_DEPOSITS = [
  {
    id: 1,
    fd_account_no: 'FD-2026-001',
    borrower_id: 1,
    customer_name: 'Rajesh Kumar',
    principal_amount: 100000,
    tenure_months: 12,
    interest_rate: 8.5,
    scheme: 'CUMULATIVE', // 'CUMULATIVE' | 'MONTHLY_PAYOUT'
    booking_date: '2026-01-15',
    maturity_date: '2027-01-15',
    maturity_value: 108500,
    status: 'ACTIVE' // 'ACTIVE' | 'MATURED' | 'CLOSED_PREMATURE'
  },
  {
    id: 2,
    fd_account_no: 'FD-2026-002',
    borrower_id: 2,
    customer_name: 'Priya Sharma',
    principal_amount: 250000,
    tenure_months: 24,
    interest_rate: 9.0,
    scheme: 'MONTHLY_PAYOUT',
    booking_date: '2025-08-01',
    maturity_date: '2027-08-01',
    maturity_value: 295000,
    status: 'ACTIVE'
  }
];

export const INITIAL_EXPENSE_CATEGORIES = [
  { id: 1, name: 'Office Rent', approval_threshold: 20000 },
  { id: 2, name: 'Electricity & Utilities', approval_threshold: 5000 },
  { id: 3, name: 'Staff Salary Payout', approval_threshold: 0 },
  { id: 4, name: 'Stationery & Printing', approval_threshold: 2000 },
  { id: 5, name: 'Field Travel Allowance', approval_threshold: 3000 },
  { id: 6, name: 'Miscellaneous Operating Expense', approval_threshold: 5000 }
];

export const INITIAL_EXPENSE_VOUCHERS = [
  { id: 101, voucher_no: 'EXP-20260724-01', payee: 'Indian Oil Fuel Pump', category: 'Field Travel Allowance', amount: 450, date: '2026-07-24', status: 'APPROVED', notes: '' },
  { id: 102, voucher_no: 'EXP-20260723-04', payee: 'Sri Krishna Stationery', category: 'Stationery & Printing', amount: 800, date: '2026-07-23', status: 'APPROVED', notes: '' },
  { id: 103, voucher_no: 'EXP-20260722-02', payee: 'BSNL Fiber Internet', category: 'Electricity & Utilities', amount: 1250, date: '2026-07-22', status: 'APPROVED', notes: '' }
];

export const INITIAL_CHART_OF_ACCOUNTS = [
  { id: 1, account_code: '1010', account_name: 'Branch Vault Cash', account_type: 'ASSET', parent_id: null },
  { id: 2, account_code: '1200', account_name: 'Loan Portfolio Outstanding', account_type: 'ASSET', parent_id: null },
  { id: 3, account_code: '2100', account_name: 'Investor Capital Payable', account_type: 'LIABILITY', parent_id: null },
  { id: 4, account_code: '2200', account_name: 'Fixed Deposit Liability', account_type: 'LIABILITY', parent_id: null },
  { id: 5, account_code: '4010', account_name: 'Loan Interest Income', account_type: 'REVENUE', parent_id: null },
  { id: 6, account_code: '5010', account_name: 'Investor Yield Expense', account_type: 'EXPENSE', parent_id: null },
  { id: 7, account_code: '5020', account_name: 'Operating Expenses', account_type: 'EXPENSE', parent_id: null }
];
