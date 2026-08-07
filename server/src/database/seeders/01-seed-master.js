/**
 * Sequelize Seeder: Master Database
 * Seeds initial company record ('ALPHA') with db_name 'finance_db_alpha' and superadmin account.
 */

export async function up(queryInterface, Sequelize) {
  // Seed Companies
  await queryInterface.bulkInsert('companies', [
    {
      id: 1,
      name: 'Alpha Financial Services Private Limited',
      company_code: 'ALPHA',
      db_name: 'finance_db_alpha',
      db_host: 'localhost',
      db_port: 3306,
      db_user: 'root',
      db_password_enc: 'encrypted_pass_here',
      plan_tier: 'ENTERPRISE',
      is_active: true,
      created_at: new Date()
    }
  ], {});

  // Seed Master Users
  await queryInterface.bulkInsert('master_users', [
    {
      id: 1,
      email: 'admin@alpha.com',
      password_hash: '$2b$10$YourHashedPasswordHereString',
      full_name: 'Alpha Super Admin',
      role: 'SUPER_ADMIN',
      is_global_admin: true,
      created_at: new Date()
    }
  ], {});
}

export async function down(queryInterface) {
  await queryInterface.bulkDelete('master_users', { email: 'admin@alpha.com' }, {});
  await queryInterface.bulkDelete('companies', { company_code: 'ALPHA' }, {});
}
