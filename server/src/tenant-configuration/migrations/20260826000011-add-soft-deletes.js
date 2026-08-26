/**
 * Incremental Tenant Migration:
 * Add soft-delete (deleted_at) columns to all principal tenant entities.
 *
 * Migration File: 20260826000011-add-soft-deletes.js
 */

export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;
  const tables = [
    'investors',
    'borrowers',
    'loan_schemes',
    'expense_categories',
    'users',
    'roles',
    'branches',
    'sub_companies',
    'chart_of_accounts',
    'bank_accounts',
    'loans'
  ];

  for (const table of tables) {
    try {
      await queryInterface.addColumn(table, 'deleted_at', {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
      });
    } catch (err) {
      if (!err.message?.includes('Duplicate column') && !err.message?.includes('already exists')) {
        if (queryInterface.sequelize?.query) {
          try {
            await queryInterface.sequelize.query(
              `ALTER TABLE \`${table}\` ADD COLUMN \`deleted_at\` DATETIME NULL DEFAULT NULL`
            );
          } catch (subErr) {}
        }
      }
    }
  }
}

export async function down(queryInterface) {
  const tables = [
    'investors',
    'borrowers',
    'loan_schemes',
    'expense_categories',
    'users',
    'roles',
    'branches',
    'sub_companies',
    'chart_of_accounts',
    'bank_accounts',
    'loans'
  ];

  for (const table of tables) {
    try {
      await queryInterface.removeColumn(table, 'deleted_at');
    } catch (err) {}
  }
}
