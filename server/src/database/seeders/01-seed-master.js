/**
 * Sequelize Seeder: Master Database
 * Seeds subscription plans and the global superadmin account only.
 * Tenant companies are added via tenant provisioning (TenantProvisioner),
 * never seeded here — that path also handles its own tenants.
 */

export async function up(queryInterface, Sequelize) {
  // Seed Plans
  await queryInterface.bulkInsert('plans', [
    {
      id: 1,
      name: 'Starter Plan',
      code: 'STARTER',
      max_branches: 3,
      allowed_modules: JSON.stringify(['LOANS', 'COLLECTIONS', 'REPORTS']),
      monthly_price: 1999.00,
      six_month_price: 10995.00,
      yearly_price: 19990.00,
      is_active: true,
      created_at: new Date()
    },
    {
      id: 2,
      name: 'Standard Plan',
      code: 'STANDARD',
      max_branches: 10,
      allowed_modules: JSON.stringify(['LOANS', 'COLLECTIONS', 'GOLD_LOANS', 'REPORTS', 'EMPLOYEES']),
      monthly_price: 4999.00,
      six_month_price: 27495.00,
      yearly_price: 49990.00,
      is_active: true,
      created_at: new Date()
    },
    {
      id: 3,
      name: 'Enterprise Plan',
      code: 'ENTERPRISE',
      max_branches: null,
      allowed_modules: JSON.stringify(['LOANS', 'COLLECTIONS', 'GOLD_LOANS', 'NPA', 'GENERAL_LEDGER', 'REPORTS', 'EMPLOYEES', 'ORGANIZATION']),
      monthly_price: 9999.00,
      six_month_price: 54995.00,
      yearly_price: 99990.00,
      is_active: true,
      created_at: new Date()
    }
  ], {});

  // Seed Master Users
  await queryInterface.bulkInsert('master_users', [
    {
      id: 1,
      email: 'superadmin@erp.com',
      password_hash: 'super123',
      name: 'Global Super Admin',
      role: 'SUPER_ADMIN',
      is_global_admin: true,
      created_at: new Date()
    }
  ], {});
}

export async function down(queryInterface) {
  await queryInterface.bulkDelete('master_users', { email: 'superadmin@erp.com' }, {});
  await queryInterface.bulkDelete('plans', { id: [1, 2, 3] }, {});
}
