/**
 * Incremental Tenant Migration:
 * Add bank_account_id and settlement_account_code to collections table.
 *
 * Migration File: 20260826000009-add-settlement-bank-to-collections.js
 */

export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;

  // 1. bank_account_id
  try {
    await queryInterface.addColumn('collections', 'bank_account_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      after: 'payment_mode'
    });
  } catch (err) {
    if (!err.message?.includes('Duplicate column') && !err.message?.includes('already exists')) {
      if (queryInterface.sequelize?.query) {
        try {
          await queryInterface.sequelize.query(
            "ALTER TABLE `collections` ADD COLUMN `bank_account_id` INT NULL AFTER `payment_mode`"
          );
        } catch (subErr) {}
      }
    }
  }

  // 2. settlement_account_code
  try {
    await queryInterface.addColumn('collections', 'settlement_account_code', {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
      after: 'bank_account_id'
    });
  } catch (err) {
    if (!err.message?.includes('Duplicate column') && !err.message?.includes('already exists')) {
      if (queryInterface.sequelize?.query) {
        try {
          await queryInterface.sequelize.query(
            "ALTER TABLE `collections` ADD COLUMN `settlement_account_code` VARCHAR(20) NULL AFTER `bank_account_id`"
          );
        } catch (subErr) {}
      }
    }
  }
}

export async function down(queryInterface) {
  try {
    await queryInterface.removeColumn('collections', 'bank_account_id');
  } catch (err) {}
  try {
    await queryInterface.removeColumn('collections', 'settlement_account_code');
  } catch (err) {}
}
