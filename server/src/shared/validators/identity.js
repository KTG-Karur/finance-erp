// Standard Indian GSTIN/PAN format checks, same treatment as
// server/src/shared/validators/contact.js's phone/email — a browser form's
// pattern check only stops a well-behaved browser; a direct API call skips
// it entirely, so the real boundary has to live here too.
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export function isValidGstin(value) {
  return GSTIN_RE.test(String(value || '').trim().toUpperCase());
}

export function isValidPan(value) {
  return PAN_RE.test(String(value || '').trim().toUpperCase());
}

// GSTIN/PAN are optional company profile fields (not every business has
// registered for GST, or wants to record a PAN at all) — required defaults
// to false and only format-checks when actually filled in.
export function assertValidGstin(value, { fieldLabel = 'GSTIN', required = false } = {}) {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    if (required) {
      const err = new Error(`${fieldLabel} is required.`);
      err.statusCode = 400;
      throw err;
    }
    return;
  }
  if (!isValidGstin(trimmed)) {
    const err = new Error(`${fieldLabel} must be a valid 15-character GSTIN (e.g. 22AAAAA0000A1Z5).`);
    err.statusCode = 400;
    throw err;
  }
}

export function assertValidPan(value, { fieldLabel = 'PAN', required = false } = {}) {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    if (required) {
      const err = new Error(`${fieldLabel} is required.`);
      err.statusCode = 400;
      throw err;
    }
    return;
  }
  if (!isValidPan(trimmed)) {
    const err = new Error(`${fieldLabel} must be a valid 10-character PAN (e.g. ABCDE1234F).`);
    err.statusCode = 400;
    throw err;
  }
}
