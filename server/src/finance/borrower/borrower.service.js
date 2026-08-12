import { BorrowerRepository } from './borrower.repository.js';
import { assertValidPhone, assertValidEmail } from '../../shared/validators/contact.js';
import { assertMaxFileSize } from '../../shared/validators/fileSize.js';

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
    assertMaxFileSize(doc?.url, MAX_DOCUMENT_BYTES, `Document "${doc?.name || doc?.category || 'upload'}"`);
  }
}

export class BorrowerService {
  static async getAllBorrowers(db, search) {
    return BorrowerRepository.findAll(db, search);
  }

  static async getBorrowerById(db, id) {
    return BorrowerRepository.findById(db, id);
  }

  static async createBorrower(db, data) {
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

    return BorrowerRepository.create(db, data);
  }

  static async updateBorrower(db, id, data) {
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

    return BorrowerRepository.update(db, id, data);
  }

  static async deleteBorrower(db, id) {
    const existing = await BorrowerRepository.findById(db, id);
    if (!existing) {
      const err = new Error('Customer record not found.');
      err.statusCode = 404;
      throw err;
    }
    const linkedLoanCount = await BorrowerRepository.countLinkedLoans(db, id);
    if (linkedLoanCount > 0) {
      const err = new Error('Cannot delete a customer with linked loan accounts.');
      err.statusCode = 409;
      throw err;
    }
    await BorrowerRepository.delete(db, id);
  }
}
