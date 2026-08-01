const GLOBAL_SCOPE_ROLES = ['ADMIN', 'COMPANY_ADMIN', 'SUPER_ADMIN'];

export async function getAllEmployees(db, companyId) {
  const [users] = await db.query(
    'SELECT id, company_id, name, email, role, status FROM users WHERE company_id = ?',
    [companyId]
  );

  const [permissions] = await db.query(
    'SELECT user_id, module, action, allowed FROM employee_permissions WHERE company_id = ?',
    [companyId]
  );

  const [assignments] = await db.query('SELECT * FROM user_branches WHERE company_id = ?', [companyId]);
  const [allBranches] = await db.query('SELECT * FROM branches WHERE company_id = ?', [companyId]);

  return users.map(user => {
    const userPerms = permissions.filter(p => p.user_id === user.id);
    const branches = assignments
      .filter(a => a.user_id == user.id)
      .map(a => allBranches.find(b => b.id == a.branch_id))
      .filter(Boolean)
      .map(b => ({ id: b.id, name: b.name, code: b.code }));
    return {
      ...user,
      permissions: userPerms,
      branches,
      branchScope: GLOBAL_SCOPE_ROLES.includes(user.role) ? 'GLOBAL' : (branches.length ? 'RESTRICTED' : 'UNASSIGNED')
    };
  });
}

export async function createEmployee(db, companyId, employeeData) {
  const { name, email, role = 'COLLECTOR', branch_ids = [] } = employeeData;
  const [result] = await db.execute(
    'INSERT INTO users (company_id, name, email, role, status) VALUES (?, ?, ?, ?, ?)',
    [companyId, name, email, role, 'ACTIVE']
  );

  const userId = result.insertId;
  for (const branchId of branch_ids) {
    await db.execute(
      'INSERT INTO user_branches (company_id, user_id, branch_id) VALUES (?, ?, ?)',
      [companyId, userId, branchId]
    );
  }

  return { id: userId, company_id: companyId, name, email, role, status: 'ACTIVE', branch_ids };
}

export async function updateEmployeePermissions(db, companyId, userId, permissions) {
  // Update or insert permissions
  for (const perm of permissions) {
    const { module, action, allowed } = perm;
    await db.execute(
      `INSERT INTO employee_permissions (company_id, user_id, module, action, allowed)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE allowed = VALUES(allowed)`,
      [companyId, userId, module, action, allowed ? 1 : 0]
    );
  }
  return { success: true, message: 'Permissions updated successfully' };
}

export async function updateEmployeeBranches(db, companyId, userId, branchIds) {
  await db.execute('DELETE FROM user_branches WHERE user_id = ? AND company_id = ?', [userId, companyId]);
  for (const branchId of branchIds) {
    await db.execute(
      'INSERT INTO user_branches (company_id, user_id, branch_id) VALUES (?, ?, ?)',
      [companyId, userId, branchId]
    );
  }
  return { success: true, message: 'Branch assignments updated successfully.' };
}
