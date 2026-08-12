// Shared phone/email format checks — mirrors the client's PHONE_RE/EMAIL_RE
// (see client/src/finance/borrowers/CustomerFormPage.jsx) so the two layers
// agree on what "valid" means. Client-side validation only stops a well-behaved
// browser form; a direct API call skips it entirely, so the real boundary has
// to live here.
const PHONE_RE = /^[6-9][0-9]{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidIndianMobile(value) {
  return PHONE_RE.test(String(value || '').trim());
}

export function isValidEmail(value) {
  return EMAIL_RE.test(String(value || '').trim());
}

// Throws a 400 if `phone` is required-but-missing, or present-but-malformed.
// Set `required: false` for optional phone fields (nominee, alt/guarantor
// contacts) — still format-checked when they're actually filled in.
export function assertValidPhone(value, { fieldLabel = 'Phone number', required = true } = {}) {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    if (required) {
      const err = new Error(`${fieldLabel} is required.`);
      err.statusCode = 400;
      throw err;
    }
    return;
  }
  if (!isValidIndianMobile(trimmed)) {
    const err = new Error(`${fieldLabel} must be a valid 10-digit mobile number.`);
    err.statusCode = 400;
    throw err;
  }
}

export function assertValidEmail(value, { fieldLabel = 'Email', required = false } = {}) {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    if (required) {
      const err = new Error(`${fieldLabel} is required.`);
      err.statusCode = 400;
      throw err;
    }
    return;
  }
  if (!isValidEmail(trimmed)) {
    const err = new Error(`${fieldLabel} must be a valid email address.`);
    err.statusCode = 400;
    throw err;
  }
}
