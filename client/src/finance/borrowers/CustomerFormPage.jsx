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
  Users as UsersIcon,
  Check,
  Sparkles,
  FileCheck,
  CheckCircle2,
  Zap,
  Printer
} from 'lucide-react';
import PrintableCustomerApplicationForm from './PrintableCustomerApplicationForm';
import { useLanguage } from '../../i18n/LanguageContext';

const EMPTY_FORM = {
  full_name: '',
  father_spouse_name: '',
  phone: '',
  alt_phone: '',
  email: '',
  dob: '',
  gender: 'MALE',
  marital_status: 'SINGLE',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  pincode: '',
  id_proof_type: 'AADHAAR',
  aadhaar_number: '',
  pan_number: '',
  voter_id: '',
  occupation: '',
  monthly_income: '',
  employer_name: '',
  bank_name: '',
  account_number: '',
  ifsc_code: '',
  guarantor_name: '',
  guarantor_phone: '',
  nominee_name: '',
  nominee_relation: '',
  branch: '',
  status: 'ACTIVE',
  notes: ''
};

function useDocCategories() {
  const { t } = useLanguage();
  return [
    { id: 'AADHAAR_FRONT', name: t('cf.doc.aadhaar_front'), req: true, type: 'AADHAAR_CARD' },
    { id: 'AADHAAR_BACK', name: t('cf.doc.aadhaar_back'), req: true, type: 'AADHAAR_CARD' },
    { id: 'PAN_CARD', name: t('cf.doc.pan_card'), req: true, type: 'PAN_CARD' },
    { id: 'BANK_PASSBOOK', name: t('cf.doc.bank_passbook'), req: true, type: 'BANK_PASSBOOK' },
    { id: 'ADDRESS_PROOF', name: t('cf.doc.address_proof'), req: false, type: 'ADDRESS_PROOF' },
    { id: 'OTHER', name: t('cf.doc.other'), req: false, type: 'OTHER' }
  ];
}

const PHONE_RE = /^[6-9][0-9]{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AADHAAR_RE = /^[0-9]{12}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const PINCODE_RE = /^[0-9]{6}$/;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function validate(form, t) {
  const errors = {};

  if (!form.full_name.trim() || form.full_name.trim().length < 2) {
    errors.full_name = t('cf.err.full_name');
  }
  if (!PHONE_RE.test(form.phone.trim())) {
    errors.phone = t('cf.err.phone');
  }
  if (form.alt_phone.trim() && !PHONE_RE.test(form.alt_phone.trim())) {
    errors.alt_phone = t('cf.err.alt_phone');
  }
  if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) {
    errors.email = t('cf.err.email');
  }
  if (form.dob) {
    const dobDate = new Date(form.dob);
    const today = new Date();
    const age = (today - dobDate) / (1000 * 60 * 60 * 24 * 365.25);
    if (dobDate > today) {
      errors.dob = t('cf.err.dob_future');
    } else if (age < 18) {
      errors.dob = t('cf.err.dob_age');
    }
  }
  if (form.pincode.trim() && !PINCODE_RE.test(form.pincode.trim())) {
    errors.pincode = t('cf.err.pincode');
  }
  if (form.aadhaar_number.trim() && !AADHAAR_RE.test(form.aadhaar_number.trim())) {
    errors.aadhaar_number = t('cf.err.aadhaar');
  }
  if (form.pan_number.trim() && !PAN_RE.test(form.pan_number.trim().toUpperCase())) {
    errors.pan_number = t('cf.err.pan');
  }
  if (form.monthly_income !== '' && (isNaN(form.monthly_income) || Number(form.monthly_income) < 0)) {
    errors.monthly_income = t('cf.err.monthly_income');
  }
  if (form.guarantor_phone.trim() && !PHONE_RE.test(form.guarantor_phone.trim())) {
    errors.guarantor_phone = t('cf.err.phone');
  }

  return errors;
}

function fmtSize(bytes) {
  if (!bytes) return '0 B';
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

function DocPreviewItem({ doc, onRemove }) {
  const { t } = useLanguage();
  const isImage = (doc.mime || '').startsWith('image/');
  return (
    <div className="cf-vdoc-preview">
      <a
        className="cf-vdoc-preview__thumb"
        href={doc.url}
        target="_blank"
        rel="noreferrer"
        title={t('cf.view_full_size')}
      >
        {isImage ? <img src={doc.url} alt={doc.name} /> : <FileText style={{ width: 18, height: 18 }} />}
      </a>
      <div className="cf-vdoc-preview__meta">
        <span className="cf-vdoc-name">{doc.name}</span>
        <span className="cf-vdoc-size">{fmtSize(doc.size)}</span>
      </div>
      <button type="button" onClick={onRemove} className="btn-vdoc-remove">
        <X style={{ width: 13, height: 13 }} />
      </button>
    </div>
  );
}

export default function CustomerFormPage({ mode = 'CREATE', initialData, branches = [], onCancel, onSubmit }) {
  const { t } = useLanguage();
  const DOC_CATEGORIES = useDocCategories();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'vault'
  const [showPrintableSheet, setShowPrintableSheet] = useState(false);
  const [form, setForm] = useState(() => {
    if (!initialData) return { ...EMPTY_FORM };
    return {
      ...EMPTY_FORM,
      ...initialData,
      dob: initialData.dob ? String(initialData.dob).slice(0, 10) : '',
      monthly_income: initialData.monthly_income != null ? String(initialData.monthly_income) : ''
    };
  });

  const [profileImage, setProfileImage] = useState(initialData?.profile_image || null);
  const [documents, setDocuments] = useState(initialData?.documents || []);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [dragActiveCategory, setDragActiveCategory] = useState(null);

  const photoInputRef = useRef(null);

  const setField = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const errs = validate(form, t);
    setErrors(prev => ({ ...prev, [field]: errs[field] || null }));
  };

  const err = (field) => Boolean(touched[field] && errors[field]);

  const handlePhotoFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert(t('cf.err.image_type'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert(t('cf.err.photo_size'));
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setProfileImage(dataUrl);
    } catch {
      alert(t('cf.err.read_image'));
    }
  };

  const handleCategoryUpload = async (catId, fileList) => {
    if (!fileList || fileList.length === 0) return;
    const catObj = DOC_CATEGORIES.find(c => c.id === catId);
    const newDocs = [];

    for (const file of Array.from(fileList)) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} ${t('cf.err.file_size_limit')}`);
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        newDocs.push({
          id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          category: catId,
          type: catObj?.type || catId,
          name: file.name,
          size: file.size,
          mime: file.type,
          url: dataUrl
        });
      } catch {
        alert(`${t('cf.err.file_read_fail')} ${file.name}`);
      }
    }

    if (newDocs.length > 0) {
      setDocuments(prev => [...prev.filter(d => d.category !== catId), ...newDocs]);
    }
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
    if (e) e.preventDefault();
    setServerError('');
    const validationErrors = validate(form, t);
    setErrors(validationErrors);
    setTouched({
      full_name: true, phone: true, alt_phone: true, email: true, dob: true,
      pincode: true, aadhaar_number: true, pan_number: true, monthly_income: true, guarantor_phone: true
    });
    if (Object.keys(validationErrors).length > 0) {
      setActiveTab('profile');
      return;
    }

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
      // Auto open printable Black & White Xerox application form sheet!
      setShowPrintableSheet(true);
    } catch (error) {
      setServerError(error?.response?.data?.message || t('cf.err.submit_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="borrowers-page customer-form-page mnc-form-root">
      {showPrintableSheet && (
        <PrintableCustomerApplicationForm 
          formData={form}
          profileImage={profileImage}
          documents={documents}
          onClose={() => setShowPrintableSheet(false)} 
        />
      )}

      {/* ── Header Action Row ── */}
      <div className="cf-page-header">
        <div className="cf-header-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" className="cf-back-btn" onClick={onCancel} title={t('cf.back_to_directory')}>
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </button>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
            {mode === 'EDIT' ? t('cf.edit_title') : t('cf.register_title')}
          </h1>
        </div>

        <div className="cf-header-right">
          <button
            type="button"
            onClick={() => setShowPrintableSheet(true)}
            className="btn-cancel"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderColor: '#059669', color: '#047857', background: '#ECFDF5' }}
          >
            <Printer style={{ width: 14, height: 14 }} />
            <span>{t('cf.form_sheet_preview')}</span>
          </button>
          <div className="cf-completeness-pill">
            <Zap style={{ width: 13, height: 13, color: '#059669' }} />
            <span>{t('cf.profile_completeness')}</span>
            <strong>{completeness}%</strong>
          </div>
          <button type="button" onClick={onCancel} className="btn-cancel" disabled={loading}>{t('btn.cancel')}</button>
          <button type="submit" onClick={handleSubmit} disabled={loading} className="btn-submit">
            {loading ? t('cf.saving_record') : mode === 'EDIT' ? t('form.save_changes') : t('cf.register_customer')}
          </button>
        </div>
      </div>

      {serverError && (
        <div className="form-alert form-alert--error" style={{ margin: '0 0 12px 0' }}>
          <AlertCircle style={{ width: 14, height: 14 }} />
          <span>{serverError}</span>
        </div>
      )}

      {/* ── Form Body (Single Consolidated Page) ── */}
      <form onSubmit={handleSubmit} className="cf-wizard-body">

        <div className="cf-split-layout">

        <div className="cf-step-pane cf-split-form">

          {/* Section 1: Customer Profile & Personal Details */}
          <div className="cf-pane-title">
            <User style={{ width: 16, height: 16, color: '#059669' }} />
            <div>
              <h3>{t('cf.section1_title')}</h3>
              <p>{t('cf.section1_subtitle')}</p>
            </div>
          </div>

          {/* Profile Photo Avatar Dropzone */}
          <div className="cf-vault-photo-card" style={{ marginBottom: 14, maxWidth: 300, padding: '10px 14px' }}>
            <div className="cf-card-label" style={{ fontSize: '0.65rem' }}>{t('cf.profile_photo_label')}</div>
            <div className="cf-photo-flex" style={{ gap: 12 }}>
              <div className="cf-photo-avatar" style={{ width: 54, height: 54 }}>
                {profileImage ? (
                  <img src={profileImage} alt="Avatar" />
                ) : (
                  <User style={{ width: 28, height: 28, color: '#94A3B8' }} />
                )}
              </div>

              <div className="cf-photo-actions" style={{ gap: 6 }}>
                <button
                  type="button"
                  className="btn-upload-photo"
                  style={{ padding: '5px 10px', fontSize: '0.72rem' }}
                  onClick={() => photoInputRef.current?.click()}
                >
                  <Camera style={{ width: 13, height: 13 }} />
                  <span>{profileImage ? t('cf.change') : t('cf.upload')}</span>
                </button>
                {profileImage && (
                  <button type="button" className="btn-remove-photo" style={{ width: 28, height: 28 }} onClick={() => setProfileImage(null)}>
                    <Trash2 style={{ width: 13, height: 13 }} />
                  </button>
                )}
                <span className="cf-photo-hint" style={{ fontSize: '0.65rem' }}>{t('cf.photo_hint')}</span>
              </div>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handlePhotoFile(e.target.files?.[0])}
              />
            </div>
          </div>

          {/* Row 1: Identity */}
          <div className="form-row form-row--3">
            <div className="form-group">
              <label>{t('kycr.full_name')} *</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setField('full_name', e.target.value)}
                onBlur={() => handleBlur('full_name')}
                placeholder="e.g. Rajesh Kumar"
                className={`input-control ${err('full_name') ? 'input-control--error' : ''}`}
              />
              {err('full_name') && <span className="field-error">{errors.full_name}</span>}
            </div>

            <div className="form-group">
              <label>{t('cp.father_spouse')}</label>
              <input
                type="text"
                value={form.father_spouse_name}
                onChange={(e) => setField('father_spouse_name', e.target.value)}
                placeholder="e.g. Mahesh Kumar"
                className="input-control"
              />
            </div>

            <div className="form-group">
              <label>{t('cp.dob')}</label>
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

          {/* Row 2: Contact */}
          <div className="form-row form-row--3">
            <div className="form-group">
              <label>{t('cp.gender')}</label>
              <select value={form.gender} onChange={(e) => setField('gender', e.target.value)} className="input-control">
                <option value="MALE">{t('cf.male')}</option>
                <option value="FEMALE">{t('cf.female')}</option>
                <option value="OTHER">{t('cf.other')}</option>
              </select>
            </div>

            <div className="form-group">
              <label>{t('cf.primary_mobile')}</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                onBlur={() => handleBlur('phone')}
                placeholder="10-digit mobile"
                className={`input-control mono ${err('phone') ? 'input-control--error' : ''}`}
              />
              {err('phone') && <span className="field-error">{errors.phone}</span>}
            </div>

            <div className="form-group">
              <label>{t('cf.alternate_mobile')}</label>
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

          {/* Row 3: Email / Branch / Occupation */}
          <div className="form-row form-row--3">
            <div className="form-group">
              <label>{t('cf.email_address')}</label>
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

            <div className="form-group">
              <label>{t('cf.assigned_branch')}</label>
              <select value={form.branch} onChange={(e) => setField('branch', e.target.value)} className="input-control">
                <option value="">{t('cf.select_branch')}</option>
                {branches.map(b => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>{t('cp.occupation')}</label>
              <input
                type="text"
                value={form.occupation}
                onChange={(e) => setField('occupation', e.target.value)}
                placeholder="e.g. Tailor, Farmer"
                className="input-control"
              />
            </div>
          </div>

          {/* Row 4: Employment & Income */}
          <div className="form-row form-row--3">
            <div className="form-group">
              <label>{t('cf.employer_business_name')}</label>
              <input
                type="text"
                value={form.employer_name}
                onChange={(e) => setField('employer_name', e.target.value)}
                placeholder="e.g. Self-employed"
                className="input-control"
              />
            </div>

            <div className="form-group">
              <label>{t('cf.monthly_income_rs')}</label>
              <input
                type="number"
                min="0"
                value={form.monthly_income}
                onChange={(e) => setField('monthly_income', e.target.value)}
                onBlur={() => handleBlur('monthly_income')}
                placeholder="0.00"
                className={`input-control mono ${err('monthly_income') ? 'input-control--error' : ''}`}
              />
              {err('monthly_income') && <span className="field-error">{errors.monthly_income}</span>}
            </div>
          </div>

          {/* Row 5: Address */}
          <div className="form-row">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>{t('cf.address_line1_full')}</label>
              <input
                type="text"
                value={form.address_line1}
                onChange={(e) => setField('address_line1', e.target.value)}
                className="input-control"
                placeholder="Main Street 123, Near Bus Stand"
              />
            </div>
          </div>

          {/* Row 6: City / State / Pincode */}
          <div className="form-row form-row--3" style={{ marginBottom: 20 }}>
            <div className="form-group">
              <label>{t('form.city')}</label>
              <input type="text" value={form.city} onChange={(e) => setField('city', e.target.value)} className="input-control" placeholder="Chennai" />
            </div>

            <div className="form-group">
              <label>{t('form.state')}</label>
              <input type="text" value={form.state} onChange={(e) => setField('state', e.target.value)} className="input-control" placeholder="Tamil Nadu" />
            </div>

            <div className="form-group">
              <label>{t('form.pincode')}</label>
              <input
                type="text"
                value={form.pincode}
                onChange={(e) => setField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                onBlur={() => handleBlur('pincode')}
                className={`input-control mono ${err('pincode') ? 'input-control--error' : ''}`}
                placeholder="600001"
              />
              {err('pincode') && <span className="field-error">{errors.pincode}</span>}
            </div>
          </div>

        </div>

        <div className="cf-step-pane cf-split-docs">

          {/* Section 2: Primary ID Selection, Numbers & Document Proof Uploads */}
          <div className="cf-pane-title">
            <FileCheck style={{ width: 16, height: 16, color: '#059669' }} />
            <div>
              <h3>{t('cf.section2_title')}</h3>
              <p>{t('cf.section2_subtitle')}</p>
            </div>
          </div>

          {/* Dynamic Primary ID Selector Row */}
          <div className="form-row" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 14, borderRadius: 12, marginBottom: 16 }}>
            <div className="form-group">
              <label style={{ color: '#059669', fontWeight: 700 }}>{t('cf.primary_id_type')}</label>
              <select
                value={form.id_proof_type}
                onChange={(e) => setField('id_proof_type', e.target.value)}
                className="input-control"
                style={{ fontWeight: 600, borderColor: '#10B981' }}
              >
                <option value="AADHAAR">{t('cf.aadhaar_card')}</option>
                <option value="PAN_CARD">{t('cf.doc.pan_card')}</option>
                <option value="VOTER_ID">{t('cf.voter_id_card')}</option>
                <option value="PASSPORT">{t('cf.passport')}</option>
                <option value="DRIVING_LICENSE">{t('cf.driving_license')}</option>
              </select>
            </div>

            {/* Dynamic Number Input based on selected ID */}
            {form.id_proof_type === 'AADHAAR' && (
              <div className="form-group">
                <label>{t('cf.aadhaar_number_label')}</label>
                <input
                  type="text"
                  value={form.aadhaar_number}
                  onChange={(e) => setField('aadhaar_number', e.target.value.replace(/\D/g, '').slice(0, 12))}
                  onBlur={() => handleBlur('aadhaar_number')}
                  placeholder="Enter 12-digit Aadhaar number"
                  className={`input-control mono ${err('aadhaar_number') ? 'input-control--error' : ''}`}
                />
                {err('aadhaar_number') && <span className="field-error">{errors.aadhaar_number}</span>}
              </div>
            )}

            {form.id_proof_type === 'PAN_CARD' && (
              <div className="form-group">
                <label>{t('cf.pan_number_label')}</label>
                <input
                  type="text"
                  value={form.pan_number}
                  onChange={(e) => setField('pan_number', e.target.value.toUpperCase().slice(0, 10))}
                  onBlur={() => handleBlur('pan_number')}
                  placeholder="ABCDE1234F"
                  className={`input-control mono ${err('pan_number') ? 'input-control--error' : ''}`}
                />
                {err('pan_number') && <span className="field-error">{errors.pan_number}</span>}
              </div>
            )}

            {form.id_proof_type === 'VOTER_ID' && (
              <div className="form-group">
                <label>{t('cf.voter_id_number_label')}</label>
                <input
                  type="text"
                  value={form.voter_id}
                  onChange={(e) => setField('voter_id', e.target.value.toUpperCase())}
                  placeholder="e.g. TN/01/123/456789"
                  className="input-control mono"
                />
              </div>
            )}

            {form.id_proof_type === 'PASSPORT' && (
              <div className="form-group">
                <label>{t('cf.passport_number_label')}</label>
                <input
                  type="text"
                  value={form.voter_id}
                  onChange={(e) => setField('voter_id', e.target.value.toUpperCase())}
                  placeholder="e.g. Z1234567"
                  className="input-control mono"
                />
              </div>
            )}

            {form.id_proof_type === 'DRIVING_LICENSE' && (
              <div className="form-group">
                <label>{t('cf.driving_license_number_label')}</label>
                <input
                  type="text"
                  value={form.voter_id}
                  onChange={(e) => setField('voter_id', e.target.value.toUpperCase())}
                  placeholder="e.g. TN-01-2023-0012345"
                  className="input-control mono"
                />
              </div>
            )}
          </div>

          {/* Secondary PAN Card Input (if primary is not PAN) */}
          {form.id_proof_type !== 'PAN_CARD' && (
            <div className="form-row" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label>{t('cf.pan_optional_label')}</label>
                <input
                  type="text"
                  value={form.pan_number}
                  onChange={(e) => setField('pan_number', e.target.value.toUpperCase().slice(0, 10))}
                  onBlur={() => handleBlur('pan_number')}
                  placeholder="ABCDE1234F"
                  className={`input-control mono ${err('pan_number') ? 'input-control--error' : ''}`}
                />
                {err('pan_number') && <span className="field-error">{errors.pan_number}</span>}
              </div>
            </div>
          )}

          {/* Dynamic Proof Upload Dropzone based on selected Primary ID */}
          <div className="cf-vault-grid">
            {form.id_proof_type === 'AADHAAR' && (
              <>
                {['AADHAAR_FRONT', 'AADHAAR_BACK'].map((catId) => {
                  const catObj = DOC_CATEGORIES.find(c => c.id === catId);
                  const catDocs = documents.filter(d => d.category === catId);
                  const isDrag = dragActiveCategory === catId;

                  return (
                    <div key={catId} className={`cf-vault-cat-card ${catDocs.length > 0 ? 'has-docs' : ''}`}>
                      <div className="cf-vcat-header">
                        <span className="cf-vcat-title">{catObj?.name}</span>
                        <span className="cf-vcat-req">{t('cf.selected_id_proof')}</span>
                      </div>

                      <div
                        className={`cf-vcat-drop ${isDrag ? 'drag-active' : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setDragActiveCategory(catId); }}
                        onDragLeave={() => setDragActiveCategory(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragActiveCategory(null);
                          handleCategoryUpload(catId, e.dataTransfer.files);
                        }}
                      >
                        <input
                          type="file"
                          multiple
                          id={`input-${catId}`}
                          style={{ display: 'none' }}
                          onChange={(e) => handleCategoryUpload(catId, e.target.files)}
                        />
                        <label htmlFor={`input-${catId}`} className="cf-vcat-label">
                          <UploadCloud style={{ width: 18, height: 18, color: '#3B82F6' }} />
                          <span>{t('cf.upload_prefix')} {catObj?.name}</span>
                        </label>
                      </div>

                      {catDocs.length > 0 && (
                        <div className="cf-vcat-list">
                          {catDocs.map(doc => (
                            <DocPreviewItem key={doc.id} doc={doc} onRemove={() => removeDoc(doc.id)} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {form.id_proof_type !== 'AADHAAR' && (
              <div className="cf-vault-cat-card has-docs">
                <div className="cf-vcat-header">
                  <span className="cf-vcat-title">{form.id_proof_type.replace('_', ' ')} {t('cf.proof_document_suffix')}</span>
                  <span className="cf-vcat-req">{t('cf.selected_primary_id')}</span>
                </div>

                <div
                  className={`cf-vcat-drop ${dragActiveCategory === form.id_proof_type ? 'drag-active' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragActiveCategory(form.id_proof_type); }}
                  onDragLeave={() => setDragActiveCategory(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActiveCategory(null);
                    handleCategoryUpload(form.id_proof_type, e.dataTransfer.files);
                  }}
                >
                  <input
                    type="file"
                    multiple
                    id={`input-${form.id_proof_type}`}
                    style={{ display: 'none' }}
                    onChange={(e) => handleCategoryUpload(form.id_proof_type, e.target.files)}
                  />
                  <label htmlFor={`input-${form.id_proof_type}`} className="cf-vcat-label">
                    <UploadCloud style={{ width: 18, height: 18, color: '#3B82F6' }} />
                    <span>{t('cf.upload_prefix')} {form.id_proof_type.replace('_', ' ')} {t('cf.image_suffix')}</span>
                  </label>
                </div>

                {documents.filter(d => d.category === form.id_proof_type).length > 0 && (
                  <div className="cf-vcat-list" style={{ marginTop: 6 }}>
                    {documents.filter(d => d.category === form.id_proof_type).map(doc => (
                      <DocPreviewItem key={doc.id} doc={doc} onRemove={() => removeDoc(doc.id)} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Additional Document Upload Slot */}
            {(() => {
              const catId = 'OTHER';
              const catObj = DOC_CATEGORIES.find(c => c.id === catId);
              const catDocs = documents.filter(d => d.category === catId);
              const isDrag = dragActiveCategory === catId;

              return (
                <div className={`cf-vault-cat-card ${catDocs.length > 0 ? 'has-docs' : ''}`}>
                  <div className="cf-vcat-header">
                    <span className="cf-vcat-title">{catObj?.name || catId}</span>
                  </div>

                  <div
                    className={`cf-vcat-drop ${isDrag ? 'drag-active' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragActiveCategory(catId); }}
                    onDragLeave={() => setDragActiveCategory(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActiveCategory(null);
                      handleCategoryUpload(catId, e.dataTransfer.files);
                    }}
                  >
                    <input
                      type="file"
                      multiple
                      id={`input-${catId}`}
                      style={{ display: 'none' }}
                      onChange={(e) => handleCategoryUpload(catId, e.target.files)}
                    />
                    <label htmlFor={`input-${catId}`} className="cf-vcat-label">
                      <UploadCloud style={{ width: 18, height: 18, color: '#3B82F6' }} />
                      <span>{t('cf.upload_prefix')} {catObj?.name || catId}</span>
                    </label>
                  </div>

                  {catDocs.length > 0 && (
                    <div className="cf-vcat-list">
                      {catDocs.map(doc => (
                        <DocPreviewItem key={doc.id} doc={doc} onRemove={() => removeDoc(doc.id)} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

        </div>

        </div>

        {/* ── Footer Actions Bar ── */}
        <div className="cf-wizard-footer">
          <button type="button" onClick={onCancel} className="btn-cancel" disabled={loading}>
            {t('btn.cancel')}
          </button>
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? t('cf.saving_customer') : mode === 'EDIT' ? t('form.save_changes') : t('cf.register_customer')}
          </button>
        </div>

      </form>
    </div>
  );
}
