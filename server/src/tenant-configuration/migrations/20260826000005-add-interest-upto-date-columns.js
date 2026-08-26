/**
 * Incremental Tenant Migration:
 * Add `interest_paid_upto` column to `loans` and `collections` tables.
 *
 * Migration File: 20260826000005-add-interest-upto-date-columns.js
 */

export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;

  // 1. Add interest_paid_upto to loans table
  try {
    await queryInterface.addColumn('loans', 'interest_paid_upto', {
      type: DataTypes.DATEONLY,
      allowNull: true,
      after: 'last_payment_date'
    });
  } catch (err) {
    if (!err.message?.includes('Duplicate column') && !err.message?.includes('already exists')) {
      if (queryInterface.sequelize?.query) {
        try {
          await queryInterface.sequelize.query(
            "ALTER TABLE `loans` ADD COLUMN `interest_paid_upto` DATE NULL AFTER `last_payment_date`"
          );
        } catch (subErr) {
          if (!subErr.message?.includes('Duplicate column') && !subErr.message?.includes('already exists')) {
            console.warn('Migration warning (loans.interest_paid_upto):', subErr.message);
          }
        }
      }
    }
  }

  // 2. Add interest_paid_upto to collections table
  try {
    await queryInterface.addColumn('collections', 'interest_paid_upto', {
      type: DataTypes.DATEONLY,
      allowNull: true,
      after: 'collection_date'
    });
  } catch (err) {
    if (!err.message?.includes('Duplicate column') && !err.message?.includes('already exists')) {
      if (queryInterface.sequelize?.query) {
        try {
          await queryInterface.sequelize.query(
            "ALTER TABLE `collections` ADD COLUMN `interest_paid_upto` DATE NULL AFTER `collection_date`"
          );
        } catch (subErr) {
          if (!subErr.message?.includes('Duplicate column') && !subErr.message?.includes('already exists')) {
            console.warn('Migration warning (collections.interest_paid_upto):', subErr.message);
          }
        }
      }
    }
  }
}

export async function down(queryInterface, Sequelize) {
  try {
    await queryInterface.removeColumn('loans', 'interest_paid_upto');
  } catch (err) {
    // Ignore if column doesn't exist
  }

  try {
    await queryInterface.removeColumn('collections', 'interest_paid_upto');
  } catch (err) {
    // Ignore if column doesn't exist
  }
}
