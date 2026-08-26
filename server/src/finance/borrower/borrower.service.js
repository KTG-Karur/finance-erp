import { BorrowerRepository } from './borrower.repository.js';
import { assertValidPhone, assertValidEmail } from '../../shared/validators/contact.js';
import { assertMaxFileSize } from '../../shared/validators/fileSize.js';
import { saveBase64File, processDocumentsArray } from '../../shared/utils/fileStorage.js';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

function validateContactFields(data) {
  assertValidPhone(data.phone, { fieldLabel: 'Phone number' });
  assertValidPhone(data.alt_phone, { fieldLabel: 'Alternate phone number', required: false });
  assertValidPhone(data.guarantor_phone, { fieldLabel: 'Guarantor phone number', required: false });
  assertValidEmail(data.email, { fieldLabel: 'Email' });
}

function validateUploadSizes(data) {
  assertMaxFileSize(data.profile_image, MAX_PHOTO_BYTES, 'Profile photo');
  for (const doc of data.documents || []) {
    assertMaxFileSize(doc?.url || doc?.file, MAX_DOCUMENT_BYTES, `Document "${doc?.name || doc?.category || 'upload'}"`);
  }
}

export class BorrowerService {
  static async getAllBorrowers(db, search) {
    return BorrowerRepository.findAll(db, search);
  }

  static async getBorrowerById(db, id) {
    return BorrowerRepository.findById(db, id);
  }

  static async createBorrower(db, data, companyCode = 'default') {
    if (!data.full_name || !data.phone) {
      const err = new Error('Full Name and Phone Number are required.');
      err.statusCode = 400;
      throw err;
    }
    validateContactFields(data);
    validateUploadSizes(data);

    const existing = await BorrowerRepository.findByPhone(db, data.phone.trim());
    if (existing) {
      const err = new Error('A customer with this phone number already exists.');
      err.statusCode = 409;
      throw err;
    }

    const payload = { ...data };
    if (payload.profile_image) {
      payload.profile_image = await saveBase64File(payload.profile_image, companyCode, 'customer', 'cust_profile');
    }
    if (payload.documents) {
      payload.documents = await processDocumentsArray(payload.documents, companyCode);
    }

    return BorrowerRepository.create(db, payload);
  }

  static async updateBorrower(db, id, data, companyCode = 'default') {
    const existing = await BorrowerRepository.findById(db, id);
    if (!existing) {
      const err = new Error('Customer record not found.');
      err.statusCode = 404;
      throw err;
    }
    if (!data.full_name || !data.phone) {
      const err = new Error('Full Name and Phone Number are required.');
      err.statusCode = 400;
      throw err;
    }
    validateContactFields(data);
    validateUploadSizes(data);

    const phoneOwner = await BorrowerRepository.findByPhone(db, data.phone.trim(), id);
    if (phoneOwner) {
      const err = new Error('Another customer already uses this phone number.');
      err.statusCode = 409;
      throw err;
    }

    const payload = { ...data };
    if (payload.profile_image) {
      payload.profile_image = await saveBase64File(payload.profile_image, companyCode, 'customer', 'cust_profile');
    }
    if (payload.documents) {
      payload.documents = await processDocumentsArray(payload.documents, companyCode);
    }

    return BorrowerRepository.update(db, id, payload);
  }

  static async deleteBorrower(db, id) {
    const existing = await BorrowerRepository.findById(db, id);
    if (!existing) {
      const err = new Error('Customer record not found.');
      err.statusCode = 404;
      throw err;
    }
    const { activeLoans, activeFds, activeRds } = await BorrowerRepository.countActiveObligations(db, id);
    if (activeLoans > 0) {
      const err = new Error(`Cannot delete customer "${existing.full_name}" because they have ${activeLoans} active loan account(s). All loans must be settled and closed before deletion.`);
      err.statusCode = 409;
      throw err;
    }
    if (activeFds > 0) {
      const err = new Error(`Cannot delete customer "${existing.full_name}" because they have ${activeFds} active Fixed Deposit(s). Please mature or close them first.`);
      err.statusCode = 409;
      throw err;
    }
    if (activeRds > 0) {
      const err = new Error(`Cannot delete customer "${existing.full_name}" because they have ${activeRds} active Recurring Deposit(s). Please mature or close them first.`);
      err.statusCode = 409;
      throw err;
    }
    await BorrowerRepository.delete(db, id);
  }
}
