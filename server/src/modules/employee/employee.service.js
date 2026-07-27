export async function getAllEmployees(db, companyId) {
  const [users] = await db.query(
    'SELECT id, company_id, name, email, role, status FROM users WHERE company_id = ?',
    [companyId]
  );

  const [permissions] = await db.query(
    'SELECT user_id, module, action, allowed FROM employee_permissions WHERE company_id = ?',
    [companyId]
  );

  // Group permissions by user
  return users.map(user => {
    const userPerms = permissions.filter(p => p.user_id === user.id);
    return {
      ...user,
      permissions: userPerms
    };
  });
}

export async function createEmployee(db, companyId, employeeData) {
  const { name, email, role = 'COLLECTOR' } = employeeData;
  const [result] = await db.execute(
    'INSERT INTO users (company_id, name, email, role, status) VALUES (?, ?, ?, ?, ?)',
    [companyId, name, email, role, 'ACTIVE']
  );
  return { id: result.insertId, company_id: companyId, name, email, role, status: 'ACTIVE' };
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
