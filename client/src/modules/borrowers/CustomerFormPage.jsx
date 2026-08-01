import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  AlertCircle,
  Camera,
  X,
  UploadCloud,
  FileText,
  Trash2,
  User,
  Phone,
  MapPin,
  ShieldCheck,
  Briefcase,
  Users as UsersIcon
} from 'lucide-react';

const EMPTY_FORM = {
  full_name: '',
  phone: '',
  alt_phone: '',
  email: '',
  dob: '',
  gender: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  pincode: '',
  id_proof_type: 'AADHAAR',
  aadhaar_number: '',
  pan_number: '',
  occupation: '',
  monthly_income: '',
  employer_name: '',
  guarantor_name: '',
  guarantor_phone: '',
  nominee_name: '',
  nominee_relation: '',
  branch: '',
  status: 'ACTIVE',
  notes: ''
};

const DOC_TYPES = [
  { value: 'AADHAAR_CARD', label: 'Aadhaar Card' },
  { value: 'PAN_CARD', label: 'PAN Card' },
  { value: 'ADDRESS_PROOF', label: 'Address Proof' },
  { value: 'VOTER_ID', label: 'Voter ID' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'DRIVING_LICENSE', label: 'Driving License' },
  { value: 'BANK_PASSBOOK', label: 'Bank Passbook' },
  { value: 'OTHER', label: 'Other Document' }
];

const PHONE_RE = /^[6-9][0-9]{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AADHAAR_RE = /^[0-9]{12}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const PINCODE_RE = /^[0-9]{6}$/;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB, client-side only (mock storage)

function validate(form) {
  const errors = {};

  if (!form.full_name.trim() || form.full_name.trim().length < 2) {
    errors.full_name = 'Full name is required (min 2 characters).';
  }
  if (!PHONE_RE.test(form.phone.trim())) {
    errors.phone = 'Enter a valid 10-digit mobile number starting with 6-9.';
  }
  if (form.alt_phone.trim() && !PHONE_RE.test(form.alt_phone.trim())) {
    errors.alt_phone = 'Enter a valid 10-digit mobile number.';
  }
  if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (form.dob) {
    const dobDate = new Date(form.dob);
    const today = new Date();
    const age = (today - dobDate) / (1000 * 60 * 60 * 24 * 365.25);
    if (dobDate > today) {
      errors.dob = 'Date of birth cannot be in the future.';
    } else if (age < 18) {
      errors.dob = 'Customer must be at least 18 years old.';
    }
  }
  if (form.pincode.trim() && !PINCODE_RE.test(form.pincode.trim())) {
    errors.pincode = 'Enter a valid 6-digit pincode.';
  }
  if (form.aadhaar_number.trim() && !AADHAAR_RE.test(form.aadhaar_number.trim())) {
    errors.aadhaar_number = 'Aadhaar must be exactly 12 digits.';
  }
  if (form.pan_number.trim() && !PAN_RE.test(form.pan_number.trim().toUpperCase())) {
    errors.pan_number = 'PAN must be in format ABCDE1234F.';
  }
  if (form.monthly_income !== '' && (isNaN(form.monthly_income) || Number(form.monthly_income) < 0)) {
    errors.monthly_income = 'Monthly income must be a positive number.';
  }
  if (form.guarantor_phone.trim() && !PHONE_RE.test(form.guarantor_phone.trim())) {
    errors.guarantor_phone = 'Enter a valid 10-digit mobile number.';
  }

  return errors;
}

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CustomerFormPage({ mode = 'CREATE', initialData, branches = [], onCancel, onSubmit }) {
  const [form, setForm] = useState(() => {
    if (initialData) {
      const sanitized = { ...EMPTY_FORM };
      Object.keys(EMPTY_FORM).forEach((key) => {
        const value = initialData[key];
        sanitized[key] = value === null || value === undefined ? EMPTY_FORM[key] : value;
      });
      return sanitized;
    }
    return EMPTY_FORM;
  });
  const [profileImage, setProfileImage] = useState(initialData?.profile_image || null);
  const [documents, setDocuments] = useState(initialData?.documents || []);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [photoDragActive, setPhotoDragActive] = useState(false);
  const [docDragActive, setDocDragActive] = useState(false);

  const photoInputRef = useRef(null);
  const docInputRef = useRef(null);

  const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(validate(form));
  };
  const err = (field) => touched[field] && errors[field];

  const handlePhotoFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const dataUrl = await readFileAsDataUrl(file);
    setProfileImage(dataUrl);
  };

  const handleDocFiles = async (fileList) => {
    const files = Array.from(fileList).filter(f => f.size <= MAX_FILE_SIZE);
    const newDocs = await Promise.all(files.map(async (file) => {
      const isImage = file.type.startsWith('image/');
      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        size: file.size,
        mime: file.type,
        doc_type: 'OTHER',
        dataUrl: isImage ? await readFileAsDataUrl(file) : null
      };
    }));
    setDocuments(prev => [...prev, ...newDocs]);
  };

  const setDocType = (id, doc_type) => {
    setDocuments(prev => prev.map(d => (d.id === id ? { ...d, doc_type } : d)));
  };

  const removeDoc = (id) => setDocuments(prev => prev.filter(d => d.id !== id));

  const completeness = (() => {
    const checks = [
      form.full_name, form.phone, form.dob, form.address_line1, form.aadhaar_number || form.pan_number,
      form.branch, profileImage, documents.length > 0
    ];
    const filled = checks.filter(Boolean).length;
    return Math.round((filled / checks.length) * 100);
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const validationErrors = validate(form);
    setErrors(validationErrors);
    setTouched({
      full_name: true, phone: true, alt_phone: true, email: true, dob: true,
      pincode: true, aadhaar_number: true, pan_number: true, monthly_income: true, guarantor_phone: true
    });
    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);
    try {
      const payload = {
        ...form,
        pan_number: form.pan_number.trim().toUpperCase(),
        monthly_income: form.monthly_income === '' ? null : Number(form.monthly_income),
        profile_image: profileImage,
        documents
      };
      await onSubmit(payload, initialData?.id);
    } catch (error) {
      setServerError(error?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="borrowers-page customer-form-page">

      <div className="cf-page-header">
        <div className="cf-header-left">
          <button type="button" className="cf-back-btn" onClick={onCancel} title="Back to Customer Directory">
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </button>
          <div className="cf-header-titles">
            <h1>{mode === 'EDIT' ? 'Edit Customer Master' : 'Register New Customer'}</h1>
            <p>Complete KYC and profile details for the customer master record</p>
          </div>
        </div>
        <div className="cf-header-actions">
          <button type="button" onClick={onCancel} className="btn-cancel" disabled={loading}>Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={loading} className="btn-submit">
            {loading ? (
              <>
                <span className="loader loader--white"></span>
                <span>Saving Record...</span>
              </>
            ) : (
              <span>{mode === 'EDIT' ? 'Save Changes' : 'Save Customer'}</span>
            )}
          </button>
        </div>
      </div>

      {serverError && (
        <div className="form-alert form-alert--error" style={{ margin: 0 }}>
          <AlertCircle style={{ width: 14, height: 14 }} />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="cf-page-grid">

          {/* ── Left Rail: Photo + Documents + Completeness ── */}
          <div className="cf-page-side">

            <div className="cf-card">
              <span className="cf-card-label">Profile Photo</span>
              <div
                className={`cf-photo-drop ${profileImage ? 'has-image' : ''} ${photoDragActive ? 'drag-active' : ''}`}
                onClick={() => photoInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setPhotoDragActive(true); }}
                onDragLeave={() => setPhotoDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setPhotoDragActive(false);
                  handlePhotoFile(e.dataTransfer.files?.[0]);
                }}
              >
                {profileImage ? (
                  <img src={profileImage} alt="Customer" />
                ) : (
                  <>
                    <Camera style={{ width: 26, height: 26 }} />
                    <span className="cf-photo-drop__label">Drag & drop or click to upload photo</span>
                  </>
                )}
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handlePhotoFile(e.target.files?.[0])}
              />
              {profileImage && (
                <button type="button" className="cf-photo-remove" onClick={() => setProfileImage(null)}>
                  <Trash2 style={{ width: 13, height: 13 }} />
                  <span>Remove Photo</span>
                </button>
              )}
              <p className="cf-card-hint">JPG or PNG, recommended square image.</p>
            </div>

            <div className="cf-card">
              <span className="cf-card-label">KYC Documents</span>
              <div
                className={`cf-doc-drop ${docDragActive ? 'drag-active' : ''}`}
                onClick={() => docInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDocDragActive(true); }}
                onDragLeave={() => setDocDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDocDragActive(false);
                  handleDocFiles(e.dataTransfer.files);
                }}
              >
                <UploadCloud style={{ width: 22, height: 22 }} />
                <strong>Drag & drop documents here</strong>
                <span>or click to browse (Aadhaar, PAN, address proof...)</span>
              </div>
              <input
                ref={docInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => handleDocFiles(e.target.files)}
              />

              {documents.length > 0 && (
                <div className="cf-doc-list">
                  {documents.map(doc => (
                    <div className="cf-doc-item" key={doc.id}>
                      <div className="cf-doc-thumb">
                        {doc.dataUrl ? <img src={doc.dataUrl} alt={doc.name} /> : <FileText style={{ width: 16, height: 16 }} />}
                      </div>
                      <div className="cf-doc-meta">
                        <span className="cf-doc-name" title={doc.name}>{doc.name}</span>
                        <span className="cf-doc-size">{fmtSize(doc.size)}</span>
                        <select
                          className="input-control cf-doc-type-select"
                          style={{ height: 28, fontSize: '0.68rem', marginTop: 4 }}
                          value={doc.doc_type}
                          onChange={(e) => setDocType(doc.id, e.target.value)}
                        >
                          {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <button type="button" className="cf-doc-remove" onClick={() => removeDoc(doc.id)} title="Remove document">
                        <X style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="cf-card-hint">Uploads are stored locally in this demo session (no server storage yet).</p>
            </div>

            <div className="cf-card">
              <span className="cf-card-label">Profile Completeness</span>
              <div className="cf-progress-track">
                <div className="cf-progress-fill" style={{ width: `${completeness}%` }} />
              </div>
              <p className="cf-card-hint">{completeness}% of key fields completed.</p>
            </div>

          </div>

          {/* ── Right: Sectioned Form ── */}
          <div className="cf-page-main">

            <div className="form-section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <User style={{ width: 13, height: 13 }} />
              <span>Personal Details</span>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Customer Full Name *</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setField('full_name', e.target.value)}
                  onBlur={() => handleBlur('full_name')}
                  placeholder="e.g. Ramesh Chandra"
                  className={`input-control ${err('full_name') ? 'input-control--error' : ''}`}
                />
                {err('full_name') && <span className="field-error">{errors.full_name}</span>}
              </div>
              <div className="form-group">
                <label>Date of Birth</label>
                <input
                  type="date"
                  value={form.dob}
                  onChange={(e) => setField('dob', e.target.value)}
                  onBlur={() => handleBlur('dob')}
                  className={`input-control ${err('dob') ? 'input-control--error' : ''}`}
                />
                {err('dob') && <span className="field-error">{errors.dob}</span>}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Gender</label>
                <select value={form.gender} onChange={(e) => setField('gender', e.target.value)} className="input-control">
                  <option value="">Select</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Occupation</label>
                <input
                  type="text"
                  value={form.occupation}
                  onChange={(e) => setField('occupation', e.target.value)}
                  placeholder="e.g. Business, Salaried"
                  className="input-control"
                />
              </div>
            </div>

            <div className="form-section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Phone style={{ width: 13, height: 13 }} />
              <span>Contact Details</span>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Mobile Phone *</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onBlur={() => handleBlur('phone')}
                  placeholder="10-digit number"
                  className={`input-control mono ${err('phone') ? 'input-control--error' : ''}`}
                />
                {err('phone') && <span className="field-error">{errors.phone}</span>}
              </div>
              <div className="form-group">
                <label>Alternate Phone</label>
                <input
                  type="tel"
                  value={form.alt_phone}
                  onChange={(e) => setField('alt_phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onBlur={() => handleBlur('alt_phone')}
                  placeholder="Optional"
                  className={`input-control mono ${err('alt_phone') ? 'input-control--error' : ''}`}
                />
                {err('alt_phone') && <span className="field-error">{errors.alt_phone}</span>}
              </div>
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                placeholder="name@example.com"
                className={`input-control ${err('email') ? 'input-control--error' : ''}`}
              />
              {err('email') && <span className="field-error">{errors.email}</span>}
            </div>

            <div className="form-section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin style={{ width: 13, height: 13 }} />
              <span>Address</span>
            </div>
            <div className="form-group">
              <label>Address Line 1</label>
              <input type="text" value={form.address_line1} onChange={(e) => setField('address_line1', e.target.value)} className="input-control" placeholder="House / Street" />
            </div>
            <div className="form-group">
              <label>Address Line 2</label>
              <input type="text" value={form.address_line2} onChange={(e) => setField('address_line2', e.target.value)} className="input-control" placeholder="Locality / Landmark" />
            </div>
            <div className="form-row form-row--3">
              <div className="form-group">
                <label>City</label>
                <input type="text" value={form.city} onChange={(e) => setField('city', e.target.value)} className="input-control" />
              </div>
              <div className="form-group">
                <label>State</label>
                <input type="text" value={form.state} onChange={(e) => setField('state', e.target.value)} className="input-control" />
              </div>
              <div className="form-group">
                <label>Pincode</label>
                <input
                  type="text"
                  value={form.pincode}
                  onChange={(e) => setField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onBlur={() => handleBlur('pincode')}
                  className={`input-control mono ${err('pincode') ? 'input-control--error' : ''}`}
                />
                {err('pincode') && <span className="field-error">{errors.pincode}</span>}
              </div>
            </div>

            <div className="form-section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck style={{ width: 13, height: 13 }} />
              <span>KYC / Identity</span>
            </div>
            <div className="form-group">
              <label>Primary ID Proof Type</label>
              <select value={form.id_proof_type} onChange={(e) => setField('id_proof_type', e.target.value)} className="input-control">
                <option value="AADHAAR">Aadhaar Card</option>
                <option value="VOTER_ID">Voter ID</option>
                <option value="PASSPORT">Passport</option>
                <option value="DRIVING_LICENSE">Driving License</option>
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Aadhaar Number</label>
                <input
                  type="text"
                  value={form.aadhaar_number}
                  onChange={(e) => setField('aadhaar_number', e.target.value.replace(/\D/g, '').slice(0, 12))}
                  onBlur={() => handleBlur('aadhaar_number')}
                  placeholder="12-digit Aadhaar"
                  className={`input-control mono ${err('aadhaar_number') ? 'input-control--error' : ''}`}
                />
                {err('aadhaar_number') && <span className="field-error">{errors.aadhaar_number}</span>}
              </div>
              <div className="form-group">
                <label>PAN Card Number</label>
                <input
                  type="text"
                  value={form.pan_number}
                  onChange={(e) => setField('pan_number', e.target.value.toUpperCase().slice(0, 10))}
                  onBlur={() => handleBlur('pan_number')}
                  placeholder="10-character PAN"
                  className={`input-control mono ${err('pan_number') ? 'input-control--error' : ''}`}
                  style={{ textTransform: 'uppercase' }}
                />
                {err('pan_number') && <span className="field-error">{errors.pan_number}</span>}
              </div>
            </div>
            {mode === 'EDIT' && (
              <div className="form-group">
                <label>Account Status</label>
                <select value={form.status} onChange={(e) => setField('status', e.target.value)} className="input-control">
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="BLACKLISTED">Blacklisted</option>
                </select>
              </div>
            )}
            {mode === 'CREATE' && (
              <div className="form-alert" style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}>
                <span>New customers are created with KYC status <strong>Pending</strong> by default. Verify or reject KYC from the customer directory after registration.</span>
              </div>
            )}

            <div className="form-section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Briefcase style={{ width: 13, height: 13 }} />
              <span>Employment</span>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Monthly Income (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={form.monthly_income}
                  onChange={(e) => setField('monthly_income', e.target.value)}
                  onBlur={() => handleBlur('monthly_income')}
                  className={`input-control mono ${err('monthly_income') ? 'input-control--error' : ''}`}
                  placeholder="0.00"
                />
                {err('monthly_income') && <span className="field-error">{errors.monthly_income}</span>}
              </div>
              <div className="form-group">
                <label>Employer / Business Name</label>
                <input type="text" value={form.employer_name} onChange={(e) => setField('employer_name', e.target.value)} className="input-control" />
              </div>
            </div>

            <div className="form-section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <UsersIcon style={{ width: 13, height: 13 }} />
              <span>Guarantor & Nominee</span>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Guarantor Name</label>
                <input type="text" value={form.guarantor_name} onChange={(e) => setField('guarantor_name', e.target.value)} className="input-control" placeholder="Self / Direct Borrower" />
              </div>
              <div className="form-group">
                <label>Guarantor Phone</label>
                <input
                  type="tel"
                  value={form.guarantor_phone}
                  onChange={(e) => setField('guarantor_phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onBlur={() => handleBlur('guarantor_phone')}
                  className={`input-control mono ${err('guarantor_phone') ? 'input-control--error' : ''}`}
                />
                {err('guarantor_phone') && <span className="field-error">{errors.guarantor_phone}</span>}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Nominee Name</label>
                <input type="text" value={form.nominee_name} onChange={(e) => setField('nominee_name', e.target.value)} className="input-control" />
              </div>
              <div className="form-group">
                <label>Nominee Relation</label>
                <input type="text" value={form.nominee_relation} onChange={(e) => setField('nominee_relation', e.target.value)} className="input-control" placeholder="e.g. Spouse, Son" />
              </div>
            </div>

            <div className="form-section-label">Other</div>
            <div className="form-group">
              <label>Branch</label>
              <select value={form.branch} onChange={(e) => setField('branch', e.target.value)} className="input-control">
                <option value="">Select Branch</option>
                {branches.map(b => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Notes / Remarks</label>
              <textarea
                rows="2"
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                className="input-control"
                style={{ height: 'auto', padding: '8px 12px' }}
              />
            </div>

          </div>
        </div>
      </form>
    </div>
  );
}
