/**
 * Sequelize Seeder: Master Database
 * Seeds initial company record ('ALPHA') with db_name 'finance_db_alpha' and superadmin account.
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
      yearly_price: 99990.00,
      is_active: true,
      created_at: new Date()
    }
  ], {});

  // Seed Companies
  await queryInterface.bulkInsert('companies', [
    {
      id: 1,
      name: 'Alpha Financial Services Private Limited',
      company_code: 'ALPHA',
      db_name: 'finance_erp',
      plan_tier: 'ENTERPRISE',
      gstin: '33AAAAA0000A1Z5',
      pan: 'AAAAA0000A',
      address: 'No. 123, Main Road, Near Bus Stand, Karur, Tamil Nadu - 639001',
      phone: '+91 4324 234567',
      is_active: true,
      created_at: new Date()
    }
  ], {});

  // Seed Subscriptions
  await queryInterface.bulkInsert('subscriptions', [
    {
      id: 1,
      company_id: 1,
      plan_id: 3,
      status: 'ACTIVE',
      start_date: new Date(),
      auto_renew: true,
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
  await queryInterface.bulkDelete('subscriptions', { company_id: 1 }, {});
  await queryInterface.bulkDelete('companies', { company_code: 'ALPHA' }, {});
  await queryInterface.bulkDelete('plans', { id: [1, 2, 3] }, {});
}
