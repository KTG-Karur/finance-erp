import { SchemeRepository } from './scheme.repository.js';
import { validateSchemePayload } from './scheme.validation.js';

function normalizePayload(payload) {
  return {
    name: String(payload.name).trim(),
    unit_base: payload.unit_base || 100,
    rate_per_unit: Number(payload.rate_per_unit),
    formula_type: payload.formula_type || 'STANDARD',
    repayment_method: payload.repayment_method || 'EMI',
    interest_calculation: payload.interest_calculation || 'CONSTANT_FLAT',
    interest_basis: payload.interest_basis || 'MONTHLY',
    accrual_mode: payload.formula_type === 'CUSTOM' ? (payload.accrual_mode || 'LIVE') : null,
    interest_formula: payload.formula_type === 'CUSTOM' ? (payload.interest_formula || []) : [],
    installment_formula: payload.formula_type === 'CUSTOM' && payload.accrual_mode === 'SCHEDULED' ? (payload.installment_formula || []) : [],
    custom_formula_name: payload.custom_formula_name || null,
    repayment_frequency: payload.repayment_frequency || 'DAILY',
    min_amount: payload.min_amount ?? 0,
    max_amount: payload.max_amount ?? 0,
    min_tenure_months: payload.min_tenure_months || 1,
    max_tenure_months: payload.max_tenure_months || 60,
    is_active: payload.is_active !== false
  };
}

export class SchemeService {
  static async getAllSchemes(db) {
    return SchemeRepository.findAll(db);
  }

  static async getSchemeById(db, id) {
    return SchemeRepository.findById(db, id);
  }

  static async createScheme(db, payload) {
    validateSchemePayload(payload);
    const normalized = normalizePayload(payload);

    const nameTaken = await SchemeRepository.findActiveNameConflict(db, normalized.name);
    if (nameTaken) {
      const err = new Error(`A loan scheme named '${normalized.name}' already exists.`);
      err.statusCode = 409;
      throw err;
    }

    return SchemeRepository.create(db, normalized);
  }

  static async updateScheme(db, id, payload) {
    const existing = await SchemeRepository.findById(db, id);
    if (!existing) {
      const err = new Error('Loan scheme not found.');
      err.statusCode = 404;
      throw err;
    }

    validateSchemePayload(payload);
    const normalized = normalizePayload(payload);

    const nameTaken = await SchemeRepository.findActiveNameConflict(db, normalized.name, id);
    if (nameTaken) {
      const err = new Error(`A loan scheme named '${normalized.name}' already exists.`);
      err.statusCode = 409;
      throw err;
    }

    return SchemeRepository.update(db, id, normalized);
  }

  static async deleteScheme(db, id) {
    const existing = await SchemeRepository.findById(db, id);
    if (!existing) {
      const err = new Error('Loan scheme not found.');
      err.statusCode = 404;
      throw err;
    }

    const activeLoanCount = await SchemeRepository.countActiveLoansUsingScheme(db, id);
    if (activeLoanCount > 0) {
      const err = new Error('Cannot delete: this scheme is assigned to active loans or applications.');
      err.statusCode = 409;
      throw err;
    }

    await SchemeRepository.remove(db, id);
    return { success: true };
  }
}
