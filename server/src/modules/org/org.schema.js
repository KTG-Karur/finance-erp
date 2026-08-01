export const createSubCompanySchema = {
  body: {
    type: 'object',
    required: ['name', 'code'],
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 150 },
      code: { type: 'string', minLength: 2, maxLength: 20 }
    }
  }
};

export const updateSubCompanySchema = {
  body: {
    type: 'object',
    required: ['name', 'code'],
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 150 },
      code: { type: 'string', minLength: 2, maxLength: 20 },
      is_active: { type: 'boolean' }
    }
  }
};

export const createBranchSchema = {
  body: {
    type: 'object',
    required: ['name', 'code'],
    properties: {
      sub_company_id: { type: ['integer', 'null'] },
      name: { type: 'string', minLength: 2, maxLength: 150 },
      code: { type: 'string', minLength: 2, maxLength: 20 },
      address: { type: 'string', maxLength: 255 }
    }
  }
};

export const updateBranchSchema = {
  body: {
    type: 'object',
    required: ['name', 'code'],
    properties: {
      sub_company_id: { type: ['integer', 'null'] },
      name: { type: 'string', minLength: 2, maxLength: 150 },
      code: { type: 'string', minLength: 2, maxLength: 20 },
      address: { type: 'string', maxLength: 255 },
      is_active: { type: 'boolean' }
    }
  }
};
