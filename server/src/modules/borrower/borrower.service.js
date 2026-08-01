function normalize(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

async function findConflict(db, companyId, { phone, aadhaar_number, pan_number }, excludeId = null) {
  const [rows] = await db.query('SELECT * FROM borrowers WHERE company_id = ?', [companyId]);
  for (const b of rows) {
    if (excludeId && b.id == excludeId) continue;
    if (normalize(phone) && normalize(b.phone) === normalize(phone)) return 'phone';
    if (normalize(aadhaar_number) && normalize(b.aadhaar_number) === normalize(aadhaar_number)) return 'aadhaar_number';
    if (normalize(pan_number) && normalize(b.pan_number).toUpperCase() === normalize(pan_number).toUpperCase()) return 'pan_number';
  }
  return null;
}

export async function getAllBorrowers(db, companyId) {
  const [rows] = await db.query('SELECT * FROM borrowers WHERE company_id = ? ORDER BY id DESC', [companyId]);
  return rows;
}

export async function getBorrowerById(db, companyId, id) {
  const [rows] = await db.query('SELECT * FROM borrowers WHERE id = ? AND company_id = ?', [id, companyId]);
  return rows[0] || null;
}

export async function createBorrower(db, companyId, payload) {
  const conflict = await findConflict(db, companyId, payload);
  if (conflict) {
    const err = new Error(`A customer with this ${conflict === 'phone' ? 'phone number' : conflict === 'aadhaar_number' ? 'Aadhaar number' : 'PAN number'} already exists.`);
    err.statusCode = 409;
    err.field = conflict;
    throw err;
  }

  const [existing] = await db.query('SELECT * FROM borrowers WHERE company_id = ?', [companyId]);
  const nextSeq = existing.length
    ? Math.max(...existing.map(b => parseInt((b.borrower_code || 'BR-0000').split('-')[1], 10) || 0)) + 1
    : 1;
  const borrower_code = `BR-${String(nextSeq).padStart(4, '0')}`;

  const [result] = await db.execute(
    `INSERT INTO borrowers (
      company_id, borrower_code, full_name, phone, alt_phone, email, dob, gender,
      address_line1, address_line2, city, state, pincode, aadhaar_number, pan_number,
      occupation, monthly_income, employer_name, guarantor_name, guarantor_phone,
      nominee_name, nominee_relation, branch, kyc_status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      companyId, borrower_code, payload.full_name, payload.phone, payload.alt_phone || '', payload.email || '',
      payload.dob || null, payload.gender || '', payload.address_line1 || '', payload.address_line2 || '',
      payload.city || '', payload.state || '', payload.pincode || '', payload.aadhaar_number || '',
      (payload.pan_number || '').toUpperCase(), payload.occupation || '', payload.monthly_income ?? null,
      payload.employer_name || '', payload.guarantor_name || '', payload.guarantor_phone || '',
      payload.nominee_name || '', payload.nominee_relation || '', payload.branch || '',
      payload.kyc_status || 'PENDING', payload.notes || ''
    ]
  );

  return getBorrowerById(db, companyId, result.insertId);
}

export async function updateBorrower(db, companyId, id, payload) {
  const existing = await getBorrowerById(db, companyId, id);
  if (!existing) {
    const err = new Error('Customer not found.');
    err.statusCode = 404;
    throw err;
  }

  const conflict = await findConflict(db, companyId, payload, id);
  if (conflict) {
    const err = new Error(`Another customer already uses this ${conflict === 'phone' ? 'phone number' : conflict === 'aadhaar_number' ? 'Aadhaar number' : 'PAN number'}.`);
    err.statusCode = 409;
    err.field = conflict;
    throw err;
  }

  await db.execute(
    `UPDATE borrowers SET
      full_name = ?, phone = ?, alt_phone = ?, email = ?, dob = ?, gender = ?,
      address_line1 = ?, address_line2 = ?, city = ?, state = ?, pincode = ?, aadhaar_number = ?, pan_number = ?,
      occupation = ?, monthly_income = ?, employer_name = ?, guarantor_name = ?, guarantor_phone = ?,
      nominee_name = ?, nominee_relation = ?, branch = ?, kyc_status = ?, status = ?, notes = ?
     WHERE id = ? AND company_id = ?`,
    [
      payload.full_name, payload.phone, payload.alt_phone || '', payload.email || '',
      payload.dob || null, payload.gender || '', payload.address_line1 || '', payload.address_line2 || '',
      payload.city || '', payload.state || '', payload.pincode || '', payload.aadhaar_number || '',
      (payload.pan_number || '').toUpperCase(), payload.occupation || '', payload.monthly_income ?? null,
      payload.employer_name || '', payload.guarantor_name || '', payload.guarantor_phone || '',
      payload.nominee_name || '', payload.nominee_relation || '', payload.branch || '',
      payload.kyc_status || existing.kyc_status || 'PENDING', payload.status || existing.status || 'ACTIVE',
      payload.notes || '', id, companyId
    ]
  );

  return getBorrowerById(db, companyId, id);
}

export async function verifyBorrowerKyc(db, companyId, id, reviewedBy) {
  const existing = await getBorrowerById(db, companyId, id);
  if (!existing) {
    const err = new Error('Customer not found.');
    err.statusCode = 404;
    throw err;
  }
  if (existing.kyc_status === 'VERIFIED') {
    const err = new Error('This customer\'s KYC is already verified.');
    err.statusCode = 409;
    throw err;
  }

  const today = new Date().toISOString().slice(0, 10);
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 2);
  const expiryStr = expiry.toISOString().slice(0, 10);

  await db.execute(
    `UPDATE borrowers SET kyc_status = ?, kyc_verified_at = ?, kyc_expiry_date = ?, kyc_rejection_reason = ?, kyc_reviewed_by = ?, kyc_reviewed_at = ?
     WHERE id = ? AND company_id = ?`,
    ['VERIFIED', today, expiryStr, null, reviewedBy || '', today, id, companyId]
  );

  return getBorrowerById(db, companyId, id);
}

export async function rejectBorrowerKyc(db, companyId, id, reason, reviewedBy) {
  const existing = await getBorrowerById(db, companyId, id);
  if (!existing) {
    const err = new Error('Customer not found.');
    err.statusCode = 404;
    throw err;
  }
  if (!reason || !reason.trim()) {
    const err = new Error('A rejection reason is required.');
    err.statusCode = 400;
    throw err;
  }

  const today = new Date().toISOString().slice(0, 10);

  await db.execute(
    `UPDATE borrowers SET kyc_status = ?, kyc_verified_at = ?, kyc_expiry_date = ?, kyc_rejection_reason = ?, kyc_reviewed_by = ?, kyc_reviewed_at = ?
     WHERE id = ? AND company_id = ?`,
    ['REJECTED', null, null, reason.trim(), reviewedBy || '', today, id, companyId]
  );

  return getBorrowerById(db, companyId, id);
}

export async function deleteBorrower(db, companyId, id) {
  const existing = await getBorrowerById(db, companyId, id);
  if (!existing) {
    const err = new Error('Customer not found.');
    err.statusCode = 404;
    throw err;
  }

  const [loanRows] = await db.query('SELECT * FROM loans WHERE company_id = ?', [companyId]);
  const linkedActiveLoans = loanRows.filter(l =>
    normalize(l.phone) === normalize(existing.phone) &&
    (l.status === 'ACTIVE' || l.status === 'OVERDUE' || l.status === 'PENDING')
  );

  if (linkedActiveLoans.length > 0) {
    const err = new Error(`Cannot delete: this customer has ${linkedActiveLoans.length} active/pending loan account(s). Close those loans first.`);
    err.statusCode = 409;
    throw err;
  }

  await db.execute('DELETE FROM borrowers WHERE id = ? AND company_id = ?', [id, companyId]);
  return { success: true };
}
