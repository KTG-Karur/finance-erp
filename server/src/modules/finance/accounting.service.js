/**
 * Automated Double-Entry System General Ledger Accounting Service
 */

// Chart of Accounts Master Definition
export const CHART_OF_ACCOUNTS = [
  { code: '1001', name: 'Cash in Hand (Branch Vault)', type: 'ASSET', normalBalance: 'DEBIT' },
  { code: '1002', name: 'Bank Accounts (HDFC Operating)', type: 'ASSET', normalBalance: 'DEBIT' },
  { code: '1200', name: 'Gross Loan Portfolio Outstanding', type: 'ASSET', normalBalance: 'DEBIT' },
  { code: '2001', name: 'Promoter Capital Account', type: 'LIABILITY', normalBalance: 'CREDIT' },
  { code: '4001', name: 'Loan Interest Income', type: 'REVENUE', normalBalance: 'CREDIT' },
  { code: '4002', name: 'Late Fee & Fine Penalties', type: 'REVENUE', normalBalance: 'CREDIT' },
  { code: '5001', name: 'Field Collection & Conveyance Expenses', type: 'EXPENSE', normalBalance: 'DEBIT' },
  { code: '5002', name: 'Office Administrative Expenses', type: 'EXPENSE', normalBalance: 'DEBIT' }
];

/**
 * Creates automated Loan Disbursal Dual-Entry Journal
 */
export function createDisbursalJournalEntry({ loanId, loanAccountNo, amount, disbursalDate = new Date().toISOString().slice(0, 10) }) {
  return {
    voucher_no: `JV-DISB-${loanAccountNo}`,
    date: disbursalDate,
    description: `Loan Disbursal Disbursement for Account #${loanAccountNo}`,
    items: [
      { account_code: '1200', account_name: 'Gross Loan Portfolio Outstanding', debit: amount, credit: 0 },
      { account_code: '1001', account_name: 'Cash in Hand (Branch Vault)', debit: 0, credit: amount }
    ]
  };
}

/**
 * Creates automated Collection Receipt Knock-Off Dual-Entry Journal
 */
export function createCollectionJournalEntry({ receiptNo, borrowerName, amount, principalPortion, interestPortion, penaltyPortion = 0, collectionDate = new Date().toISOString().slice(0, 10) }) {
  const totalReceived = amount + penaltyPortion;

  return {
    voucher_no: `JV-COLLECT-${receiptNo}`,
    date: collectionDate,
    description: `Collection Receipt Knock-Off for ${borrowerName} (${receiptNo})`,
    items: [
      { account_code: '1001', account_name: 'Cash in Hand (Branch Vault)', debit: totalReceived, credit: 0 },
      { account_code: '1200', account_name: 'Gross Loan Portfolio Outstanding', debit: 0, credit: principalPortion },
      { account_code: '4001', account_name: 'Loan Interest Income', debit: 0, credit: interestPortion },
      ...(penaltyPortion > 0 ? [{ account_code: '4002', account_name: 'Late Fee & Fine Penalties', debit: 0, credit: penaltyPortion }] : [])
    ]
  };
}

/**
 * Calculates Income Statement (P&L)
 */
export function calculateIncomeStatement({ interestIncome, penaltyIncome, operatingExpenses }) {
  const grossRevenue = (parseFloat(interestIncome) || 0) + (parseFloat(penaltyIncome) || 0);
  const totalExpenses = parseFloat(operatingExpenses) || 0;
  const netOperatingProfit = grossRevenue - totalExpenses;

  return {
    gross_revenue: grossRevenue,
    operating_expenses: totalExpenses,
    net_profit: netOperatingProfit,
    ebitda_margin_pct: grossRevenue > 0 ? ((netOperatingProfit / grossRevenue) * 100).toFixed(2) : '0.00'
  };
}
