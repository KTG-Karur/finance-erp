export async function getAllRoles(db, companyId) {
  let [roles] = await db.query(
    'SELECT id, company_id, role_code, role_name, description, is_system, permissions, created_at FROM roles WHERE company_id = ? AND deleted_at IS NULL ORDER BY is_system DESC, role_name ASC',
    [companyId]
  );

  // If table is empty for this company, seed default system roles
  if (!roles || roles.length === 0) {
    const defaultRoles = [
      { code: 'ADMIN', name: 'System Administrator', desc: 'Full unrestricted system access', is_system: 1 },
      { code: 'MANAGER', name: 'Branch Manager', desc: 'Branch operations, approvals & financial management', is_system: 1 },
      { code: 'COLLECTOR', name: 'Field Collector Agent', desc: 'Daily field collections & borrower receipts', is_system: 1 },
      { code: 'STAFF', name: 'General Staff', desc: 'Data entry, customer inquiries & standard reporting', is_system: 1 }
    ];

    for (const r of defaultRoles) {
      await db.query(
        `INSERT INTO roles (company_id, role_code, role_name, description, is_system)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE role_name = VALUES(role_name)`,
        [companyId, r.code, r.name, r.desc, r.is_system]
      );
    }

    [roles] = await db.query(
      'SELECT id, company_id, role_code, role_name, description, is_system, permissions, created_at FROM roles WHERE company_id = ? AND deleted_at IS NULL ORDER BY is_system DESC, role_name ASC',
      [companyId]
    );
  }

  return roles.map(r => ({
    ...r,
    is_system: Boolean(r.is_system),
    permissions: r.permissions ? (typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions) : null
  }));
}

export async function createRole(db, companyId, data) {
  const { role_name, role_code, description, permissions } = data;
  if (!role_name || !role_name.trim()) {
    const err = new Error('Role name is required.');
    err.statusCode = 400;
    throw err;
  }

  const code = (role_code || role_name)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_');

  if (!code) {
    const err = new Error('Valid role code is required.');
    err.statusCode = 400;
    throw err;
  }

  const [existing] = await db.query(
    'SELECT id FROM roles WHERE company_id = ? AND role_code = ?',
    [companyId, code]
  );
  if (existing.length > 0) {
    const err = new Error(`Role code '${code}' already exists.`);
    err.statusCode = 409;
    throw err;
  }

  const permsString = permissions ? JSON.stringify(permissions) : null;

  const [result] = await db.query(
    `INSERT INTO roles (company_id, role_code, role_name, description, is_system, permissions)
     VALUES (?, ?, ?, ?, 0, ?)`,
    [companyId, code, role_name.trim(), description ? description.trim() : null, permsString]
  );

  const [created] = await db.query('SELECT * FROM roles WHERE id = ?', [result.insertId]);
  const row = created[0];
  return {
    ...row,
    is_system: Boolean(row.is_system),
    permissions: row.permissions ? (typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions) : null
  };
}

export async function updateRole(db, companyId, roleCode, data) {
  const { role_name, description, permissions } = data;

  const [existing] = await db.query(
    'SELECT * FROM roles WHERE company_id = ? AND role_code = ?',
    [companyId, roleCode]
  );

  if (!existing || existing.length === 0) {
    // If not existing yet (e.g. updating standard role permissions), insert it
    const permsString = permissions ? JSON.stringify(permissions) : null;
    await db.query(
      `INSERT INTO roles (company_id, role_code, role_name, description, is_system, permissions)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE permissions = VALUES(permissions), role_name = COALESCE(VALUES(role_name), role_name)`,
      [
        companyId,
        roleCode,
        role_name || roleCode,
        description || null,
        ['ADMIN', 'MANAGER', 'COLLECTOR', 'STAFF'].includes(roleCode) ? 1 : 0,
        permsString
      ]
    );
  } else {
    const updates = [];
    const params = [];

    if (role_name !== undefined) {
      updates.push('role_name = ?');
      params.push(role_name.trim());
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description ? description.trim() : null);
    }
    if (permissions !== undefined) {
      updates.push('permissions = ?');
      params.push(permissions ? JSON.stringify(permissions) : null);
    }

    if (updates.length > 0) {
      params.push(companyId, roleCode);
      await db.query(
        `UPDATE roles SET ${updates.join(', ')} WHERE company_id = ? AND role_code = ?`,
        params
      );
    }
  }

  const [rows] = await db.query(
    'SELECT * FROM roles WHERE company_id = ? AND role_code = ?',
    [companyId, roleCode]
  );
  const row = rows[0] || {};
  return {
    ...row,
    is_system: Boolean(row.is_system),
    permissions: row.permissions ? (typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions) : null
  };
}

export async function deleteRole(db, companyId, roleCode) {
  const [existing] = await db.query(
    'SELECT * FROM roles WHERE company_id = ? AND role_code = ?',
    [companyId, roleCode]
  );

  if (!existing || existing.length === 0) {
    const err = new Error('Role not found.');
    err.statusCode = 404;
    throw err;
  }

  if (existing[0].is_system) {
    const err = new Error('Standard system roles cannot be deleted.');
    err.statusCode = 400;
    throw err;
  }

  const [staffWithRole] = await db.query(
    'SELECT id, name FROM users WHERE company_id = ? AND role = ?',
    [companyId, roleCode]
  );

  if (staffWithRole.length > 0) {
    const err = new Error(`Cannot delete role '${roleCode}' because ${staffWithRole.length} staff member(s) are currently assigned to it.`);
    err.statusCode = 409;
    throw err;
  }

  await db.query(
    'UPDATE roles SET deleted_at = CURRENT_TIMESTAMP WHERE company_id = ? AND role_code = ? AND deleted_at IS NULL',
    [companyId, roleCode]
  );

  return { success: true, message: `Role '${roleCode}' deleted successfully.` };
}
