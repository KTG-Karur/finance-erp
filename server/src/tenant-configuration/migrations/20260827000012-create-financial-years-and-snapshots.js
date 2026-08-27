/**
 * Sequelize Tenant Migration: Financial Years, Yearly Balance Snapshots & Period Control
 * Migration File: 20260827000012-create-financial-years-and-snapshots.js
 * Location: server/src/tenant-configuration/migrations/20260827000012-create-financial-years-and-snapshots.js
 */

export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;

  // 1. Create financial_years table
  try {
    await queryInterface.createTable('financial_years', {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      start_date: { type: DataTypes.DATEONLY, allowNull: false },
      end_date: { type: DataTypes.DATEONLY, allowNull: false },
      status: {
        type: DataTypes.ENUM('DRAFT', 'ACTIVE', 'SOFT_LOCKED', 'CLOSED'),
        allowNull: false,
        defaultValue: 'DRAFT'
      },
      is_current: { type: DataTypes.BOOLEAN, defaultValue: false },
      closed_by_user_id: { type: DataTypes.INTEGER, allowNull: true },
      closed_by_name: { type: DataTypes.STRING(100), allowNull: true },
      closed_at: { type: DataTypes.DATE, allowNull: true },
      closing_notes: { type: DataTypes.TEXT, allowNull: true },
      reconciliation_checksum: { type: DataTypes.STRING(64), allowNull: true },
      created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    await queryInterface.addIndex('financial_years', ['start_date', 'end_date'], {
      name: 'idx_fy_dates'
    });
    await queryInterface.addIndex('financial_years', ['status'], {
      name: 'idx_fy_status'
    });
  } catch (e) {
    // Table may already exist
  }

  // 2. Create loan_yearly_balances table
  try {
    await queryInterface.createTable('loan_yearly_balances', {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      loan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'loans', key: 'id' }
      },
      financial_year_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'financial_years', key: 'id' }
      },
      borrower_id: { type: DataTypes.INTEGER, allowNull: false },
      loan_account_no: { type: DataTypes.STRING(50), allowNull: false },
      opening_principal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
      opening_interest_arrears: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
      opening_penalty: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
      principal_collected: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
      interest_collected: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
      penalty_collected: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
      waivers_given: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
      closing_principal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
      closing_interest_arrears: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
      closing_penalty: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
      closing_total_outstanding: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
      closing_status: {
        type: DataTypes.ENUM('ACTIVE', 'OVERDUE', 'NPA', 'CLOSED', 'WRITTEN_OFF'),
        allowNull: false,
        defaultValue: 'ACTIVE'
      },
      snapshot_date: { type: DataTypes.DATEONLY, allowNull: false },
      created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    await queryInterface.addIndex('loan_yearly_balances', ['loan_id', 'financial_year_id'], {
      unique: true,
      name: 'uq_loan_fy'
    });
  } catch (e) {}

  // 3. Create deposit_yearly_balances table
  try {
    await queryInterface.createTable('deposit_yearly_balances', {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      deposit_type: {
        type: DataTypes.ENUM('FIXED_DEPOSIT', 'RECURRING_DEPOSIT'),
        allowNull: false
      },
      deposit_id: { type: DataTypes.INTEGER, allowNull: false },
      financial_year_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'financial_years', key: 'id' }
      },
      account_no: { type: DataTypes.STRING(50), allowNull: false },
      opening_principal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
      additions_during_year: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
      interest_accrued_during_year: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
      interest_payout_during_year: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
      closing_principal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
      closing_status: {
        type: DataTypes.ENUM('ACTIVE', 'MATURED', 'CLOSED', 'CLOSED_PREMATURE'),
        allowNull: false,
        defaultValue: 'ACTIVE'
      },
      snapshot_date: { type: DataTypes.DATEONLY, allowNull: false },
      created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    await queryInterface.addIndex('deposit_yearly_balances', ['deposit_type', 'deposit_id', 'financial_year_id'], {
      unique: true,
      name: 'uq_dep_fy'
    });
  } catch (e) {}

  // 4. Create financial_year_audit_logs table
  try {
    await queryInterface.createTable('financial_year_audit_logs', {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      financial_year_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'financial_years', key: 'id' }
      },
      action_type: {
        type: DataTypes.ENUM('CREATED', 'SOFT_LOCKED', 'PRE_CHECK_RUN', 'SNAPSHOT_GENERATED', 'PL_CLOSED', 'HARD_CLOSED', 'REOPENED'),
        allowNull: false
      },
      performed_by_user_id: { type: DataTypes.INTEGER, allowNull: true },
      performed_by_name: { type: DataTypes.STRING(100), allowNull: false },
      ip_address: { type: DataTypes.STRING(45), allowNull: true },
      payload_snapshot: { type: DataTypes.JSON, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
  } catch (e) {}

  // 5. Ensure Chart of Accounts has 3005 - Retained Earnings / Reserve Fund
  await queryInterface.sequelize.query(`
    INSERT INTO chart_of_accounts (account_code, account_name, name_key, account_type, category, balance, is_active)
    SELECT '3005', 'Retained Earnings / Reserve Fund', 'coa.retained_earnings', 'EQUITY', 'RESERVES', 0.00, 1
    WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE account_code = '3005');
  `);

  // 6. Add financial_year_id to journal_entries and collections
  try {
    await queryInterface.addColumn('journal_entries', 'financial_year_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'financial_years', key: 'id' }
    });
  } catch (e) {}

  try {
    await queryInterface.addColumn('collections', 'financial_year_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'financial_years', key: 'id' }
    });
  } catch (e) {}

  // 7. Seed canonical Financial Years (e.g. FY 2024-25, FY 2025-26, FY 2026-27)
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-indexed
  // Indian FY starts April 1st. If before April, FY starts prev year.
  const activeFyStartYear = currentMonth >= 4 ? currentYear : currentYear - 1;

  const defaultFYs = [
    {
      code: `FY ${activeFyStartYear - 2}-${String(activeFyStartYear - 1).slice(-2)}`,
      start_date: `${activeFyStartYear - 2}-04-01`,
      end_date: `${activeFyStartYear - 1}-03-31`,
      status: 'CLOSED',
      is_current: false
    },
    {
      code: `FY ${activeFyStartYear - 1}-${String(activeFyStartYear).slice(-2)}`,
      start_date: `${activeFyStartYear - 1}-04-01`,
      end_date: `${activeFyStartYear}-03-31`,
      status: 'CLOSED',
      is_current: false
    },
    {
      code: `FY ${activeFyStartYear}-${String(activeFyStartYear + 1).slice(-2)}`,
      start_date: `${activeFyStartYear}-04-01`,
      end_date: `${activeFyStartYear + 1}-03-31`,
      status: 'ACTIVE',
      is_current: true
    }
  ];

  for (const fy of defaultFYs) {
    await queryInterface.sequelize.query(`
      INSERT INTO financial_years (code, start_date, end_date, status, is_current)
      SELECT '${fy.code}', '${fy.start_date}', '${fy.end_date}', '${fy.status}', ${fy.is_current ? 1 : 0}
      WHERE NOT EXISTS (SELECT 1 FROM financial_years WHERE code = '${fy.code}');
    `);
  }

  // 8. Backfill financial_year_id on existing journal_entries and collections
  await queryInterface.sequelize.query(`
    UPDATE journal_entries je
    JOIN financial_years fy ON je.entry_date BETWEEN fy.start_date AND fy.end_date
    SET je.financial_year_id = fy.id
    WHERE je.financial_year_id IS NULL;
  `);

  await queryInterface.sequelize.query(`
    UPDATE collections c
    JOIN financial_years fy ON c.collection_date BETWEEN fy.start_date AND fy.end_date
    SET c.financial_year_id = fy.id
    WHERE c.financial_year_id IS NULL;
  `);
}

export async function down(queryInterface) {
  try {
    await queryInterface.removeColumn('collections', 'financial_year_id');
  } catch (e) {}
  try {
    await queryInterface.removeColumn('journal_entries', 'financial_year_id');
  } catch (e) {}
  try {
    await queryInterface.dropTable('financial_year_audit_logs');
  } catch (e) {}
  try {
    await queryInterface.dropTable('deposit_yearly_balances');
  } catch (e) {}
  try {
    await queryInterface.dropTable('loan_yearly_balances');
  } catch (e) {}
  try {
    await queryInterface.dropTable('financial_years');
  } catch (e) {}
}
