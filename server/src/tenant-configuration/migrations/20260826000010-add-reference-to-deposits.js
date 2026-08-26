/**
 * Incremental Tenant Migration:
 * Add reference column to fixed_deposits and recurring_deposits tables.
 *
 * Migration File: 20260826000010-add-reference-to-deposits.js
 */

export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;

  // 1. fixed_deposits.reference (documents given / collateral / certificate notes)
  try {
    await queryInterface.addColumn('fixed_deposits', 'reference', {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      after: 'notes'
    });
  } catch (err) {
    if (!err.message?.includes('Duplicate column') && !err.message?.includes('already exists')) {
      if (queryInterface.sequelize?.query) {
        try {
          await queryInterface.sequelize.query(
            "ALTER TABLE `fixed_deposits` ADD COLUMN `reference` TEXT NULL AFTER `notes`"
          );
        } catch (subErr) {}
      }
    }
  }

  // 2. recurring_deposits.reference
  try {
    await queryInterface.addColumn('recurring_deposits', 'reference', {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      after: 'notes'
    });
  } catch (err) {
    if (!err.message?.includes('Duplicate column') && !err.message?.includes('already exists')) {
      if (queryInterface.sequelize?.query) {
        try {
          await queryInterface.sequelize.query(
            "ALTER TABLE `recurring_deposits` ADD COLUMN `reference` TEXT NULL AFTER `notes`"
          );
        } catch (subErr) {}
      }
    }
  }
}

export async function down(queryInterface) {
  try {
    await queryInterface.removeColumn('fixed_deposits', 'reference');
  } catch (err) {}
  try {
    await queryInterface.removeColumn('recurring_deposits', 'reference');
  } catch (err) {}
}
