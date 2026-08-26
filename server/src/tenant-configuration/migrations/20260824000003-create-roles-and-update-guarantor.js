/**
 * Incremental Tenant Migration:
 * 1. Create `roles` table for dynamic custom RBAC role management
 * 2. Alter `users.role` column from strict ENUM to VARCHAR(64) to allow custom role assignment
 * 3. Update `loans.guarantor` column from VARCHAR(255) to JSON for structured guarantor records
 *
 * Migration File: 20260824000003-create-roles-and-update-guarantor.js
 */

export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;

  // 1. Create `roles` table for dynamic tenant roles
  await queryInterface.createTable('roles', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    role_code: { type: DataTypes.STRING(64), allowNull: false },
    role_name: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    is_system: { type: DataTypes.BOOLEAN, defaultValue: false },
    permissions: { type: DataTypes.TEXT('long'), allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  try {
    await queryInterface.addIndex('roles', ['company_id', 'role_code'], {
      unique: true,
      name: 'roles_company_role_code_unique'
    });
  } catch (err) {
    // Index may already exist if table was created with index
  }

  // 2. Alter `users.role` to VARCHAR(64) so newly created custom roles can be assigned to users
  try {
    await queryInterface.changeColumn('users', 'role', {
      type: DataTypes.STRING(64),
      defaultValue: 'STAFF'
    });
  } catch (err) {
    if (queryInterface.sequelize?.query) {
      await queryInterface.sequelize.query("ALTER TABLE `users` MODIFY COLUMN `role` VARCHAR(64) DEFAULT 'STAFF'");
    }
  }

  // 3. Modify `loans.guarantor` column to JSON
  try {
    await queryInterface.changeColumn('loans', 'guarantor', {
      type: DataTypes.JSON,
      allowNull: true
    });
  } catch (err) {
    if (queryInterface.sequelize?.query) {
      await queryInterface.sequelize.query('ALTER TABLE `loans` MODIFY COLUMN `guarantor` JSON NULL');
    }
  }
}

export async function down(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;

  // Revert loans.guarantor to VARCHAR(255)
  try {
    await queryInterface.changeColumn('loans', 'guarantor', {
      type: DataTypes.STRING(255),
      allowNull: true
    });
  } catch (err) {
    if (queryInterface.sequelize?.query) {
      await queryInterface.sequelize.query('ALTER TABLE `loans` MODIFY COLUMN `guarantor` VARCHAR(255) NULL');
    }
  }

  // Revert users.role to ENUM
  try {
    await queryInterface.changeColumn('users', 'role', {
      type: DataTypes.ENUM('COMPANY_ADMIN', 'ADMIN', 'COLLECTOR', 'MANAGER', 'STAFF'),
      defaultValue: 'STAFF'
    });
  } catch (err) {
    if (queryInterface.sequelize?.query) {
      await queryInterface.sequelize.query("ALTER TABLE `users` MODIFY COLUMN `role` ENUM('COMPANY_ADMIN', 'ADMIN', 'COLLECTOR', 'MANAGER', 'STAFF') DEFAULT 'STAFF'");
    }
  }

  // Drop roles table
  await queryInterface.dropTable('roles');
}
