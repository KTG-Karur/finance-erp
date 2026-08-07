import { BorrowerRepository } from './borrower.repository.js';

export class BorrowerService {
  static async getAllBorrowers(db, search) {
    return BorrowerRepository.findAll(db, search);
  }

  static async getBorrowerById(db, id) {
    return BorrowerRepository.findById(db, id);
  }

  static async createBorrower(db, data) {
    if (!data.full_name || !data.phone) {
      throw new Error('Full Name and Phone Number are required.');
    }
    return BorrowerRepository.create(db, data);
  }
}
