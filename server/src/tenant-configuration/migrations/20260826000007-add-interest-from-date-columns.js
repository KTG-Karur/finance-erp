/**
 * Incremental Tenant Migration:
 * Add `interest_from_date` and `interest_days` columns to `collections` table.
 *
 * Migration File: 20260826000007-add-interest-from-date-columns.js
 */

export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;

  try {
    await queryInterface.addColumn('collections', 'interest_from_date', {
      type: DataTypes.DATEONLY,
      allowNull: true,
      after: 'collection_date'
    });
  } catch (err) {
    if (!err.message?.includes('Duplicate column') && !err.message?.includes('already exists')) {
      if (queryInterface.sequelize?.query) {
        try {
          await queryInterface.sequelize.query(
            "ALTER TABLE `collections` ADD COLUMN `interest_from_date` DATE NULL AFTER `collection_date`"
          );
        } catch (subErr) {
          if (!subErr.message?.includes('Duplicate column') && !subErr.message?.includes('already exists')) {
            console.warn('Migration warning (collections.interest_from_date):', subErr.message);
          }
        }
      }
    }
  }

  try {
    await queryInterface.addColumn('collections', 'interest_days', {
      type: DataTypes.INTEGER,
      allowNull: true,
      after: 'interest_paid_upto'
    });
  } catch (err) {
    if (!err.message?.includes('Duplicate column') && !err.message?.includes('already exists')) {
      if (queryInterface.sequelize?.query) {
        try {
          await queryInterface.sequelize.query(
            "ALTER TABLE `collections` ADD COLUMN `interest_days` INT NULL AFTER `interest_paid_upto`"
          );
        } catch (subErr) {
          if (!subErr.message?.includes('Duplicate column') && !subErr.message?.includes('already exists')) {
            console.warn('Migration warning (collections.interest_days):', subErr.message);
          }
        }
      }
    }
  }
}

export async function down(queryInterface, Sequelize) {
  try {
    await queryInterface.removeColumn('collections', 'interest_from_date');
  } catch (err) {
    console.warn('Rollback warning (collections.interest_from_date):', err.message);
  }

  try {
    await queryInterface.removeColumn('collections', 'interest_days');
  } catch (err) {
    console.warn('Rollback warning (collections.interest_days):', err.message);
  }
}
