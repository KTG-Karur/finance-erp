/**
 * Sequelize Tenant Migration: Investor Monthly Profit Distribution
 * Migration File: 20260829000014-create-investor-profit-distributions.js
 * Location: server/src/tenant-configuration/migrations/20260829000014-create-investor-profit-distributions.js
 *
 * Adds a monthly profit-distribution header + per-investor settlement lines,
 * so each month's admin-entered profit figure can be split by live capital
 * share % and settled (withdraw vs reinvest) with a full audit trail.
 */

export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;

  try {
    await queryInterface.createTable('investor_profit_distributions', {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      period_month: { type: DataTypes.STRING(7), allowNull: false, unique: true }, // 'YYYY-MM'
      total_profit_manual: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      total_profit_auto_calc: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      total_capital_snapshot: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      status: { type: DataTypes.ENUM('DRAFT', 'FINALIZED'), allowNull: false, defaultValue: 'DRAFT' },
      notes: { type: DataTypes.TEXT, allowNull: true },
      created_by: { type: DataTypes.STRING(150), allowNull: true },
      created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      finalized_at: { type: DataTypes.DATE, allowNull: true }
    });
  } catch (e) {}

  try {
    await queryInterface.createTable('investor_profit_distribution_lines', {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      distribution_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'investor_profit_distributions', key: 'id' }
      },
      investor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'investors', key: 'id' }
      },
      opening_capital: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      share_percent: { type: DataTypes.DECIMAL(7, 4), allowNull: false },
      profit_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      withdraw_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      reinvest_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      settled: { type: DataTypes.BOOLEAN, defaultValue: false },
      settled_at: { type: DataTypes.DATE, allowNull: true }
    });

    await queryInterface.addIndex('investor_profit_distribution_lines', ['distribution_id', 'investor_id'], {
      unique: true,
      name: 'uq_distribution_investor'
    });
  } catch (e) {}

  // Clearing account used on the debit side when reinvested profit is
  // credited to Promoter Share Capital and when withdrawn profit is paid
  // out of Cash/Bank — mirrors the '3005' Retained Earnings pattern already
  // seeded for financial-year closing.
  await queryInterface.sequelize.query(`
    INSERT INTO chart_of_accounts (account_code, account_name, name_key, account_type, category, balance, is_active)
    SELECT '3002', 'Investor Profit Distribution', 'coa.investor_profit_distribution', 'EQUITY', 'PROFIT_DISTRIBUTION', 0.00, 1
    WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE account_code = '3002');
  `);
}

export async function down(queryInterface) {
  try {
    await queryInterface.dropTable('investor_profit_distribution_lines');
  } catch (e) {}
  try {
    await queryInterface.dropTable('investor_profit_distributions');
  } catch (e) {}
}
