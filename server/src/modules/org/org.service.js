function conflictCheck(list, companyId, code, excludeId = null) {
  return list.some(item =>
    item.company_id == companyId &&
    item.code.toUpperCase() === code.toUpperCase() &&
    (!excludeId || item.id != excludeId)
  );
}

export async function getSubCompanies(db, companyId) {
  const [rows] = await db.query('SELECT * FROM sub_companies WHERE company_id = ? ORDER BY id', [companyId]);
  return rows;
}

export async function createSubCompany(db, companyId, payload) {
  const [existing] = await db.query('SELECT * FROM sub_companies WHERE company_id = ?', [companyId]);
  if (conflictCheck(existing, companyId, payload.code)) {
    const err = new Error(`Sub-company code '${payload.code.toUpperCase()}' already exists.`);
    err.statusCode = 409;
    throw err;
  }
  const [result] = await db.execute(
    'INSERT INTO sub_companies (company_id, name, code) VALUES (?, ?, ?)',
    [companyId, payload.name, payload.code.toUpperCase()]
  );
  return { id: result.insertId, company_id: companyId, name: payload.name, code: payload.code.toUpperCase(), is_active: 1 };
}

export async function updateSubCompany(db, companyId, id, payload) {
  const [existing] = await db.query('SELECT * FROM sub_companies WHERE company_id = ?', [companyId]);
  if (!existing.find(s => s.id == id)) {
    const err = new Error('Sub-company not found.');
    err.statusCode = 404;
    throw err;
  }
  if (conflictCheck(existing, companyId, payload.code, id)) {
    const err = new Error(`Sub-company code '${payload.code.toUpperCase()}' already exists.`);
    err.statusCode = 409;
    throw err;
  }
  await db.execute(
    'UPDATE sub_companies SET name = ?, code = ?, is_active = ? WHERE id = ? AND company_id = ?',
    [payload.name, payload.code.toUpperCase(), payload.is_active === undefined ? 1 : (payload.is_active ? 1 : 0), id, companyId]
  );
  return { id: Number(id), company_id: companyId, name: payload.name, code: payload.code.toUpperCase(), is_active: payload.is_active === undefined ? 1 : (payload.is_active ? 1 : 0) };
}

export async function deleteSubCompany(db, companyId, id) {
  const [branches] = await db.query('SELECT * FROM branches WHERE company_id = ?', [companyId]);
  const linkedBranches = branches.filter(b => b.sub_company_id == id);
  if (linkedBranches.length > 0) {
    const err = new Error(`Cannot delete: ${linkedBranches.length} branch(es) are assigned to this sub-company. Reassign or delete them first.`);
    err.statusCode = 409;
    throw err;
  }
  const [result] = await db.execute('DELETE FROM sub_companies WHERE id = ? AND company_id = ?', [id, companyId]);
  if (!result.affectedRows) {
    const err = new Error('Sub-company not found.');
    err.statusCode = 404;
    throw err;
  }
  return { success: true };
}

export async function getBranches(db, companyId) {
  const [rows] = await db.query('SELECT * FROM branches WHERE company_id = ? ORDER BY id', [companyId]);
  return rows;
}

export async function createBranch(db, companyId, payload, maxBranches) {
  const [existing] = await db.query('SELECT * FROM branches WHERE company_id = ?', [companyId]);
  if (conflictCheck(existing, companyId, payload.code)) {
    const err = new Error(`Branch code '${payload.code.toUpperCase()}' already exists.`);
    err.statusCode = 409;
    throw err;
  }
  // maxBranches is null/undefined for an unrestricted tenant (see companies.
  // max_branches — a SuperAdmin opts a tenant INTO a cap, default is unlimited).
  if (maxBranches != null && existing.length >= maxBranches) {
    const err = new Error(`Branch limit reached: this plan allows a maximum of ${maxBranches} branch(es). Contact your account administrator to increase this limit.`);
    err.statusCode = 409;
    throw err;
  }
  const [result] = await db.execute(
    'INSERT INTO branches (company_id, sub_company_id, name, code, address, city, state, pincode, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [companyId, payload.sub_company_id || null, String(payload.name || '').trim(), payload.code.toUpperCase(), payload.address || '', payload.city || null, payload.state || null, payload.pincode || null, payload.phone || null]
  );
  const [[created]] = await db.query('SELECT * FROM branches WHERE id = ?', [result.insertId]);
  return created;
}

export async function updateBranch(db, companyId, id, payload) {
  const [existing] = await db.query('SELECT * FROM branches WHERE company_id = ?', [companyId]);
  if (!existing.find(b => b.id == id)) {
    const err = new Error('Branch not found.');
    err.statusCode = 404;
    throw err;
  }
  if (conflictCheck(existing, companyId, payload.code, id)) {
    const err = new Error(`Branch code '${payload.code.toUpperCase()}' already exists.`);
    err.statusCode = 409;
    throw err;
  }
  await db.execute(
    'UPDATE branches SET sub_company_id = ?, name = ?, code = ?, address = ?, city = ?, state = ?, pincode = ?, phone = ?, is_active = ? WHERE id = ? AND company_id = ?',
    [payload.sub_company_id || null, String(payload.name || '').trim(), payload.code.toUpperCase(), payload.address || '', payload.city || null, payload.state || null, payload.pincode || null, payload.phone || null, payload.is_active === undefined ? 1 : (payload.is_active ? 1 : 0), id, companyId]
  );
  const [[updated]] = await db.query('SELECT * FROM branches WHERE id = ?', [id]);
  return updated;
}

export async function deleteBranch(db, companyId, id) {
  const [userBranches] = await db.query('SELECT * FROM user_branches WHERE company_id = ?', [companyId]);
  const linkedUsers = userBranches.filter(ub => ub.branch_id == id);
  if (linkedUsers.length > 0) {
    const err = new Error(`Cannot delete: ${linkedUsers.length} staff member(s) are assigned to this branch. Reassign them first.`);
    err.statusCode = 409;
    throw err;
  }

  // loans/borrowers store `branch` as a plain name string, not a real FK to
  // this table (same denormalized pattern used throughout this schema) — so
  // deleting the branch row wouldn't throw a DB-level foreign key error, it
  // would just silently orphan those records: they'd keep a `branch` value
  // that no longer corresponds to any real branch, quietly disappearing from
  // every branch-scoped filter/view (their name still shows on the record,
  // but nothing in the branch dropdown would ever match it again).
  const [[branchRow]] = await db.query('SELECT name FROM branches WHERE id = ? AND company_id = ?', [id, companyId]);
  if (branchRow) {
    const [[loanCount]] = await db.query('SELECT COUNT(*) as c FROM loans WHERE branch = ?', [branchRow.name]);
    if (Number(loanCount.c) > 0) {
      const err = new Error(`Cannot delete: ${loanCount.c} loan account(s) are recorded under this branch.`);
      err.statusCode = 409;
      throw err;
    }
    const [[borrowerCount]] = await db.query('SELECT COUNT(*) as c FROM borrowers WHERE branch = ?', [branchRow.name]);
    if (Number(borrowerCount.c) > 0) {
      const err = new Error(`Cannot delete: ${borrowerCount.c} customer(s) are recorded under this branch.`);
      err.statusCode = 409;
      throw err;
    }
  }

  const [result] = await db.execute('DELETE FROM branches WHERE id = ? AND company_id = ?', [id, companyId]);
  if (!result.affectedRows) {
    const err = new Error('Branch not found.');
    err.statusCode = 404;
    throw err;
  }
  return { success: true };
}
