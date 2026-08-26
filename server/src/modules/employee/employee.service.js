import bcrypt from 'bcryptjs';
import { assertValidPhone, assertValidEmail } from '../../shared/validators/contact.js';
import { assertMaxFileSize } from '../../shared/validators/fileSize.js';
import { saveBase64File } from '../../shared/utils/fileStorage.js';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const GLOBAL_SCOPE_ROLES = ['ADMIN', 'COMPANY_ADMIN', 'SUPER_ADMIN'];
function assertValidRole(role) {
  if (role !== undefined && role !== null) {
    const r = String(role).trim();
    if (!r || r.length > 64) {
      const err = new Error('Role must be a valid string between 1 and 64 characters.');
      err.statusCode = 400;
      throw err;
    }
  }
}

export async function getAllEmployees(db, companyId) {
  const [users] = await db.query(
    'SELECT id, company_id, name, email, phone, photo, role, status FROM users WHERE company_id = ? AND deleted_at IS NULL',
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
    const branchIds = assignments
      .filter(a => Number(a.user_id) === Number(user.id))
      .map(a => Number(a.branch_id));
    return {
      ...user,
      permissions: userPerms,
      branches,
      branch_ids: branchIds,
      branchScope: GLOBAL_SCOPE_ROLES.includes(user.role) ? 'GLOBAL' : (branches.length ? 'RESTRICTED' : 'UNASSIGNED')
    };
  });
}

export async function createEmployee(db, companyId, employeeData, companyCode = 'default') {
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

  let diskPhoto = photo || null;
  if (photo) {
    diskPhoto = await saveBase64File(photo, companyCode, 'staff', 'staff_photo');
  }

  const rawPassword = (enable_auth !== false && password) ? password : `disabled-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const finalPassword = rawPassword.startsWith('$2') ? rawPassword : await bcrypt.hash(rawPassword, 10);

  const [result] = await db.execute(
    'INSERT INTO users (company_id, name, email, phone, photo, password, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [companyId, name, email, phone || null, diskPhoto, finalPassword, role, 'ACTIVE']
  );

  const userId = result.insertId;
  for (const branchId of branch_ids) {
    await db.execute(
      'INSERT INTO user_branches (company_id, user_id, branch_id) VALUES (?, ?, ?)',
      [companyId, userId, branchId]
    );
  }

  return { id: userId, company_id: companyId, name, email, phone: phone || null, photo: diskPhoto, role, status: 'ACTIVE', branch_ids };
}

export async function updateEmployee(db, companyId, userId, payload, companyCode = 'default') {
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

  let diskPhoto = photo;
  if (photo && typeof photo === 'string' && photo.startsWith('data:')) {
    diskPhoto = await saveBase64File(photo, companyCode, 'staff', 'staff_photo');
  }

  const sets = ['name = COALESCE(?, name)', 'email = COALESCE(?, email)', 'phone = COALESCE(?, phone)', 'photo = COALESCE(?, photo)', 'role = COALESCE(?, role)', 'status = COALESCE(?, status)'];
  const params = [name ?? null, email ?? null, phone ?? null, diskPhoto ?? null, role ?? null, status ?? null];

  if (enable_auth === false) {
    sets.push('password = ?');
    params.push(`disabled-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  } else if (password) {
    const hashed = password.startsWith('$2') ? password : await bcrypt.hash(password, 10);
    sets.push('password = ?');
    params.push(hashed);
  }

  params.push(userId, companyId);
  await db.execute(`UPDATE users SET ${sets.join(', ')} WHERE id = ? AND company_id = ?`, params);

  if (Array.isArray(branch_ids)) {
    await updateEmployeeBranches(db, companyId, userId, branch_ids);
  }

  const [rows] = await db.query('SELECT id, company_id, name, email, phone, photo, role, status FROM users WHERE id = ?', [userId]);
  const [assignedRows] = await db.query('SELECT branch_id FROM user_branches WHERE user_id = ? AND company_id = ?', [userId, companyId]);
  return {
    ...rows[0],
    branch_ids: assignedRows.map(r => r.branch_id)
  };
}

export async function deleteEmployee(db, companyId, userId) {
  const [existing] = await db.execute('SELECT id FROM users WHERE id = ? AND company_id = ? AND deleted_at IS NULL', [userId, companyId]);
  if (!existing.length) {
    const err = new Error('Employee not found.');
    err.statusCode = 404;
    throw err;
  }
  await db.execute('UPDATE users SET deleted_at = CURRENT_TIMESTAMP, status = "INACTIVE" WHERE id = ? AND company_id = ? AND deleted_at IS NULL', [userId, companyId]);
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
