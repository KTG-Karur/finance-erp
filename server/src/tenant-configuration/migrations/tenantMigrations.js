/**
 * Sequelize Tenant Migration: Tenant Database Schema
 * Location: server/src/tenant-configuration/migrations/tenantMigrations.js
 * Handles borrowers, loan schemes, loans, repayment schedules, collections, chart of accounts, double-entry ledger, investors, fixed deposits, expense allocation, recurring deposits, and end-of-day close.
 */

export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;

  // 0a. Users Table — the tenant's own staff directory. Company login
  // (auth.service.js authenticateTenantUserByCode) reads this table directly, keyed
  // by company_id (always 1 within a single-tenant DB, kept for schema parity with
  // multi-company-per-DB deployments).
  await queryInterface.createTable('users', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    name: { type: DataTypes.STRING(255), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    photo: { type: DataTypes.MEDIUMTEXT, allowNull: true },
    password: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.ENUM('COMPANY_ADMIN', 'ADMIN', 'COLLECTOR', 'MANAGER', 'STAFF'), defaultValue: 'STAFF' },
    status: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE'), defaultValue: 'ACTIVE' },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  // 0b. Sub-Companies Table — org.service.js's sub-company CRUD (currently
  // unreachable from the UI, no screen for it yet, but the API endpoints exist and
  // need a real table to query).
  await queryInterface.createTable('sub_companies', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    name: { type: DataTypes.STRING(150), allowNull: false },
    code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  // 0c. Branches Table — read by auth.controller.js's company-lookup step
  // (`SELECT * FROM branches WHERE company_id = ?` against the tenant DB) to list a
  // company's branches on the login screen.
  await queryInterface.createTable('branches', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    sub_company_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'sub_companies', key: 'id' } },
    name: { type: DataTypes.STRING(150), allowNull: false },
    code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    city: { type: DataTypes.STRING(100), allowNull: true },
    state: { type: DataTypes.STRING(100), allowNull: true },
    pincode: { type: DataTypes.STRING(10), allowNull: true },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  // 0d. Employee Permissions Table — read by plugins/moduleGuard.js for
  // non-admin/non-super-admin roles. Missing rows just mean "allowed" (see
  // moduleGuard's default), so this table only needs to exist, not be populated.
  // company_id is required — employee.service.js's getAllEmployees/
  // updateEmployeePermissions both filter/insert on it.
  await queryInterface.createTable('employee_permissions', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    module: { type: DataTypes.STRING(50), allowNull: false },
    action: { type: DataTypes.STRING(50), allowNull: false },
    allowed: { type: DataTypes.BOOLEAN, defaultValue: true }
  });

  // 0e. User <-> Branch Assignments — auth.service.js's resolveUserBranches,
  // employee.service.js's updateEmployeeBranches, org.service.js's delete-branch
  // guard all query this; it never had a table at all before this revision.
  await queryInterface.createTable('user_branches', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    branch_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'branches', key: 'id' } }
  });

  // 1. Borrowers Table — column names/set match the actual KYC form
  // (client/src/finance/borrowers/CustomerFormPage.jsx) field-for-field.
  await queryInterface.createTable('borrowers', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    borrower_code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    full_name: { type: DataTypes.STRING(255), allowNull: false },
    father_spouse_name: { type: DataTypes.STRING(255), allowNull: true },
    phone: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    alt_phone: { type: DataTypes.STRING(20), allowNull: true },
    email: { type: DataTypes.STRING(255), allowNull: true },
    dob: { type: DataTypes.DATEONLY, allowNull: true },
    gender: { type: DataTypes.ENUM('MALE', 'FEMALE', 'OTHER'), allowNull: true },
    marital_status: { type: DataTypes.STRING(20), allowNull: true },
    address_line1: { type: DataTypes.STRING(255), allowNull: true },
    address_line2: { type: DataTypes.STRING(255), allowNull: true },
    city: { type: DataTypes.STRING(100), allowNull: true },
    state: { type: DataTypes.STRING(100), allowNull: true },
    pincode: { type: DataTypes.STRING(10), allowNull: true },
    id_proof_type: { type: DataTypes.STRING(50), allowNull: true },
    aadhaar_number: { type: DataTypes.STRING(20), allowNull: true },
    pan_number: { type: DataTypes.STRING(20), allowNull: true },
    voter_id: { type: DataTypes.STRING(30), allowNull: true },
    occupation: { type: DataTypes.STRING(100), allowNull: true },
    monthly_income: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    employer_name: { type: DataTypes.STRING(255), allowNull: true },
    bank_name: { type: DataTypes.STRING(100), allowNull: true },
    account_number: { type: DataTypes.STRING(50), allowNull: true },
    ifsc_code: { type: DataTypes.STRING(20), allowNull: true },
    guarantor_name: { type: DataTypes.STRING(255), allowNull: true },
    guarantor_phone: { type: DataTypes.STRING(20), allowNull: true },
    nominee_name: { type: DataTypes.STRING(255), allowNull: true },
    nominee_relation: { type: DataTypes.STRING(50), allowNull: true },
    branch: { type: DataTypes.STRING(100), allowNull: true },
    status: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE'), defaultValue: 'ACTIVE' },
    notes: { type: DataTypes.TEXT, allowNull: true },
    profile_image: { type: DataTypes.MEDIUMTEXT, allowNull: true },
    documents: { type: DataTypes.JSON, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  // 2. Loan Schemes Table
  // Two independent axes drive every repayment calculation (see
  // client/src/utils/loanCalculations.js): repayment_method x interest_calculation.
  // `formula_type` = 'CUSTOM' schemes additionally carry accrual_mode + the two
  // formula token arrays instead of relying on the built-in EMI/Interest-Only math.
  await queryInterface.createTable('loan_schemes', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    unit_base: { type: DataTypes.DECIMAL(15, 2), defaultValue: 100 },
    rate_per_unit: { type: DataTypes.DECIMAL(8, 4), allowNull: false },
    formula_type: { type: DataTypes.ENUM('STANDARD', 'CUSTOM'), allowNull: false, defaultValue: 'STANDARD' },
    repayment_method: { type: DataTypes.ENUM('EMI', 'INTEREST_ONLY'), allowNull: false, defaultValue: 'EMI' },
    interest_calculation: { type: DataTypes.ENUM('CONSTANT_FLAT', 'FLEXIBLE_REDUCING'), allowNull: false, defaultValue: 'CONSTANT_FLAT' },
    interest_basis: { type: DataTypes.ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'ANNUAL'), allowNull: false, defaultValue: 'MONTHLY' },
    accrual_mode: { type: DataTypes.ENUM('LIVE', 'SCHEDULED'), allowNull: true },
    interest_formula: { type: DataTypes.JSON, allowNull: true },
    installment_formula: { type: DataTypes.JSON, allowNull: true },
    custom_formula_name: { type: DataTypes.STRING(150), allowNull: true },
    repayment_frequency: { type: DataTypes.ENUM('DAILY', 'WEEKLY', 'MONTHLY'), allowNull: false },
    min_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    max_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    min_tenure_months: { type: DataTypes.INTEGER, defaultValue: 1 },
    max_tenure_months: { type: DataTypes.INTEGER, defaultValue: 60 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  // 3. Loans Table — nominee/security are captured as JSON since they're
  // application-time snapshots (nominee details, security-document details) with
  // no independent lifecycle of their own, same treatment as interest_formula above.
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
    formula_type: { type: DataTypes.ENUM('STANDARD', 'CUSTOM'), defaultValue: 'STANDARD' },
    accrual_mode: { type: DataTypes.ENUM('LIVE', 'SCHEDULED'), allowNull: true },
    interest_formula: { type: DataTypes.JSON, allowNull: true },
    installment_formula: { type: DataTypes.JSON, allowNull: true },
    aadhaar: { type: DataTypes.STRING(20), allowNull: true },
    pan: { type: DataTypes.STRING(20), allowNull: true },
    guarantor: { type: DataTypes.STRING(255), allowNull: true },
    purpose: { type: DataTypes.STRING(255), allowNull: true },
    nominee: { type: DataTypes.JSON, allowNull: true },
    security: { type: DataTypes.JSON, allowNull: true },
    status: { type: DataTypes.ENUM('PENDING', 'ACTIVE', 'OVERDUE', 'CLOSED', 'REJECTED'), defaultValue: 'PENDING' },
    dpd_days: { type: DataTypes.INTEGER, defaultValue: 0 },
    npa_status: { type: DataTypes.ENUM('STANDARD', 'SUB_STANDARD', 'DOUBTFUL', 'LOSS'), defaultValue: 'STANDARD' },
    closure_requested_at: { type: DataTypes.DATE, allowNull: true },
    closure_requested_by: { type: DataTypes.STRING(255), allowNull: true },
    closure_rejection_reason: { type: DataTypes.TEXT, allowNull: true },
    closure_snapshot: { type: DataTypes.JSON, allowNull: true },
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

  // 5. Collections Table — voucher_no is what the client actually keys receipts
  // off of (not receipt_no); both are kept since the server API still issues
  // receipt_no. clearance_status/voided/reverted/bounced_* cover the lifecycle a
  // collection receipt can go through after it's first recorded (cheque clearance,
  // manual void/reversal, bounce handling).
  await queryInterface.createTable('collections', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    receipt_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    voucher_no: { type: DataTypes.STRING(50), allowNull: true },
    loan_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'loans', key: 'id' } },
    loan_account_no: { type: DataTypes.STRING(50), allowNull: true },
    borrower_name: { type: DataTypes.STRING(255), allowNull: false },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    collector_name: { type: DataTypes.STRING(100), allowNull: false },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    principal_paid: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    interest_paid: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    penalty: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    new_principal_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    payment_mode: { type: DataTypes.ENUM('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'), defaultValue: 'CASH' },
    reference_no: { type: DataTypes.STRING(100), allowNull: true },
    bank_name: { type: DataTypes.STRING(100), allowNull: true },
    branch: { type: DataTypes.STRING(100), allowNull: true },
    received_at: { type: DataTypes.DATE, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    proof_image: { type: DataTypes.MEDIUMTEXT, allowNull: true },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    clearance_status: { type: DataTypes.ENUM('CLEARED', 'PENDING_CLEARANCE', 'BOUNCED'), defaultValue: 'CLEARED' },
    voided: { type: DataTypes.BOOLEAN, defaultValue: false },
    reverted: { type: DataTypes.BOOLEAN, defaultValue: false },
    revert_reason: { type: DataTypes.TEXT, allowNull: true },
    reverted_by: { type: DataTypes.STRING(255), allowNull: true },
    reverted_at: { type: DataTypes.DATE, allowNull: true },
    bounce_reason: { type: DataTypes.TEXT, allowNull: true },
    bounced_by: { type: DataTypes.STRING(255), allowNull: true },
    bounced_at: { type: DataTypes.DATE, allowNull: true },
    collection_date: { type: DataTypes.DATEONLY, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  // 6. Chart of Accounts Table — name_key is an i18n lookup key so the same fixed
  // chart of accounts can render in multiple languages client-side.
  await queryInterface.createTable('chart_of_accounts', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    account_code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    account_name: { type: DataTypes.STRING(255), allowNull: false },
    name_key: { type: DataTypes.STRING(100), allowNull: true },
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
    voucher_type: { type: DataTypes.ENUM('RECEIPT', 'PAYMENT', 'JOURNAL', 'CONTRA', 'CASH_RECEIPT', 'CASH_PAYMENT', 'BANK_RECEIPT', 'BANK_PAYMENT'), defaultValue: 'JOURNAL' },
    is_auto: { type: DataTypes.BOOLEAN, defaultValue: false },
    total_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    ref_type: { type: DataTypes.STRING(50), allowNull: true },
    ref_id: { type: DataTypes.INTEGER, allowNull: true },
    branch: { type: DataTypes.STRING(100), allowNull: true },
    created_by: { type: DataTypes.STRING(255), allowNull: true },
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
    city: { type: DataTypes.STRING(100), allowNull: true },
    state: { type: DataTypes.STRING(100), allowNull: true },
    pincode: { type: DataTypes.STRING(10), allowNull: true },
    nominee_name: { type: DataTypes.STRING(255), allowNull: true },
    nominee_phone: { type: DataTypes.STRING(20), allowNull: true },
    nominee_relation: { type: DataTypes.STRING(50), allowNull: true },
    capital_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    join_date: { type: DataTypes.DATEONLY, allowNull: true },
    exit_date: { type: DataTypes.DATEONLY, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    photo: { type: DataTypes.MEDIUMTEXT, allowNull: true },
    status: { type: DataTypes.ENUM('ACTIVE', 'EXITED'), defaultValue: 'ACTIVE' },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  // 10. Fixed Deposits Table — `booking_date` (not `deposit_date`) to match what
  // the booking form and every FD screen actually calls it.
  await queryInterface.createTable('fixed_deposits', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    fd_account_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    borrower_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'borrowers', key: 'id' } },
    customer_name: { type: DataTypes.STRING(255), allowNull: false },
    branch: { type: DataTypes.STRING(100), allowNull: true },
    principal_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    tenure_months: { type: DataTypes.INTEGER, allowNull: false },
    interest_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    scheme: { type: DataTypes.ENUM('CUMULATIVE', 'MONTHLY_PAYOUT'), defaultValue: 'CUMULATIVE' },
    payment_mode: { type: DataTypes.ENUM('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'), defaultValue: 'CASH' },
    notes: { type: DataTypes.TEXT, allowNull: true },
    booking_date: { type: DataTypes.DATEONLY, allowNull: false },
    maturity_date: { type: DataTypes.DATEONLY, allowNull: false },
    maturity_value: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    payout_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    status: { type: DataTypes.ENUM('ACTIVE', 'MATURED', 'CLOSED_PREMATURE'), defaultValue: 'ACTIVE' },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  // 11. Recurring Deposits Table + its per-month installment schedule (a proper
  // child table rather than a JSON blob, since each installment has its own
  // status/paid_date lifecycle that needs updating independently).
  await queryInterface.createTable('recurring_deposits', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    rd_account_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    borrower_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'borrowers', key: 'id' } },
    customer_name: { type: DataTypes.STRING(255), allowNull: false },
    branch: { type: DataTypes.STRING(100), allowNull: true },
    monthly_installment: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    tenure_months: { type: DataTypes.INTEGER, allowNull: false },
    interest_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    payment_mode: { type: DataTypes.ENUM('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'), defaultValue: 'CASH' },
    notes: { type: DataTypes.TEXT, allowNull: true },
    booking_date: { type: DataTypes.DATEONLY, allowNull: false },
    maturity_date: { type: DataTypes.DATEONLY, allowNull: false },
    maturity_value: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    collected_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    payout_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    status: { type: DataTypes.ENUM('ACTIVE', 'MATURED', 'CLOSED_PREMATURE'), defaultValue: 'ACTIVE' },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  await queryInterface.createTable('recurring_deposit_installments', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    rd_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'recurring_deposits', key: 'id' } },
    month_no: { type: DataTypes.INTEGER, allowNull: false },
    due_date: { type: DataTypes.DATEONLY, allowNull: false },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    status: { type: DataTypes.ENUM('PENDING', 'PAID', 'MISSED'), defaultValue: 'PENDING' },
    paid_date: { type: DataTypes.DATEONLY, allowNull: true },
    payment_mode: { type: DataTypes.ENUM('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'), allowNull: true },
    voucher_no: { type: DataTypes.STRING(50), allowNull: true }
  });

  // 12. Expense Allocation Module — categories are pre-funded buckets branches
  // draw expense vouchers against; allocation_requests are top-up/emergency-funds
  // asks against a category, separate from the vouchers spent out of it.
  await queryInterface.createTable('expense_categories', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    status: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE'), defaultValue: 'ACTIVE' },
    balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    allocated_total: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  await queryInterface.createTable('expense_vouchers', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    voucher_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    payee: { type: DataTypes.STRING(255), allowNull: false },
    category_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'expense_categories', key: 'id' } },
    category: { type: DataTypes.STRING(150), allowNull: true },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'), defaultValue: 'APPROVED' },
    notes: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  await queryInterface.createTable('expense_allocation_requests', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    category_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'expense_categories', key: 'id' } },
    category_name: { type: DataTypes.STRING(150), allowNull: true },
    type: { type: DataTypes.ENUM('INITIAL', 'TOPUP', 'EMERGENCY'), defaultValue: 'TOPUP' },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: true },
    requested_by: { type: DataTypes.STRING(255), allowNull: true },
    requested_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  // 13. End-of-Day Close Module — one record per branch per day, plus its
  // reopen-request lifecycle as a proper child table (each request has its own
  // approve/reject decision trail) and the tenant-wide denomination settings used
  // to build the cash-count form (not per-record, an app-level setting).
  await queryInterface.createTable('eod_records', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    branch: { type: DataTypes.STRING(100), allowNull: false },
    status: { type: DataTypes.ENUM('CLOSED', 'PENDING_REVIEW'), defaultValue: 'CLOSED' },
    has_variance: { type: DataTypes.BOOLEAN, defaultValue: false },
    edited: { type: DataTypes.BOOLEAN, defaultValue: false },
    closed_by: { type: DataTypes.STRING(255), allowNull: true },
    closed_at: { type: DataTypes.DATE, allowNull: true },
    reopened_by: { type: DataTypes.STRING(255), allowNull: true },
    reopened_at: { type: DataTypes.DATE, allowNull: true },
    resolution_note: { type: DataTypes.TEXT, allowNull: true },
    reviewed_by: { type: DataTypes.STRING(255), allowNull: true },
    reviewed_at: { type: DataTypes.DATE, allowNull: true },
    denominations: { type: DataTypes.JSON, allowNull: true },
    counted_cash: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    expected_cash: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    difference: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    reopen_reason: { type: DataTypes.TEXT, allowNull: true },
    reopen_history: { type: DataTypes.JSON, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  await queryInterface.createTable('eod_reopen_requests', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    eod_record_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'eod_records', key: 'id' } },
    requested_by: { type: DataTypes.STRING(255), allowNull: true },
    requested_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    reason: { type: DataTypes.TEXT, allowNull: true },
    requested_hours: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'), defaultValue: 'PENDING' },
    decided_by: { type: DataTypes.STRING(255), allowNull: true },
    decided_at: { type: DataTypes.DATE, allowNull: true },
    granted_hours: { type: DataTypes.INTEGER, allowNull: true },
    decision_reason: { type: DataTypes.TEXT, allowNull: true }
  });

  await queryInterface.createTable('eod_denomination_settings', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    value: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    enabled: { type: DataTypes.BOOLEAN, defaultValue: true }
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('eod_denomination_settings');
  await queryInterface.dropTable('eod_reopen_requests');
  await queryInterface.dropTable('eod_records');
  await queryInterface.dropTable('expense_allocation_requests');
  await queryInterface.dropTable('expense_vouchers');
  await queryInterface.dropTable('expense_categories');
  await queryInterface.dropTable('recurring_deposit_installments');
  await queryInterface.dropTable('recurring_deposits');
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
  await queryInterface.dropTable('user_branches');
  await queryInterface.dropTable('employee_permissions');
  await queryInterface.dropTable('branches');
  await queryInterface.dropTable('sub_companies');
  await queryInterface.dropTable('users');
}
