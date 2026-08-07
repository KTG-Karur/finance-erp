/**
 * Sequelize Tenant Seeder: Initial Seed Data for Tenant Databases
 * Location: server/src/tenant-configuration/seeders/tenantSeeders.js
 * Populates Chart of Accounts, Default Loan Schemes, Initial Borrowers, and Sample Active Loans.
 */

export async function up(queryInterface, Sequelize) {
  // 1. Chart of Accounts Defaults
  await queryInterface.bulkInsert('chart_of_accounts', [
    { account_code: '1001', account_name: 'Cash in Hand', account_type: 'ASSET', category: 'CURRENT_ASSETS', balance: 150000.00, is_active: true },
    { account_code: '1002', account_name: 'HDFC Bank Account', account_type: 'ASSET', category: 'BANK_ACCOUNTS', balance: 500000.00, is_active: true },
    { account_code: '1100', account_name: 'Loan Receivables Portfolio', account_type: 'ASSET', category: 'LOAN_PORTFOLIO', balance: 0.00, is_active: true },
    { account_code: '2001', account_name: 'Promoter Share Capital', account_type: 'EQUITY', category: 'CAPITAL', balance: 650000.00, is_active: true },
    { account_code: '4001', account_name: 'Loan Interest Income', account_type: 'REVENUE', category: 'OPERATING_INCOME', balance: 0.00, is_active: true },
    { account_code: '4002', account_name: 'Loan Penalty / Overdue Fee Income', account_type: 'REVENUE', category: 'OTHER_INCOME', balance: 0.00, is_active: true },
    { account_code: '5001', account_name: 'Bad Debt Provision Expense', account_type: 'EXPENSE', category: 'PROVISIONS', balance: 0.00, is_active: true },
    { account_code: '5002', account_name: 'Branch Operating Expenses', account_type: 'EXPENSE', category: 'ADMINISTRATIVE', balance: 0.00, is_active: true }
  ]);

  // 2. Default Loan Schemes
  await queryInterface.bulkInsert('loan_schemes', [
    {
      name: 'Standard Daily Collection Scheme',
      unit_base: 1000.00,
      rate_per_unit: 10.0000,
      repayment_mode: 'FIXED_EMI',
      repayment_frequency: 'DAILY',
      min_amount: 5000.00,
      max_amount: 100000.00,
      min_tenure_months: 1,
      max_tenure_months: 6,
      is_active: true
    },
    {
      name: 'Flexible Reducing Interest Scheme',
      unit_base: 1000.00,
      rate_per_unit: 18.0000,
      repayment_mode: 'FLEXIBLE',
      repayment_frequency: 'MONTHLY',
      min_amount: 25000.00,
      max_amount: 500000.00,
      min_tenure_months: 3,
      max_tenure_months: 36,
      is_active: true
    }
  ]);

  // 3. Initial Sample Borrowers
  await queryInterface.bulkInsert('borrowers', [
    {
      borrower_code: 'BR-0001',
      full_name: 'Rajesh Kumar',
      phone: '9876543210',
      email: 'rajesh@example.com',
      aadhaar: '458912348971',
      pan: 'ABCDE1234F',
      address: 'Main St 123, Chennai, Tamil Nadu',
      guarantor_name: 'Mahesh Kumar',
      kyc_status: 'VERIFIED'
    },
    {
      borrower_code: 'BR-0002',
      full_name: 'Priya Sharma',
      phone: '9812345678',
      email: 'priya@example.com',
      aadhaar: '891234567890',
      pan: 'XYZPD9876K',
      address: 'Market Road 45, Chennai, Tamil Nadu',
      guarantor_name: 'Sunil Sharma',
      kyc_status: 'VERIFIED'
    }
  ]);
}

export async function down(queryInterface) {
  await queryInterface.bulkDelete('borrowers', null, {});
  await queryInterface.bulkDelete('loan_schemes', null, {});
  await queryInterface.bulkDelete('chart_of_accounts', null, {});
}
