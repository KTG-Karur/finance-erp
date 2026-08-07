// Mock seed data for the Finance Operations modules (Customer Loans scheme linkage,
// Investor Capital, Fixed Deposits, Expense Categories, Chart of Accounts).
// Frontend-only — no backend. Same convention as mockAuthData.js: plain arrays,
// consumed as React useState initial values, mutated only via local state.

export const INITIAL_LOAN_SCHEMES = [
  {
    id: 1,
    name: 'Standard Microfinance Plan',
    unit_base: 1000, // per ₹1000
    rate_per_unit: 2.0, // monthly interest rate (%) — drives EMI calculation directly
    repayment_mode: 'FIXED_EMI', // 'INTEREST_ONLY' | 'FLEXIBLE' | 'FIXED_EMI'
    repayment_frequency: 'DAILY', // 'DAILY' | 'WEEKLY' | 'MONTHLY'
    min_amount: 5000,
    max_amount: 200000,
    min_tenure_months: 2,
    max_tenure_months: 12,
    is_active: true
  },
  {
    id: 2,
    name: 'Gold Loan Prime Rate',
    unit_base: 100, // per ₹100
    rate_per_unit: 1.25,
    repayment_mode: 'INTEREST_ONLY',
    repayment_frequency: 'MONTHLY',
    min_amount: 10000,
    max_amount: 500000,
    min_tenure_months: 3,
    max_tenure_months: 24,
    is_active: true
  },
  {
    id: 3,
    name: 'Chit Auction Standard Rate',
    unit_base: 1000,
    rate_per_unit: 1.8,
    repayment_mode: 'FLEXIBLE',
    repayment_frequency: 'WEEKLY',
    min_amount: 10000,
    max_amount: 300000,
    min_tenure_months: 3,
    max_tenure_months: 18,
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

// Expense Allocation: each category is a funded "account" — it starts PENDING with
// zero balance, becomes ACTIVE (and spendable) only once an admin approves the
// requested allocation amount. Vouchers then draw down `balance` directly.
export const INITIAL_EXPENSE_CATEGORIES = [
  { id: 1, name: 'Office Rent', status: 'ACTIVE', balance: 15000, allocated_total: 20000 },
  { id: 2, name: 'Electricity & Utilities', status: 'ACTIVE', balance: 3750, allocated_total: 5000 },
  { id: 3, name: 'Staff Salary Payout', status: 'ACTIVE', balance: 0, allocated_total: 50000 },
  { id: 4, name: 'Stationery & Printing', status: 'ACTIVE', balance: 1200, allocated_total: 2000 },
  { id: 5, name: 'Field Travel Allowance', status: 'ACTIVE', balance: 2550, allocated_total: 3000 },
  { id: 6, name: 'Miscellaneous Operating Expense', status: 'PENDING', balance: 0, allocated_total: 0 }
];

// Approval requests against an Expense Allocation account — INITIAL funds a brand-new
// account, TOPUP replenishes a depleted one, EMERGENCY is an ad-hoc extra request tied
// to a specific urgent expense. All three follow the same PENDING -> APPROVED/REJECTED
// admin approval flow.
export const INITIAL_EXPENSE_ALLOCATION_REQUESTS = [
  {
    id: 1, category_id: 6, category_name: 'Miscellaneous Operating Expense', type: 'INITIAL',
    amount: 5000, reason: 'New account for ad-hoc branch expenses',
    status: 'PENDING', requested_by: 'Sarah Collector', requested_at: '2026-07-24T10:35:00.000Z',
    approved_by: null, approved_at: null, rejection_reason: null
  }
];

export const INITIAL_EXPENSE_VOUCHERS = [
  { id: 101, voucher_no: 'EXP-20260724-01', payee: 'Indian Oil Fuel Pump', category_id: 5, category: 'Field Travel Allowance', amount: 450, date: '2026-07-24', status: 'APPROVED', notes: '' },
  { id: 102, voucher_no: 'EXP-20260723-04', payee: 'Sri Krishna Stationery', category_id: 4, category: 'Stationery & Printing', amount: 800, date: '2026-07-23', status: 'APPROVED', notes: '' },
  { id: 103, voucher_no: 'EXP-20260722-02', payee: 'BSNL Fiber Internet', category_id: 2, category: 'Electricity & Utilities', amount: 1250, date: '2026-07-22', status: 'APPROVED', notes: '' }
];

// Standard Chart of Accounts (double-entry). `name_key` resolves through the i18n
// dictionary (coa.* keys) so ledger names render in whichever language is active —
// `name` is only the English fallback for contexts without access to t().
export const INITIAL_CHART_OF_ACCOUNTS = [
  { code: '1001', name: 'Cash in Office', name_key: 'coa.cash_in_hand', type: 'ASSET' },
  { code: '1002', name: 'Bank Account', name_key: 'coa.bank_account', type: 'ASSET' },
  { code: '1200', name: 'Loans Given to Customers', name_key: 'coa.loan_portfolio', type: 'ASSET' },
  { code: '2001', name: "Owner's Investment", name_key: 'coa.capital_account', type: 'EQUITY' },
  { code: '2100', name: 'Investor Capital', name_key: 'coa.investor_capital', type: 'LIABILITY' },
  { code: '2200', name: 'Fixed Deposits Payable', name_key: 'coa.fd_payable', type: 'LIABILITY' },
  { code: '4001', name: 'Interest Earned', name_key: 'coa.interest_income', type: 'REVENUE' },
  { code: '4002', name: 'Late Fees Collected', name_key: 'coa.penalty_income', type: 'REVENUE' },
  { code: '5001', name: 'Office Expenses', name_key: 'coa.operating_expenses', type: 'EXPENSE' },
  { code: '5002', name: 'Investor Yield Payouts', name_key: 'coa.investor_yield_expense', type: 'EXPENSE' },
  { code: '5003', name: 'Fixed Deposit Interest Expense', name_key: 'coa.fd_interest_expense', type: 'EXPENSE' },
  { code: '4099', name: 'Miscellaneous Income', name_key: 'coa.misc_income', type: 'REVENUE' },
  { code: '5099', name: 'Miscellaneous Expense', name_key: 'coa.misc_expense', type: 'EXPENSE' }
];

