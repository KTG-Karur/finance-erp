import { assertValidPhone, assertValidEmail } from '../../shared/validators/contact.js';
import { assertMaxFileSize } from '../../shared/validators/fileSize.js';
import { saveBase64File } from '../../shared/utils/fileStorage.js';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function normalizePayload(payload) {
  return {
    name: String(payload.name || '').trim(),
    phone: String(payload.phone || '').trim(),
    email: payload.email || null,
    address: payload.address || null,
    city: payload.city || null,
    state: payload.state || null,
    pincode: payload.pincode || null,
    nominee_name: payload.nominee_name || null,
    nominee_phone: payload.nominee_phone || null,
    nominee_relation: payload.nominee_relation || null,
    capital_amount: Number(payload.capital_amount) || 0,
    join_date: payload.join_date || null,
    exit_date: payload.exit_date || null,
    notes: payload.notes || null,
    photo: payload.photo || null,
    status: payload.status || 'ACTIVE'
  };
}

async function nextInvestorCode(db) {
  const [rows] = await db.query(
    "SELECT investor_code FROM investors WHERE investor_code LIKE 'INV-%' ORDER BY id DESC LIMIT 1"
  );
  const last = rows[0]?.investor_code;
  const lastSeq = last ? parseInt(last.split('-')[1], 10) || 1000 : 1000;
  return `INV-${lastSeq + 1}`;
}

export async function getInvestors(db) {
  const [rows] = await db.query('SELECT * FROM investors ORDER BY id DESC');
  return rows;
}

function assertValidCapital(payload) {
  const capital = Number(payload.capital_amount);
  if (payload.capital_amount !== undefined && payload.capital_amount !== '' && (Number.isNaN(capital) || capital < 0)) {
    const err = new Error('Capital Amount cannot be negative.');
    err.statusCode = 400;
    throw err;
  }
}

export async function createInvestor(db, payload, companyCode = 'default') {
  if (!payload.name?.trim() || !payload.phone?.trim()) {
    const err = new Error('Investor Name and Phone are required.');
    err.statusCode = 400;
    throw err;
  }
  assertValidPhone(payload.phone, { fieldLabel: 'Investor phone number' });
  assertValidEmail(payload.email, { fieldLabel: 'Investor email' });
  assertValidPhone(payload.nominee_phone, { fieldLabel: 'Nominee phone number', required: false });
  assertValidCapital(payload);
  assertMaxFileSize(payload.photo, MAX_PHOTO_BYTES, 'Investor photo');
  const normalized = normalizePayload(payload);

  if (normalized.photo) {
    normalized.photo = await saveBase64File(normalized.photo, companyCode, 'investors', 'inv_profile');
  }

  // investor_code is derived from MAX(id), which is racy under concurrent
  // double-submits — retry once on the unique-constraint collision rather than
  // taking a table lock for what's a rare, self-resolving conflict.
  for (let attempt = 0; attempt < 2; attempt++) {
    const code = await nextInvestorCode(db);
    try {
      const [result] = await db.execute(
        `INSERT INTO investors (investor_code, name, phone, email, address, city, state, pincode,
          nominee_name, nominee_phone, nominee_relation,
          capital_amount, join_date, exit_date, notes, photo, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [code, normalized.name, normalized.phone, normalized.email, normalized.address, normalized.city,
          normalized.state, normalized.pincode, normalized.nominee_name,
          normalized.nominee_phone, normalized.nominee_relation, normalized.capital_amount, normalized.join_date,
          normalized.exit_date, normalized.notes, normalized.photo, normalized.status]
      );
      return { id: result.insertId, investor_code: code, ...normalized };
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' && attempt === 0) continue;
      throw err;
    }
  }
}

export async function updateInvestor(db, id, payload, companyCode = 'default') {
  const [existing] = await db.query('SELECT id FROM investors WHERE id = ?', [id]);
  if (!existing.length) {
    const err = new Error('Investor not found.');
    err.statusCode = 404;
    throw err;
  }
  if (!payload.name?.trim() || !payload.phone?.trim()) {
    const err = new Error('Investor Name and Phone are required.');
    err.statusCode = 400;
    throw err;
  }
  assertValidPhone(payload.phone, { fieldLabel: 'Investor phone number' });
  assertValidEmail(payload.email, { fieldLabel: 'Investor email' });
  assertValidPhone(payload.nominee_phone, { fieldLabel: 'Nominee phone number', required: false });
  assertValidCapital(payload);
  assertMaxFileSize(payload.photo, MAX_PHOTO_BYTES, 'Investor photo');
  const normalized = normalizePayload(payload);

  if (normalized.photo) {
    normalized.photo = await saveBase64File(normalized.photo, companyCode, 'investors', 'inv_profile');
  }

  await db.execute(
    `UPDATE investors SET name=?, phone=?, email=?, address=?, city=?, state=?, pincode=?,
      nominee_name=?, nominee_phone=?,
      nominee_relation=?, capital_amount=?, join_date=?, exit_date=?, notes=?,
      photo=?, status=? WHERE id = ?`,
    [normalized.name, normalized.phone, normalized.email, normalized.address, normalized.city, normalized.state,
      normalized.pincode, normalized.nominee_name,
      normalized.nominee_phone, normalized.nominee_relation, normalized.capital_amount, normalized.join_date,
      normalized.exit_date, normalized.notes, normalized.photo, normalized.status, id]
  );
  const [rows] = await db.query('SELECT * FROM investors WHERE id = ?', [id]);
  return rows[0];
}

export async function deleteInvestor(db, id) {
  const [result] = await db.execute('DELETE FROM investors WHERE id = ?', [id]);
  if (!result.affectedRows) {
    const err = new Error('Investor not found.');
    err.statusCode = 404;
    throw err;
  }
}
