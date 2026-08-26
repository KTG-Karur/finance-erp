/**
 * Incremental Tenant Migration:
 * Add `pending_interest_arrears` column to `loans` table, and
 * `interest_shortfall`, `interest_waiver` columns to `collections` table.
 *
 * Migration File: 20260826000006-add-pending-interest-arrears.js
 */

export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;

  // 1. Add pending_interest_arrears to loans table
  try {
    await queryInterface.addColumn('loans', 'pending_interest_arrears', {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      after: 'pending_amount'
    });
  } catch (err) {
    if (!err.message?.includes('Duplicate column') && !err.message?.includes('already exists')) {
      if (queryInterface.sequelize?.query) {
        try {
          await queryInterface.sequelize.query(
            "ALTER TABLE `loans` ADD COLUMN `pending_interest_arrears` DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER `pending_amount`"
          );
        } catch (subErr) {
          if (!subErr.message?.includes('Duplicate column') && !subErr.message?.includes('already exists')) {
            console.warn('Migration warning (loans.pending_interest_arrears):', subErr.message);
          }
        }
      }
    }
  }

  // 2. Add interest_shortfall and interest_waiver to collections table
  try {
    await queryInterface.addColumn('collections', 'interest_shortfall', {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      after: 'interest_paid'
    });
  } catch (err) {
    if (!err.message?.includes('Duplicate column') && !err.message?.includes('already exists')) {
      if (queryInterface.sequelize?.query) {
        try {
          await queryInterface.sequelize.query(
            "ALTER TABLE `collections` ADD COLUMN `interest_shortfall` DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER `interest_paid`"
          );
        } catch (subErr) {
          if (!subErr.message?.includes('Duplicate column') && !subErr.message?.includes('already exists')) {
            console.warn('Migration warning (collections.interest_shortfall):', subErr.message);
          }
        }
      }
    }
  }

  try {
    await queryInterface.addColumn('collections', 'interest_waiver', {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      after: 'interest_shortfall'
    });
  } catch (err) {
    if (!err.message?.includes('Duplicate column') && !err.message?.includes('already exists')) {
      if (queryInterface.sequelize?.query) {
        try {
          await queryInterface.sequelize.query(
            "ALTER TABLE `collections` ADD COLUMN `interest_waiver` DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER `interest_shortfall`"
          );
        } catch (subErr) {
          if (!subErr.message?.includes('Duplicate column') && !subErr.message?.includes('already exists')) {
            console.warn('Migration warning (collections.interest_waiver):', subErr.message);
          }
        }
      }
    }
  }
}

export async function down(queryInterface, Sequelize) {
  try {
    await queryInterface.removeColumn('loans', 'pending_interest_arrears');
  } catch (err) {
    console.warn('Rollback warning (loans.pending_interest_arrears):', err.message);
  }

  try {
    await queryInterface.removeColumn('collections', 'interest_shortfall');
  } catch (err) {
    console.warn('Rollback warning (collections.interest_shortfall):', err.message);
  }

  try {
    await queryInterface.removeColumn('collections', 'interest_waiver');
  } catch (err) {
    console.warn('Rollback warning (collections.interest_waiver):', err.message);
  }
}
