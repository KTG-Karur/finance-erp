/**
 * Incremental Tenant Migration: Add bank_accounts table
 * Migration File: 20260814000002-create-bank-accounts.js
 */

export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;

  await queryInterface.createTable('bank_accounts', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    bank_name: { type: DataTypes.STRING(150), allowNull: false },
    account_name: { type: DataTypes.STRING(150), allowNull: false },
    account_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    ifsc_code: { type: DataTypes.STRING(20), allowNull: false },
    branch: { type: DataTypes.STRING(100), allowNull: true },
    account_type: { type: DataTypes.STRING(50), defaultValue: 'CURRENT' },
    ledger_account_code: { type: DataTypes.STRING(20), defaultValue: '1002' },
    balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('bank_accounts');
}
