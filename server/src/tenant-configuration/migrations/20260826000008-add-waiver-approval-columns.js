/**
 * Incremental Tenant Migration:
 * Add waiver approval tracking columns to `collections` table.
 *
 * Migration File: 20260826000008-add-waiver-approval-columns.js
 */

export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;

  // 1. waiver_status (NONE, PENDING_APPROVAL, APPROVED, REJECTED)
  try {
    await queryInterface.addColumn('collections', 'waiver_status', {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'NONE',
      after: 'interest_waiver'
    });
  } catch (err) {
    if (!err.message?.includes('Duplicate column') && !err.message?.includes('already exists')) {
      if (queryInterface.sequelize?.query) {
        try {
          await queryInterface.sequelize.query(
            "ALTER TABLE `collections` ADD COLUMN `waiver_status` VARCHAR(30) NOT NULL DEFAULT 'NONE' AFTER `interest_waiver`"
          );
        } catch (subErr) {
          if (!subErr.message?.includes('Duplicate column') && !subErr.message?.includes('already exists')) {
            console.warn('Migration warning (collections.waiver_status):', subErr.message);
          }
        }
      }
    }
  }

  // 2. waiver_approved_by
  try {
    await queryInterface.addColumn('collections', 'waiver_approved_by', {
      type: DataTypes.STRING(150),
      allowNull: true,
      after: 'waiver_status'
    });
  } catch (err) {
    if (!err.message?.includes('Duplicate column') && !err.message?.includes('already exists')) {
      if (queryInterface.sequelize?.query) {
        try {
          await queryInterface.sequelize.query(
            "ALTER TABLE `collections` ADD COLUMN `waiver_approved_by` VARCHAR(150) NULL AFTER `waiver_status`"
          );
        } catch (subErr) {
          if (!subErr.message?.includes('Duplicate column') && !subErr.message?.includes('already exists')) {
            console.warn('Migration warning (collections.waiver_approved_by):', subErr.message);
          }
        }
      }
    }
  }

  // 3. waiver_approved_at
  try {
    await queryInterface.addColumn('collections', 'waiver_approved_at', {
      type: DataTypes.DATE,
      allowNull: true,
      after: 'waiver_approved_by'
    });
  } catch (err) {
    if (!err.message?.includes('Duplicate column') && !err.message?.includes('already exists')) {
      if (queryInterface.sequelize?.query) {
        try {
          await queryInterface.sequelize.query(
            "ALTER TABLE `collections` ADD COLUMN `waiver_approved_at` DATETIME NULL AFTER `waiver_approved_by`"
          );
        } catch (subErr) {
          if (!subErr.message?.includes('Duplicate column') && !subErr.message?.includes('already exists')) {
            console.warn('Migration warning (collections.waiver_approved_at):', subErr.message);
          }
        }
      }
    }
  }

  // 4. waiver_rejection_reason
  try {
    await queryInterface.addColumn('collections', 'waiver_rejection_reason', {
      type: DataTypes.TEXT,
      allowNull: true,
      after: 'waiver_approved_at'
    });
  } catch (err) {
    if (!err.message?.includes('Duplicate column') && !err.message?.includes('already exists')) {
      if (queryInterface.sequelize?.query) {
        try {
          await queryInterface.sequelize.query(
            "ALTER TABLE `collections` ADD COLUMN `waiver_rejection_reason` TEXT NULL AFTER `waiver_approved_at`"
          );
        } catch (subErr) {
          if (!subErr.message?.includes('Duplicate column') && !subErr.message?.includes('already exists')) {
            console.warn('Migration warning (collections.waiver_rejection_reason):', subErr.message);
          }
        }
      }
    }
  }
}

export async function down(queryInterface, Sequelize) {
  try {
    await queryInterface.removeColumn('collections', 'waiver_rejection_reason');
  } catch (err) {
    console.warn('Rollback warning (collections.waiver_rejection_reason):', err.message);
  }
  try {
    await queryInterface.removeColumn('collections', 'waiver_approved_at');
  } catch (err) {
    console.warn('Rollback warning (collections.waiver_approved_at):', err.message);
  }
  try {
    await queryInterface.removeColumn('collections', 'waiver_approved_by');
  } catch (err) {
    console.warn('Rollback warning (collections.waiver_approved_by):', err.message);
  }
  try {
    await queryInterface.removeColumn('collections', 'waiver_status');
  } catch (err) {
    console.warn('Rollback warning (collections.waiver_status):', err.message);
  }
}
