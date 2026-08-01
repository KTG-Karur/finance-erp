const borrowerCoreProperties = {
  full_name: { type: 'string', minLength: 2, maxLength: 150 },
  phone: { type: 'string', pattern: '^[6-9][0-9]{9}$' },
  alt_phone: { type: 'string', pattern: '^[6-9][0-9]{9}$|^$' },
  email: { type: 'string', pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$|^$' },
  dob: { type: 'string', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$|^$' },
  gender: { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER', ''] },
  address_line1: { type: 'string', maxLength: 255 },
  address_line2: { type: 'string', maxLength: 255 },
  city: { type: 'string', maxLength: 100 },
  state: { type: 'string', maxLength: 100 },
  pincode: { type: 'string', pattern: '^[0-9]{6}$|^$' },
  aadhaar_number: { type: 'string', pattern: '^[0-9]{12}$|^$' },
  pan_number: { type: 'string', pattern: '^[A-Z]{5}[0-9]{4}[A-Z]$|^$' },
  occupation: { type: 'string', maxLength: 100 },
  monthly_income: { type: ['number', 'null'], minimum: 0 },
  employer_name: { type: 'string', maxLength: 150 },
  guarantor_name: { type: 'string', maxLength: 150 },
  guarantor_phone: { type: 'string', pattern: '^[6-9][0-9]{9}$|^$' },
  nominee_name: { type: 'string', maxLength: 150 },
  nominee_relation: { type: 'string', maxLength: 100 },
  branch: { type: 'string', maxLength: 100 },
  kyc_status: { type: 'string', enum: ['PENDING', 'VERIFIED', 'REJECTED'] },
  notes: { type: 'string', maxLength: 1000 }
};

export const createBorrowerSchema = {
  body: {
    type: 'object',
    required: ['full_name', 'phone'],
    properties: borrowerCoreProperties,
    additionalProperties: false
  }
};

export const updateBorrowerSchema = {
  body: {
    type: 'object',
    required: ['full_name', 'phone'],
    properties: {
      ...borrowerCoreProperties,
      status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'BLACKLISTED'] }
    },
    additionalProperties: false
  }
};

export const rejectKycSchema = {
  body: {
    type: 'object',
    required: ['reason'],
    properties: {
      reason: { type: 'string', minLength: 5, maxLength: 500 }
    },
    additionalProperties: false
  }
};
