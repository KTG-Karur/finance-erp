// Mock seed data for the Finance Operations modules (Customer Loans scheme linkage,
// Investor Capital, Fixed Deposits, Expense Categories, Chart of Accounts).
// Frontend-only — no backend. Same convention as mockAuthData.js: plain arrays,
// consumed as React useState initial values, mutated only via local state.

// Loan schemes have a real backend now (server/src/finance/scheme) — no mock seed
// data here anymore; App.jsx fetches them from /v1/finance/schemes.

// Investors are a Master-style record now — capital_amount/yield_rate are direct
// fields on the investor, not derived from a summed transaction ledger. A withdrawal
// is just editing capital_amount down (and/or setting status to EXITED with an
// exit_date); a yield payout is just a manual note in yield_notes. No auto-posting
// to the double-entry ledger — this module isn't wired into accounting at all.
export const INITIAL_INVESTORS = [
  {
    id: 1,
    investor_code: 'INV-1001',
    name: 'Venkatesh Capital Investments',
    phone: '9845012345',
    email: 'venkatesh@capitalinv.com',
    address: '78 Financial Hub, Main Branch',
    bank_name: 'HDFC Bank',
    account_holder_name: 'Venkatesh Capital Ltd',
    account_no: '50100234567891',
    ifsc_no: 'HDFC0001234',
    nominee_name: 'Srinivas Rao',
    nominee_phone: '9845012346',
    capital_amount: 2500000,
    join_date: '2026-01-10',
    yield_rate: 1,
    status: 'ACTIVE',
    exit_date: null
  },
  {
    id: 2,
    investor_code: 'INV-1002',
    name: 'Lakshmi Micro Ventures',
    phone: '9443210987',
    email: 'contact@lakshmiventures.com',
    address: '104 Commerce Park, East Branch',
    bank_name: 'ICICI Bank',
    account_holder_name: 'Lakshmi Ventures',
    account_no: '001205009876',
    ifsc_no: 'ICIC0000012',
    nominee_name: 'Sundaram Murthy',
    nominee_phone: '9443210988',
    capital_amount: 1200000,
    join_date: '2026-02-01',
    yield_rate: 1,
    status: 'ACTIVE',
    exit_date: null
  }
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

// Recurring Deposits: a customer pays a fixed amount every month for a chosen
// tenure and gets principal + interest back at maturity. Kept as a direct
// per-account entry (installment/tenure/rate all free-entry) — no scheme
// master — same depth as Fixed Deposits, plus a persisted monthly installment
// schedule (mirrors how EMI loans persist `repayment_schedule`) so paid/unpaid
// status can actually be tracked and collected against, one month at a time.
export function buildRdInstallments(monthlyInstallment, tenureMonths, bookingDate) {
  const rows = [];
  const start = new Date(`${bookingDate}T00:00:00Z`);
  for (let i = 1; i <= tenureMonths; i++) {
    const due = new Date(start);
    due.setUTCMonth(due.getUTCMonth() + i);
    rows.push({
      month_no: i,
      due_date: due.toISOString().slice(0, 10),
      amount: monthlyInstallment,
      status: 'PENDING',
      paid_date: null,
      voucher_no: null
    });
  }
  return rows;
}

export const INITIAL_RECURRING_DEPOSITS = [
  {
    id: 1,
    rd_account_no: 'RD-2026-001',
    borrower_id: 1,
    customer_name: 'Rajesh Kumar',
    monthly_installment: 2000,
    tenure_months: 12,
    interest_rate: 8,
    booking_date: '2026-02-01',
    maturity_date: '2027-02-01',
    maturity_value: 25040,
    collected_amount: 0,
    installments: buildRdInstallments(2000, 12, '2026-02-01'),
    status: 'ACTIVE' // 'ACTIVE' | 'MATURED' | 'CLOSED_PREMATURE'
  },
  {
    id: 2,
    rd_account_no: 'RD-2026-002',
    borrower_id: 3,
    customer_name: 'Suresh Patel',
    monthly_installment: 1000,
    tenure_months: 24,
    interest_rate: 8.5,
    booking_date: '2025-11-01',
    maturity_date: '2027-11-01',
    maturity_value: 26125,
    collected_amount: 0,
    installments: buildRdInstallments(1000, 24, '2025-11-01'),
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
  { id: 6, name: 'Miscellaneous Operating Expense', status: 'ACTIVE', balance: 5000, allocated_total: 5000 }
];

// Funding history for an Expense Allocation account — INITIAL funds a brand-new
// account, TOPUP replenishes a depleted one, EMERGENCY is an ad-hoc extra request tied
// to a specific urgent expense. Categories are funded directly (no approval step); this
// is just a chronological log of who added funds and why.
export const INITIAL_EXPENSE_ALLOCATION_REQUESTS = [
  {
    id: 1, category_id: 6, category_name: 'Miscellaneous Operating Expense', type: 'INITIAL',
    amount: 5000, reason: 'New account for ad-hoc branch expenses',
    requested_by: 'Sarah Collector', requested_at: '2026-07-24T10:35:00.000Z'
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
  { code: '2201', name: 'Recurring Deposits Payable', name_key: 'coa.rd_payable', type: 'LIABILITY' },
  { code: '4001', name: 'Interest Earned', name_key: 'coa.interest_income', type: 'REVENUE' },
  { code: '4002', name: 'Late Fees Collected', name_key: 'coa.penalty_income', type: 'REVENUE' },
  { code: '5001', name: 'Office Expenses', name_key: 'coa.operating_expenses', type: 'EXPENSE' },
  { code: '5002', name: 'Investor Yield Payouts', name_key: 'coa.investor_yield_expense', type: 'EXPENSE' },
  { code: '5003', name: 'Fixed Deposit Interest Expense', name_key: 'coa.fd_interest_expense', type: 'EXPENSE' },
  { code: '5004', name: 'Recurring Deposit Interest Expense', name_key: 'coa.rd_interest_expense', type: 'EXPENSE' },
  { code: '4099', name: 'Miscellaneous Income', name_key: 'coa.misc_income', type: 'REVENUE' },
  { code: '5099', name: 'Miscellaneous Expense', name_key: 'coa.misc_expense', type: 'EXPENSE' }
];

