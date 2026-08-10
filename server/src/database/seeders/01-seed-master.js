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
      db_name: 'finance_erp',
      db_host: 'localhost',
      db_port: 3306,
      db_user: 'root',
      db_password_enc: 'encrypted_pass_here',
      plan_tier: 'ENTERPRISE',
      gstin: '33AAAAA0000A1Z5',
      pan: 'AAAAA0000A',
      address: 'No. 123, Main Road, Near Bus Stand, Karur, Tamil Nadu - 639001',
      phone: '+91 4324 234567',
      is_active: true,
      created_at: new Date()
    }
  ], {});

  // Seed Master Users — this app compares passwords in plaintext everywhere (see
  // the tenant `users` table too), so `password_hash` holds a real usable plaintext
  // value here, not an actual hash, matching server/src/mock/masterMockData.json's
  // super admin credentials so mock mode and real-DB mode behave identically.
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
  await queryInterface.bulkDelete('master_users', { email: 'admin@alpha.com' }, {});
  await queryInterface.bulkDelete('companies', { company_code: 'ALPHA' }, {});
}
