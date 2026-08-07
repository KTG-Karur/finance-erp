/**
 * Sequelize Tenant Migration: Standard Tenant Database Schema
 * Migration File: 20260807000001-create-tenant-tables.js
 * Location: server/src/tenant-configuration/migrations/20260807000001-create-tenant-tables.js
 */

export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;

  // 1. Borrowers Table
  await queryInterface.createTable('borrowers', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    borrower_code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    full_name: { type: DataTypes.STRING(255), allowNull: false },
    phone: { type: DataTypes.STRING(20), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: true },
    aadhaar: { type: DataTypes.STRING(20), allowNull: true },
    pan: { type: DataTypes.STRING(20), allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    guarantor_name: { type: DataTypes.STRING(255), allowNull: true },
    kyc_status: { type: DataTypes.ENUM('PENDING', 'VERIFIED', 'REJECTED'), defaultValue: 'PENDING' },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  // 2. Loan Schemes Table
  await queryInterface.createTable('loan_schemes', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    unit_base: { type: DataTypes.DECIMAL(15, 2), defaultValue: 1000 },
    rate_per_unit: { type: DataTypes.DECIMAL(8, 4), allowNull: false },
    repayment_mode: { type: DataTypes.ENUM('INTEREST_ONLY', 'FLEXIBLE', 'FIXED_EMI'), allowNull: false },
    repayment_frequency: { type: DataTypes.ENUM('DAILY', 'WEEKLY', 'MONTHLY'), allowNull: false },
    min_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    max_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    min_tenure_months: { type: DataTypes.INTEGER, defaultValue: 1 },
    max_tenure_months: { type: DataTypes.INTEGER, defaultValue: 60 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  // 3. Loans Table
  await queryInterface.createTable('loans', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    loan_account_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    borrower_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'borrowers', key: 'id' } },
    borrower_name: { type: DataTypes.STRING(255), allowNull: false },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    scheme_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'loan_schemes', key: 'id' } },
    branch: { type: DataTypes.STRING(100), defaultValue: 'Main Branch' },
    collector: { type: DataTypes.STRING(100), allowNull: true },
    principal_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    total_payable: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    collected_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    pending_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    installment_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    monthly_interest_rate: { type: DataTypes.DECIMAL(8, 4), allowNull: false },
    tenure_days: { type: DataTypes.INTEGER, allowNull: false },
    repayment_method: { type: DataTypes.STRING(50), allowNull: false },
    interest_calculation: { type: DataTypes.STRING(50), allowNull: false },
    repayment_frequency: { type: DataTypes.STRING(50), allowNull: false },
    status: { type: DataTypes.ENUM('PENDING', 'ACTIVE', 'OVERDUE', 'CLOSED', 'REJECTED'), defaultValue: 'PENDING' },
    dpd_days: { type: DataTypes.INTEGER, defaultValue: 0 },
    npa_status: { type: DataTypes.ENUM('STANDARD', 'SUB_STANDARD', 'DOUBTFUL', 'LOSS'), defaultValue: 'STANDARD' },
    loan_date: { type: DataTypes.DATEONLY, allowNull: false },
    next_due: { type: DataTypes.DATEONLY, allowNull: true },
    last_payment_date: { type: DataTypes.DATEONLY, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  // 4. Repayment Schedules Table
  await queryInterface.createTable('repayment_schedules', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    loan_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'loans', key: 'id' } },
    period: { type: DataTypes.INTEGER, allowNull: false },
    due_date: { type: DataTypes.DATEONLY, allowNull: false },
    principal: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    interest: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    emi: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    principal_paid: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    interest_paid: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    status: { type: DataTypes.ENUM('PENDING', 'PARTIAL', 'PAID'), defaultValue: 'PENDING' }
  });

  // 5. Collections Table
  await queryInterface.createTable('collections', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    receipt_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    loan_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'loans', key: 'id' } },
    borrower_name: { type: DataTypes.STRING(255), allowNull: false },
    collector_name: { type: DataTypes.STRING(100), allowNull: false },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    principal_paid: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    interest_paid: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    penalty: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    payment_mode: { type: DataTypes.ENUM('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'), defaultValue: 'CASH' },
    collection_date: { type: DataTypes.DATEONLY, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  // 6. Chart of Accounts Table
  await queryInterface.createTable('chart_of_accounts', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    account_code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    account_name: { type: DataTypes.STRING(255), allowNull: false },
    account_type: { type: DataTypes.ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'), allowNull: false },
    category: { type: DataTypes.STRING(100), allowNull: false },
    balance: { type: DataTypes.DECIMAL(18, 4), defaultValue: 0 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
  });

  // 7. Journal Entries Table
  await queryInterface.createTable('journal_entries', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    voucher_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    entry_date: { type: DataTypes.DATEONLY, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    voucher_type: { type: DataTypes.ENUM('RECEIPT', 'PAYMENT', 'JOURNAL', 'CONTRA'), defaultValue: 'JOURNAL' },
    is_auto: { type: DataTypes.BOOLEAN, defaultValue: false },
    total_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  // 8. Journal Lines Table
  await queryInterface.createTable('journal_lines', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    journal_entry_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'journal_entries', key: 'id' } },
    account_code: { type: DataTypes.STRING(20), allowNull: false },
    account_name: { type: DataTypes.STRING(255), allowNull: false },
    debit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    credit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    description: { type: DataTypes.STRING(255), allowNull: true }
  });

  // 9. Investors Table
  await queryInterface.createTable('investors', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    investor_code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    phone: { type: DataTypes.STRING(20), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    kyc_status: { type: DataTypes.ENUM('PENDING', 'VERIFIED', 'REJECTED'), defaultValue: 'VERIFIED' },
    bank_name: { type: DataTypes.STRING(100), allowNull: true },
    account_no: { type: DataTypes.STRING(50), allowNull: true },
    ifsc_no: { type: DataTypes.STRING(20), allowNull: true },
    status: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE'), defaultValue: 'ACTIVE' },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  // 10. Fixed Deposits Table
  await queryInterface.createTable('fixed_deposits', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    fd_account_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    customer_name: { type: DataTypes.STRING(255), allowNull: false },
    principal_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    tenure_months: { type: DataTypes.INTEGER, allowNull: false },
    interest_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    scheme: { type: DataTypes.ENUM('CUMULATIVE', 'MONTHLY_PAYOUT'), defaultValue: 'CUMULATIVE' },
    deposit_date: { type: DataTypes.DATEONLY, allowNull: false },
    maturity_date: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.ENUM('ACTIVE', 'MATURED', 'CLOSED'), defaultValue: 'ACTIVE' },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  // 11. Employees Table
  await queryInterface.createTable('employees', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    role: { type: DataTypes.ENUM('ADMIN', 'MANAGER', 'COLLECTOR'), defaultValue: 'COLLECTOR' },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('employees');
  await queryInterface.dropTable('fixed_deposits');
  await queryInterface.dropTable('investors');
  await queryInterface.dropTable('journal_lines');
  await queryInterface.dropTable('journal_entries');
  await queryInterface.dropTable('chart_of_accounts');
  await queryInterface.dropTable('collections');
  await queryInterface.dropTable('repayment_schedules');
  await queryInterface.dropTable('loans');
  await queryInterface.dropTable('loan_schemes');
  await queryInterface.dropTable('borrowers');
}
