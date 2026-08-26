/**
 * Incremental Tenant Migration:
 * Add 'PENDING_DISBURSAL' status to `loans.status` ENUM
 *
 * Migration File: 20260824000004-add-pending-disbursal-status.js
 */

export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;

  try {
    await queryInterface.changeColumn('loans', 'status', {
      type: DataTypes.ENUM(
        'PENDING',
        'APPROVED',
        'PENDING_DISBURSAL',
        'ACTIVE',
        'OVERDUE',
        'PENDING_CLOSURE',
        'CLOSED',
        'REJECTED'
      ),
      defaultValue: 'PENDING'
    });
  } catch (err) {
    if (queryInterface.sequelize?.query) {
      await queryInterface.sequelize.query(
        "ALTER TABLE `loans` MODIFY COLUMN `status` ENUM('PENDING', 'APPROVED', 'PENDING_DISBURSAL', 'ACTIVE', 'OVERDUE', 'PENDING_CLOSURE', 'CLOSED', 'REJECTED') DEFAULT 'PENDING'"
      );
    }
  }
}

export async function down(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;

  try {
    await queryInterface.changeColumn('loans', 'status', {
      type: DataTypes.ENUM(
        'PENDING',
        'APPROVED',
        'ACTIVE',
        'OVERDUE',
        'PENDING_CLOSURE',
        'CLOSED',
        'REJECTED'
      ),
      defaultValue: 'PENDING'
    });
  } catch (err) {
    if (queryInterface.sequelize?.query) {
      await queryInterface.sequelize.query(
        "ALTER TABLE `loans` MODIFY COLUMN `status` ENUM('PENDING', 'APPROVED', 'ACTIVE', 'OVERDUE', 'PENDING_CLOSURE', 'CLOSED', 'REJECTED') DEFAULT 'PENDING'"
      );
    }
  }
}
