/**
 * Sequelize Tenant Migration: Investor Capital Transaction Ledger
 * Migration File: 20260828000013-create-investor-capital-ledger.js
 * Location: server/src/tenant-configuration/migrations/20260828000013-create-investor-capital-ledger.js
 *
 * Adds a per-investor audit trail so `investors.capital_amount` is always a
 * derivable materialized view of transaction history, not a bare mutable number.
 */

export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;

  try {
    await queryInterface.createTable('investor_capital_transactions', {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      investor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'investors', key: 'id' }
      },
      txn_type: {
        type: DataTypes.ENUM('INITIAL', 'ADDITIONAL', 'PROFIT_CREDIT', 'PROFIT_WITHDRAWAL', 'PROFIT_REINVEST', 'CAPITAL_WITHDRAWAL'),
        allowNull: false
      },
      amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      balance_after: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      txn_date: { type: DataTypes.DATEONLY, allowNull: false },
      ref_type: { type: DataTypes.STRING(50), allowNull: true },
      ref_id: { type: DataTypes.INTEGER, allowNull: true },
      journal_entry_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'journal_entries', key: 'id' }
      },
      notes: { type: DataTypes.TEXT, allowNull: true },
      created_by: { type: DataTypes.STRING(150), allowNull: true },
      created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    await queryInterface.addIndex('investor_capital_transactions', ['investor_id', 'txn_date'], {
      name: 'idx_inv_capital_txn_investor_date'
    });
  } catch (e) {
    // Table may already exist
  }

  // Backfill one INITIAL row per existing investor so history isn't blank.
  await queryInterface.sequelize.query(`
    INSERT INTO investor_capital_transactions (investor_id, txn_type, amount, balance_after, txn_date, ref_type, notes, created_at)
    SELECT id, 'INITIAL', capital_amount, capital_amount, COALESCE(join_date, DATE(created_at)), 'INVESTOR_CAPITAL', 'Opening balance (backfilled)', COALESCE(created_at, CURRENT_TIMESTAMP)
    FROM investors
    WHERE capital_amount > 0
      AND id NOT IN (SELECT DISTINCT investor_id FROM investor_capital_transactions);
  `);
}

export async function down(queryInterface) {
  try {
    await queryInterface.dropTable('investor_capital_transactions');
  } catch (e) {}
}
