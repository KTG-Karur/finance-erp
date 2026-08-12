/**
 * Sequelize Migration: Master Database Schema
 * Handles central tenant registry, superadmin accounts, and audit logging.
 */

export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;

  // Master Subscription Plans Table
  await queryInterface.createTable('plans', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    max_branches: { type: DataTypes.INTEGER, allowNull: true },
    allowed_modules: { type: DataTypes.JSON, allowNull: true },
    monthly_price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
    six_month_price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
    yearly_price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  // Companies Master Table
  await queryInterface.createTable('companies', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    company_code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    db_name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    plan_tier: { type: DataTypes.ENUM('STARTER', 'STANDARD', 'ENTERPRISE'), defaultValue: 'STANDARD' },
    // Company Profile screen (client/src/settings/OrganizationHierarchyView.jsx /
    // MasterSettingsView.jsx companyForm) edits these
    gstin: { type: DataTypes.STRING(20), allowNull: true },
    pan: { type: DataTypes.STRING(20), allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    // MEDIUMTEXT (16MB), not TEXT (~64KB) — a base64-encoded logo upload
    // routinely exceeds TEXT's limit and would get rejected by MySQL.
    logo: { type: DataTypes.MEDIUMTEXT, allowNull: true },
    // Company Profile / Theme Customizer screen — a hex color, shared across
    // every user of this tenant (not per-browser localStorage), so switching
    // devices or staff members always see the same brand color.
    theme_color: { type: DataTypes.STRING(9), allowNull: true },
    max_branches: { type: DataTypes.INTEGER, allowNull: true },
    allowed_modules: { type: DataTypes.JSON, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  // Subscriptions Table
  await queryInterface.createTable('subscriptions', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'companies', key: 'id' } },
    plan_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'plans', key: 'id' } },
    status: { type: DataTypes.ENUM('ACTIVE', 'EXPIRED', 'CANCELLED', 'TRIAL'), defaultValue: 'ACTIVE' },
    start_date: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    end_date: { type: DataTypes.DATE, allowNull: true },
    auto_renew: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  // Master Users (Super Admins) Table
  await queryInterface.createTable('master_users', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
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
  await queryInterface.dropTable('subscriptions');
  await queryInterface.dropTable('companies');
  await queryInterface.dropTable('plans');
}
