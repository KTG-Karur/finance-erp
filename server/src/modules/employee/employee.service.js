import { assertValidPhone, assertValidEmail } from '../../shared/validators/contact.js';
import { assertMaxFileSize } from '../../shared/validators/fileSize.js';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const GLOBAL_SCOPE_ROLES = ['ADMIN', 'COMPANY_ADMIN', 'SUPER_ADMIN'];
// Must match the `users.role` ENUM exactly (see the tenant migration) — an
// out-of-enum value fails at the DB with a raw "Data truncated" error instead
// of a clean 400, so it's validated here before that query ever runs.
const VALID_ROLES = ['COMPANY_ADMIN', 'ADMIN', 'COLLECTOR', 'MANAGER', 'STAFF'];

function assertValidRole(role) {
  if (role !== undefined && role !== null && !VALID_ROLES.includes(role)) {
    const err = new Error(`Invalid role '${role}'. Must be one of: ${VALID_ROLES.join(', ')}.`);
    err.statusCode = 400;
    throw err;
  }
}

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
  const { name, email, phone, photo, role = 'COLLECTOR', branch_ids = [], enable_auth, password } = employeeData;

  if (!name || !email) {
    const err = new Error('Name and Email are required.');
    err.statusCode = 400;
    throw err;
  }
  assertValidEmail(email, { fieldLabel: 'Email', required: true });
  assertValidPhone(phone, { fieldLabel: 'Phone number', required: false });
  assertValidRole(role);
  assertMaxFileSize(photo, MAX_PHOTO_BYTES, 'Staff photo');

  const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length) {
    const err = new Error(`An employee with email '${email}' already exists.`);
    err.statusCode = 409;
    throw err;
  }

  // `password` is NOT NULL with no default — every user row needs one even when
  // sign-in is disabled (enable_auth: false), since nothing else guards login.
  // A random placeholder locks the account out (it can never be guessed/typed)
  // rather than leaving the column empty.
  const finalPassword = (enable_auth !== false && password) ? password : `disabled-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const [result] = await db.execute(
    'INSERT INTO users (company_id, name, email, phone, photo, password, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [companyId, name, email, phone || null, photo || null, finalPassword, role, 'ACTIVE']
  );

  const userId = result.insertId;
  for (const branchId of branch_ids) {
    await db.execute(
      'INSERT INTO user_branches (company_id, user_id, branch_id) VALUES (?, ?, ?)',
      [companyId, userId, branchId]
    );
  }

  return { id: userId, company_id: companyId, name, email, phone: phone || null, photo: photo || null, role, status: 'ACTIVE', branch_ids };
}

export async function updateEmployee(db, companyId, userId, payload) {
  const { name, email, phone, photo, role, status, enable_auth, password, branch_ids } = payload;

  const [existing] = await db.execute('SELECT id FROM users WHERE id = ? AND company_id = ?', [userId, companyId]);
  if (!existing.length) {
    const err = new Error('Employee not found.');
    err.statusCode = 404;
    throw err;
  }
  assertValidRole(role);
  if (email !== undefined) assertValidEmail(email, { fieldLabel: 'Email', required: true });
  if (phone !== undefined) assertValidPhone(phone, { fieldLabel: 'Phone number', required: false });
  if (photo !== undefined) assertMaxFileSize(photo, MAX_PHOTO_BYTES, 'Staff photo');

  const sets = ['name = COALESCE(?, name)', 'email = COALESCE(?, email)', 'phone = COALESCE(?, phone)', 'photo = COALESCE(?, photo)', 'role = COALESCE(?, role)', 'status = COALESCE(?, status)'];
  const params = [name ?? null, email ?? null, phone ?? null, photo ?? null, role ?? null, status ?? null];

  if (enable_auth === false) {
    sets.push('password = ?');
    params.push(`disabled-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  } else if (password) {
    sets.push('password = ?');
    params.push(password);
  }

  params.push(userId, companyId);
  await db.execute(`UPDATE users SET ${sets.join(', ')} WHERE id = ? AND company_id = ?`, params);

  if (Array.isArray(branch_ids)) {
    await updateEmployeeBranches(db, companyId, userId, branch_ids);
  }

  const [rows] = await db.query('SELECT id, company_id, name, email, phone, photo, role, status FROM users WHERE id = ?', [userId]);
  return rows[0];
}

export async function deleteEmployee(db, companyId, userId) {
  const [existing] = await db.execute('SELECT id FROM users WHERE id = ? AND company_id = ?', [userId, companyId]);
  if (!existing.length) {
    const err = new Error('Employee not found.');
    err.statusCode = 404;
    throw err;
  }
  await db.execute('DELETE FROM user_branches WHERE user_id = ? AND company_id = ?', [userId, companyId]);
  await db.execute('DELETE FROM employee_permissions WHERE user_id = ? AND company_id = ?', [userId, companyId]);
  await db.execute('DELETE FROM users WHERE id = ? AND company_id = ?', [userId, companyId]);
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
