export async function getDeletedRecords(db, companyId = 1) {
  const records = [];

  // 1. Borrowers / Customers
  try {
    const [rows] = await db.query(
      'SELECT id, borrower_code as code, full_name as name, phone, city, branch, status, deleted_at FROM borrowers WHERE deleted_at IS NOT NULL'
    );
    rows.forEach(r => {
      records.push({
        id: r.id,
        entity_type: 'CUSTOMER',
        entity_name: 'Customer / Borrower',
        code: r.code || `BR-${r.id}`,
        name: r.name,
        details: [r.phone, r.city, r.branch].filter(Boolean).join(' • '),
        deleted_at: r.deleted_at
      });
    });
  } catch (e) {}

  // 2. Loan Schemes
  try {
    const [rows] = await db.query(
      'SELECT id, name as code, name, formula_type, unit_base, rate_per_unit, deleted_at FROM loan_schemes WHERE deleted_at IS NOT NULL'
    );
    rows.forEach(r => {
      records.push({
        id: r.id,
        entity_type: 'SCHEME',
        entity_name: 'Loan Scheme',
        code: r.code,
        name: r.name,
        details: `${r.formula_type || 'Standard'} • Rate: ${r.rate_per_unit || 0}`,
        deleted_at: r.deleted_at
      });
    });
  } catch (e) {}

  // 3. Investors
  try {
    const [rows] = await db.query(
      'SELECT id, investor_code as code, name, phone, capital_amount, deleted_at FROM investors WHERE deleted_at IS NOT NULL'
    );
    rows.forEach(r => {
      records.push({
        id: r.id,
        entity_type: 'INVESTOR',
        entity_name: 'Investor',
        code: r.code || `INV-${r.id}`,
        name: r.name,
        details: `Capital: ₹${Number(r.capital_amount || 0).toLocaleString('en-IN')} • ${r.phone || ''}`,
        deleted_at: r.deleted_at
      });
    });
  } catch (e) {}

  // 4. Expense Categories
  try {
    const [rows] = await db.query(
      'SELECT id, name as code, name, branch, balance, deleted_at FROM expense_categories WHERE deleted_at IS NOT NULL'
    );
    rows.forEach(r => {
      records.push({
        id: r.id,
        entity_type: 'EXPENSE_CATEGORY',
        entity_name: 'Expense Category',
        code: r.code,
        name: r.name,
        details: `Branch: ${r.branch || 'All'} • Balance: ₹${Number(r.balance || 0).toLocaleString('en-IN')}`,
        deleted_at: r.deleted_at
      });
    });
  } catch (e) {}

  // 5. Staff / Users
  try {
    const [rows] = await db.query(
      'SELECT id, name, email as code, phone, role, deleted_at FROM users WHERE deleted_at IS NOT NULL'
    );
    rows.forEach(r => {
      records.push({
        id: r.id,
        entity_type: 'EMPLOYEE',
        entity_name: 'Staff Member',
        code: r.code,
        name: r.name,
        details: `Role: ${r.role || 'Staff'} • Phone: ${r.phone || '—'}`,
        deleted_at: r.deleted_at
      });
    });
  } catch (e) {}

  // 6. Bank Accounts
  try {
    const [rows] = await db.query(
      'SELECT id, account_number as code, bank_name as name, account_name, branch, deleted_at FROM bank_accounts WHERE deleted_at IS NOT NULL'
    );
    rows.forEach(r => {
      records.push({
        id: r.id,
        entity_type: 'BANK_ACCOUNT',
        entity_name: 'Bank Account',
        code: r.code,
        name: `${r.name} (${r.account_name || 'Main'})`,
        details: `Branch: ${r.branch || 'Main Branch'}`,
        deleted_at: r.deleted_at
      });
    });
  } catch (e) {}

  // 7. Branches
  try {
    const [rows] = await db.query(
      'SELECT id, code, name, city, phone, deleted_at FROM branches WHERE deleted_at IS NOT NULL'
    );
    rows.forEach(r => {
      records.push({
        id: r.id,
        entity_type: 'BRANCH',
        entity_name: 'Branch Office',
        code: r.code,
        name: r.name,
        details: [r.city, r.phone].filter(Boolean).join(' • '),
        deleted_at: r.deleted_at
      });
    });
  } catch (e) {}

  // 8. Roles
  try {
    const [rows] = await db.query(
      'SELECT id, role_code as code, role_name as name, description, deleted_at FROM roles WHERE deleted_at IS NOT NULL'
    );
    rows.forEach(r => {
      records.push({
        id: r.id,
        entity_type: 'ROLE',
        entity_name: 'Custom Role',
        code: r.code,
        name: r.name,
        details: r.description || 'Custom permission role',
        deleted_at: r.deleted_at
      });
    });
  } catch (e) {}

  // 9. Chart of Accounts
  try {
    const [rows] = await db.query(
      'SELECT account_code as id, account_code as code, account_name as name, account_type, category, deleted_at FROM chart_of_accounts WHERE deleted_at IS NOT NULL'
    );
    rows.forEach(r => {
      records.push({
        id: r.id,
        entity_type: 'CHART_OF_ACCOUNT',
        entity_name: 'Account Head',
        code: r.code,
        name: r.name,
        details: `Type: ${r.account_type} • Category: ${r.category || 'General'}`,
        deleted_at: r.deleted_at
      });
    });
  } catch (e) {}

  return records.sort((a, b) => new Date(b.deleted_at || 0) - new Date(a.deleted_at || 0));
}

export async function restoreDeletedRecord(db, entityType, id) {
  const normType = String(entityType || '').toUpperCase();
  let affected = 0;

  switch (normType) {
    case 'CUSTOMER':
    case 'BORROWER': {
      const [res] = await db.execute('UPDATE borrowers SET deleted_at = NULL, status = "ACTIVE" WHERE id = ?', [id]);
      affected = res.affectedRows;
      break;
    }
    case 'SCHEME':
    case 'LOAN_SCHEME': {
      const [res] = await db.execute('UPDATE loan_schemes SET deleted_at = NULL, is_active = 1 WHERE id = ?', [id]);
      affected = res.affectedRows;
      break;
    }
    case 'INVESTOR': {
      const [res] = await db.execute('UPDATE investors SET deleted_at = NULL, status = "ACTIVE" WHERE id = ?', [id]);
      affected = res.affectedRows;
      break;
    }
    case 'EXPENSE_CATEGORY': {
      const [res] = await db.execute('UPDATE expense_categories SET deleted_at = NULL, status = "ACTIVE" WHERE id = ?', [id]);
      affected = res.affectedRows;
      break;
    }
    case 'EMPLOYEE':
    case 'USER': {
      const [res] = await db.execute('UPDATE users SET deleted_at = NULL, status = "ACTIVE" WHERE id = ?', [id]);
      affected = res.affectedRows;
      break;
    }
    case 'BANK_ACCOUNT': {
      const [res] = await db.execute('UPDATE bank_accounts SET deleted_at = NULL, is_active = 1 WHERE id = ?', [id]);
      affected = res.affectedRows;
      break;
    }
    case 'BRANCH': {
      const [res] = await db.execute('UPDATE branches SET deleted_at = NULL, is_active = 1 WHERE id = ?', [id]);
      affected = res.affectedRows;
      break;
    }
    case 'ROLE': {
      const [res] = await db.execute('UPDATE roles SET deleted_at = NULL WHERE id = ? OR role_code = ?', [id, id]);
      affected = res.affectedRows;
      break;
    }
    case 'CHART_OF_ACCOUNT': {
      const [res] = await db.execute('UPDATE chart_of_accounts SET deleted_at = NULL, is_active = 1 WHERE account_code = ?', [id]);
      affected = res.affectedRows;
      break;
    }
    default: {
      const err = new Error(`Unknown entity type '${entityType}'.`);
      err.statusCode = 400;
      throw err;
    }
  }

  if (!affected) {
    const err = new Error('Record not found or already restored.');
    err.statusCode = 404;
    throw err;
  }

  return { success: true, message: 'Record restored successfully.' };
}
