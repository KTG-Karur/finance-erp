/**
 * Sequelize Migration: Master Database Schema
 * Handles central tenant registry, superadmin accounts, and audit logging.
 */

export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;

  // Companies Master Table
  await queryInterface.createTable('companies', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    company_code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    db_name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    db_host: { type: DataTypes.STRING(255), defaultValue: 'localhost' },
    db_port: { type: DataTypes.INTEGER, defaultValue: 3306 },
    db_user: { type: DataTypes.STRING(100), allowNull: false },
    db_password_enc: { type: DataTypes.STRING(500), allowNull: false },
    plan_tier: { type: DataTypes.ENUM('STARTER', 'STANDARD', 'ENTERPRISE'), defaultValue: 'STANDARD' },
    // Company Profile screen (client/src/settings/OrganizationHierarchyView.jsx /
    // MasterSettingsView.jsx companyForm) edits these — previously had no backing
    // columns at all, so every save was silently lost on refresh.
    gstin: { type: DataTypes.STRING(20), allowNull: true },
    pan: { type: DataTypes.STRING(20), allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    logo: { type: DataTypes.TEXT, allowNull: true },
    // NULL = unlimited/unrestricted — same default-open philosophy as
    // employee_permissions' "no row = allowed" in plugins/moduleGuard.js. A
    // superadmin opts a tenant INTO a cap/restriction, existing tenants are
    // untouched until someone deliberately sets one.
    max_branches: { type: DataTypes.INTEGER, allowNull: true },
    allowed_modules: { type: DataTypes.JSON, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  // Master Users (Super Admins) Table
  await queryInterface.createTable('master_users', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    // auth.service.js's authenticateSuperAdmin selects `u.name`, not `u.full_name` —
    // keep this column named to match the query it actually has to satisfy.
    name: { type: DataTypes.STRING(100), allowNull: false },
    role: { type: DataTypes.ENUM('SUPER_ADMIN', 'SYSTEM_AUDITOR'), defaultValue: 'SUPER_ADMIN' },
    is_global_admin: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  // Superadmin Audit Logs Table
  await queryInterface.createTable('superadmin_audit_logs', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    superadmin_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'master_users', key: 'id' } },
    target_tenant_id: { type: DataTypes.INTEGER, allowNull: true },
    action: { type: DataTypes.STRING(100), allowNull: false },
    details: { type: DataTypes.JSON, allowNull: true },
    ip_address: { type: DataTypes.STRING(45), allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('superadmin_audit_logs');
  await queryInterface.dropTable('master_users');
  await queryInterface.dropTable('companies');
}
