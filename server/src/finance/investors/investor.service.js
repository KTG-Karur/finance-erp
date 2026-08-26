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
  const [rows] = await db.query('SELECT * FROM investors WHERE deleted_at IS NULL ORDER BY id DESC');
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

import { insertVoucherOnConnection } from '../ledger/ledger.service.js';

export async function createInvestor(db, payload, companyCode = 'default', createdBy = null) {
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

  const capital = Number(normalized.capital_amount) || 0;
  const paymentMode = (payload.payment_mode || 'BANK_TRANSFER').toUpperCase();
  const isBank = paymentMode !== 'CASH';
  const debitCode = payload.settlement_account_code || (isBank ? '1002' : '1001');
  let debitName = isBank ? 'Bank Account' : 'Cash in Hand';
  if (isBank && debitCode) {
    try {
      const [accs] = await db.query('SELECT account_name FROM chart_of_accounts WHERE account_code = ?', [debitCode]);
      if (accs.length && accs[0].account_name) {
        debitName = accs[0].account_name;
      }
    } catch (e) {}
  }
  const joinDate = normalized.join_date || new Date().toISOString().slice(0, 10);
  const branchName = payload.branch || 'Main Branch';

  for (let attempt = 0; attempt < 2; attempt++) {
    const code = await nextInvestorCode(db);
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.execute(
        `INSERT INTO investors (investor_code, name, phone, email, address, city, state, pincode,
          nominee_name, nominee_phone, nominee_relation,
          capital_amount, join_date, exit_date, notes, photo, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [code, normalized.name, normalized.phone, normalized.email, normalized.address, normalized.city,
          normalized.state, normalized.pincode, normalized.nominee_name,
          normalized.nominee_phone, normalized.nominee_relation, normalized.capital_amount, normalized.join_date,
          normalized.exit_date, normalized.notes, normalized.photo, normalized.status]
      );
      const investorId = result.insertId;

      // Double-Entry Posting for Initial Capital Contribution
      if (capital > 0) {
        await insertVoucherOnConnection(conn, {
          entry_date: joinDate,
          description: `Capital Contribution from Investor ${normalized.name} (${code})`,
          voucher_type: isBank ? 'BANK_RECEIPT' : 'CASH_RECEIPT',
          is_auto: true,
          ref_type: 'INVESTOR_CAPITAL',
          ref_id: investorId,
          branch: branchName,
          created_by: createdBy || 'Admin',
          lines: [
            { account_code: debitCode, account_name: debitName, debit: capital, credit: 0, description: `Capital Received via ${isBank ? paymentMode : 'Cash'}` },
            { account_code: '3001', account_name: 'Promoter Share Capital', debit: 0, credit: capital, description: `Share Capital Credited - ${normalized.name}` }
          ]
        });
      }

      await conn.commit();
      return { id: investorId, investor_code: code, ...normalized };
    } catch (err) {
      await conn.rollback();
      if (err.code === 'ER_DUP_ENTRY' && attempt === 0) continue;
      throw err;
    } finally {
      conn.release();
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
  const [result] = await db.execute('UPDATE investors SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL', [id]);
  if (!result.affectedRows) {
    const err = new Error('Investor not found.');
    err.statusCode = 404;
    throw err;
  }
}

export async function addInvestorCapital(db, id, payload = {}, createdBy = null) {
  const amount = Number(payload.amount);
  if (!amount || amount <= 0) {
    const err = new Error('A valid additional capital amount greater than 0 is required.');
    err.statusCode = 400;
    throw err;
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT * FROM investors WHERE id = ? FOR UPDATE', [id]);
    if (!rows.length) {
      const err = new Error('Investor not found.');
      err.statusCode = 404;
      throw err;
    }
    const investor = rows[0];
    const currentCapital = Number(investor.capital_amount) || 0;
    const newCapital = currentCapital + amount;

    await conn.execute('UPDATE investors SET capital_amount = ? WHERE id = ?', [newCapital, id]);

    const paymentMode = (payload.payment_mode || 'BANK_TRANSFER').toUpperCase();
    const isBank = paymentMode !== 'CASH';
    const debitCode = payload.settlement_account_code || (isBank ? '1002' : '1001');
    const debitName = isBank ? 'Bank Account' : 'Cash in Hand';
    const txnDate = payload.date || new Date().toISOString().slice(0, 10);
    const extraNotes = payload.notes ? ` — ${payload.notes}` : '';

    const voucher = await insertVoucherOnConnection(conn, {
      entry_date: txnDate,
      description: `Additional Capital Contribution from Investor ${investor.name} (${investor.investor_code})${extraNotes}`,
      voucher_type: isBank ? 'BANK_RECEIPT' : 'CASH_RECEIPT',
      is_auto: true,
      ref_type: 'INVESTOR_CAPITAL',
      ref_id: investor.id,
      branch: payload.branch || investor.branch || 'Main Branch',
      created_by: createdBy || 'Admin',
      lines: [
        { account_code: debitCode, account_name: debitName, debit: amount, credit: 0, description: `Capital Received via ${isBank ? paymentMode : 'Cash'}` },
        { account_code: '3001', account_name: 'Promoter Share Capital', debit: 0, credit: amount, description: `Additional Capital - ${investor.name}` }
      ]
    });

    await conn.commit();

    const [updatedRows] = await db.query('SELECT * FROM investors WHERE id = ?', [id]);
    return {
      investor: updatedRows[0],
      voucher
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

