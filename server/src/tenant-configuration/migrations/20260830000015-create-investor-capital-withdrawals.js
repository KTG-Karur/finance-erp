/**
 * Sequelize Tenant Migration: Investor Capital Withdrawal Requests & Approvals
 * Migration File: 20260830000015-create-investor-capital-withdrawals.js
 * Location: server/src/tenant-configuration/migrations/20260830000015-create-investor-capital-withdrawals.js
 *
 * A capital withdrawal reduces an investor's principal (unlike a profit
 * withdrawal, which never touches capital). It is Admin-only to initiate,
 * requires every active investor's sign-off, and only executes once company
 * cash is sufficient — otherwise it parks in APPROVED_WAITING_FUNDS.
 */

export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;

  try {
    await queryInterface.createTable('investor_capital_withdrawal_requests', {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      investor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'investors', key: 'id' }
      },
      amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      requested_by: { type: DataTypes.STRING(150), allowNull: true },
      account_code: { type: DataTypes.STRING(20), allowNull: false, defaultValue: '1002' },
      status: {
        type: DataTypes.ENUM('PENDING_APPROVAL', 'APPROVED_WAITING_FUNDS', 'EXECUTED', 'REJECTED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'PENDING_APPROVAL'
      },
      notes: { type: DataTypes.TEXT, allowNull: true },
      requested_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      executed_at: { type: DataTypes.DATE, allowNull: true },
      journal_entry_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'journal_entries', key: 'id' }
      }
    });
  } catch (e) {}

  try {
    await queryInterface.createTable('investor_capital_withdrawal_approvals', {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      request_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'investor_capital_withdrawal_requests', key: 'id' }
      },
      investor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'investors', key: 'id' }
      },
      decision: { type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'), allowNull: false, defaultValue: 'PENDING' },
      decided_by: { type: DataTypes.STRING(150), allowNull: true },
      decided_at: { type: DataTypes.DATE, allowNull: true }
    });

    await queryInterface.addIndex('investor_capital_withdrawal_approvals', ['request_id', 'investor_id'], {
      unique: true,
      name: 'uq_withdrawal_request_investor'
    });
  } catch (e) {}
}

export async function down(queryInterface) {
  try {
    await queryInterface.dropTable('investor_capital_withdrawal_approvals');
  } catch (e) {}
  try {
    await queryInterface.dropTable('investor_capital_withdrawal_requests');
  } catch (e) {}
}
