// Loans, borrowers, schemes, investors, fixed deposits, recurring deposits, and
// the expense allocation module all have real backends now — App.jsx fetches
// them, no mock seed data lives here for those anymore.
//
// Chart of Accounts and journal-entry posting remain a local, in-session
// simulation (App.jsx's postJournal) rather than the real `chart_of_accounts` /
// `journal_entries` tables — that's a separate, larger rewire of the whole
// ledger/voucher-posting engine, intentionally out of scope here.

// `name_key` resolves through the i18n dictionary (coa.* keys) so ledger names
// render in whichever language is active — `name` is only the English fallback
// for contexts without access to t().
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
