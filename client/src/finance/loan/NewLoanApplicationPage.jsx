import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  User,
  Users,
  FileText,
  Building,
  Car,
  CreditCard,
  Shield,
  Clock,
  AlertTriangle,
  Send,
  Eye,
  Upload,
  Paperclip,
  X,
  ImageIcon,
  UserPlus,
  CheckCircle2
} from 'lucide-react';
import PrintableLoanApplicationSheet from './PrintableLoanApplicationSheet';
import CustomerFormPage from '../borrowers/CustomerFormPage';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  generateEmiSchedule,
  resolveSchemeRepaymentMethod,
  resolveSchemeInterestCalculation,
  convertRateToMonthly,
  rateBasisSuffix
} from '../../utils/loanCalculations';
import SharedDropdown from '../../components/common/SharedDropdown';
import SharedDatePicker from '../../components/common/SharedDatePicker';
import { uploadMultipleFiles } from '../../api/upload';

function tp(t, key, vars) {
  let str = t(key);
  Object.keys(vars || {}).forEach(k => {
    str = str.replace(`{${k}}`, vars[k]);
  });
  return str;
}

export default function NewLoanApplicationPage({
  loans = [],
  borrowers = [],
  loanSchemes = [],
  branches = [],
  tenant,
  initialTerms = null,
  onCreateBorrower,
  onCancel,
  onSubmit
}) {
  const { t, tStatus } = useLanguage();
  // Only active schemes are selectable for a new application — inactive schemes stay
  // visible in Loan Scheme Master for historical/reporting purposes but shouldn't be
  // offered for fresh loans.
  const activeSchemes = loanSchemes.filter(s => s.is_active);

  // Pre-match scheme if initialTerms passed from Estimation
  const initialSchemeMatch = initialTerms?.schemeId
    ? activeSchemes.find(s => String(s.id) === String(initialTerms.schemeId))
    : initialTerms?.schemeName
      ? activeSchemes.find(s => (s.name === initialTerms.schemeName || s.scheme_name === initialTerms.schemeName))
      : null;

  // No customer pre-selected initially
  const [selectedBorrowerId, setSelectedBorrowerId] = useState('');

  // Creating a new customer happens in a full-screen overlay on TOP of this form —
  // never a page swap — so principal/tenure/scheme fields already filled in survive
  // the detour instead of being lost to a remount.
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [customerCreatedMsg, setCustomerCreatedMsg] = useState('');
  const [schemeId, setSchemeId] = useState(() => initialSchemeMatch ? String(initialSchemeMatch.id) : (initialTerms?.schemeId ? String(initialTerms.schemeId) : ''));

  // Core Loan Terms State — pre-filled if initialTerms provided from Estimator
  const [loanTerms, setLoanTerms] = useState(() => ({
    principal_amount: initialTerms?.principal != null ? String(initialTerms.principal) : '',
    monthly_interest_rate: initialTerms?.monthlyRate != null ? String(initialTerms.monthlyRate) : (initialSchemeMatch?.rate_per_unit != null ? String(convertRateToMonthly(initialSchemeMatch.rate_per_unit, initialSchemeMatch.interest_basis)) : ''),
    tenure_months: initialTerms?.tenureMonths != null ? String(initialTerms.tenureMonths) : '',
    repayment_frequency: initialTerms?.repaymentFrequency || initialSchemeMatch?.repayment_frequency || '',
    purpose: initialTerms?.purpose || ''
  }));

  const selectedScheme = activeSchemes.find(s => String(s.id) === String(schemeId)) || null;

  // Selecting a scheme re-derives the rate & collection frequency from it — the scheme is
  // now the actual driver of loan terms instead of a disconnected label.
  const handleSchemeChange = (e) => {
    const id = e.target.value;
    setSchemeId(id);
    const scheme = activeSchemes.find(s => String(s.id) === String(id));
    if (scheme) {
      setLoanTerms(prev => ({
        ...prev,
        monthly_interest_rate: scheme.rate_per_unit != null ? convertRateToMonthly(scheme.rate_per_unit, scheme.interest_basis) : '',
        repayment_frequency: scheme.repayment_frequency || prev.repayment_frequency
      }));
    }
  };

  const handleBorrowerSelect = (bId) => {
    setSelectedBorrowerId(bId);
    const b = borrowers.find(cust => String(cust.id) === String(bId));
    if (b) {
      if (b.guarantor_name && !guarantor.name) {
        setGuarantor(prev => ({
          ...prev,
          name: b.guarantor_name || '',
          relationship: b.guarantor_relation || 'Father',
          mobile: b.guarantor_phone || ''
        }));
      }
      if (b.nominee_name && !nominee.name) {
        setNominee(prev => ({
          ...prev,
          name: b.nominee_name || '',
          relationship: b.nominee_relation || 'Spouse',
          mobile: b.nominee_phone || ''
        }));
      }
    }
  };

  // Selected Security / Verification Document Choice ('NONE' initially)
  const [selectedDocType, setSelectedDocType] = useState('NONE');

  // Mandatory Guarantor Details State
  const [guarantor, setGuarantor] = useState({
    name: '',
    dob: '',
    relationship: 'Father',
    custom_relationship: '',
    mobile: '',
    id_proof_type: 'Aadhaar Card',
    id_proof_number: '',
    files: [] // Array of { name, url, type }
  });

  // Nominee Details State (Multiple Document Uploads & Previews)
  const [nominee, setNominee] = useState({
    name: '',
    dob: '',
    relationship: 'Spouse',
    custom_relationship: '',
    mobile: '',
    id_proof_type: 'Aadhaar Card',
    id_proof_number: '',
    files: [] // Array of { name, url, type }
  });

  // Security Collateral Details (Multiple Document Uploads & Previews)
  const [propertyDetails, setPropertyDetails] = useState({
    type: 'Residential House',
    custom_type: '',
    survey_number: '',
    market_value: 500000,
    files: []
  });

  const [vehicleDetails, setVehicleDetails] = useState({
    rc_number: '',
    make_model: '',
    rc_owner_name: '',
    files: []
  });

  const [chequeDetails, setChequeDetails] = useState({
    bank_name: '',
    account_number: '',
    cheque_number_range: '',
    cheques_count: 3
  });

  const [othersDetails, setOthersDetails] = useState({
    description: '',
    files: []
  });

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Paper Printing Black & White Preview Sheet State
  const [previewSheetOpen, setPreviewSheetOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

  // Selected Borrower Object
  const selectedBorrower = borrowers.find(b => String(b.id) === String(selectedBorrowerId)) || null;

  // Real-Time Loan Engine Calculations (4 Combinations Architecture)
  const calculateCredit = () => {
    const p = parseFloat(loanTerms.principal_amount) || 0;
    const mRate = parseFloat(loanTerms.monthly_interest_rate) || 0;
    const months = parseFloat(loanTerms.tenure_months) || 1;
    const totalDays = Math.max(Math.round(months * 30), 1);
    const freq = loanTerms.repayment_frequency || 'DAILY';

    const repMethod = resolveSchemeRepaymentMethod(selectedScheme);
    const calcStrategy = resolveSchemeInterestCalculation(selectedScheme);

    if (p <= 0) {
      return {
        principal: 0,
        totalInterest: 0,
        totalPayable: 0,
        installmentAmount: 0,
        totalDays,
        repMethod,
        calcStrategy
      };
    }

    if (repMethod === 'INTEREST_ONLY') {
      const totalInterest = Math.round(p * (mRate / 100) * months);
      let installmentAmount = 0;
      if (freq === 'DAILY') {
        installmentAmount = Math.ceil(totalInterest / totalDays);
      } else if (freq === 'WEEKLY') {
        const weeks = Math.max(Math.round(totalDays / 7), 1);
        installmentAmount = Math.ceil(totalInterest / weeks);
      } else {
        installmentAmount = Math.ceil(totalInterest / Math.max(months, 1));
      }

      return {
        principal: p,
        totalInterest,
        totalPayable: p + totalInterest,
        installmentAmount,
        totalDays,
        repMethod,
        calcStrategy
      };
    }

    // Standard EMI Repayment Method (Constant Flat or Flexible Reducing)
    const schedule = generateEmiSchedule({
      principal: p,
      monthlyInterestRate: mRate,
      tenureMonths: months,
      repaymentFrequency: freq,
      interestCalculation: calcStrategy
    });

    const totalPayable = schedule.reduce((sum, item) => sum + (item.emi || 0), 0);
    const totalInterest = Math.max(0, totalPayable - p);
    const installmentAmount = schedule[0]?.emi || (months > 0 ? Math.ceil(totalPayable / months) : 0);

    return {
      principal: p,
      totalInterest,
      totalPayable,
      installmentAmount,
      totalDays,
      repMethod,
      calcStrategy
    };
  };

  const creditSummary = calculateCredit();
  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

  const handleTermChange = (e) => {
    const { name, value } = e.target;
    setLoanTerms(prev => ({ ...prev, [name]: value }));
  };

  const handleGuarantorChange = (e) => {
    const { name, value } = e.target;
    const cleaned = name === 'mobile' ? value.replace(/\D/g, '').slice(0, 10) : value;
    setGuarantor(prev => ({ ...prev, [name]: cleaned }));
  };

  const handleNomineeChange = (e) => {
    const { name, value } = e.target;
    const cleaned = name === 'mobile' ? value.replace(/\D/g, '').slice(0, 10) : value;
    setNominee(prev => ({ ...prev, [name]: cleaned }));
  };

  // Direct Binary Multipart Upload to Server Disk (Zero Base64 in Database)
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const handleMultipleFilesUpload = async (e, currentFiles, setFilesCallback, subfolder = 'cust-proofs', prefix = 'doc') => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    setUploadingFiles(true);
    try {
      const uploadedFileObjs = await uploadMultipleFiles(selectedFiles, { subfolder, prefix });
      if (Array.isArray(uploadedFileObjs) && uploadedFileObjs.length) {
        setFilesCallback([...currentFiles, ...uploadedFileObjs]);
      }
    } catch (err) {
      console.error('Error uploading file to server disk:', err);
    } finally {
      setUploadingFiles(false);
      e.target.value = '';
    }
  };

  // Remove Single File Thumbnail from Uploaded List
  const handleRemoveFile = (indexToRemove, currentFiles, setFilesCallback) => {
    setFilesCallback(currentFiles.filter((_, idx) => idx !== indexToRemove));
  };

  // Form Validation Handler
  const validateForm = () => {
    const errors = {};

    if (!selectedBorrowerId || !selectedBorrower) {
      errors.borrower = t('nla.err_borrower_required');
    }

    if (!schemeId || !selectedScheme) {
      errors.scheme = 'Please select a loan scheme.';
    }

    if (!loanTerms.principal_amount || parseFloat(loanTerms.principal_amount) <= 0) {
      errors.principal_amount = t('nla.err_principal_invalid');
    } else if (selectedScheme) {
      const amt = parseFloat(loanTerms.principal_amount);
      if (selectedScheme.min_amount && amt < selectedScheme.min_amount) {
        errors.principal_amount = `${selectedScheme.name} ${tp(t, 'nla.err_min_amount_suffix', { amt: fmt(selectedScheme.min_amount) })}`;
      } else if (selectedScheme.max_amount && amt > selectedScheme.max_amount) {
        errors.principal_amount = `${selectedScheme.name} ${tp(t, 'nla.err_max_amount_suffix', { amt: fmt(selectedScheme.max_amount) })}`;
      }
    }

    if (selectedScheme) {
      const months = parseFloat(loanTerms.tenure_months);
      if (selectedScheme.min_tenure_months && months < selectedScheme.min_tenure_months) {
        errors.tenure_months = `${selectedScheme.name} ${tp(t, 'nla.err_min_tenure_suffix', { months: selectedScheme.min_tenure_months })}`;
      } else if (selectedScheme.max_tenure_months && months > selectedScheme.max_tenure_months) {
        errors.tenure_months = `${selectedScheme.name} ${tp(t, 'nla.err_max_tenure_suffix', { months: selectedScheme.max_tenure_months })}`;
      }
    }

    if (!loanTerms.repayment_frequency) {
      errors.repayment_frequency = 'Please select installment frequency.';
    }

    // ── Mandatory Guarantor Field Validation ──
    if (!guarantor.name.trim()) errors.guarantor_name = 'Guarantor full name is required.';
    if (!guarantor.dob) errors.guarantor_dob = 'Guarantor date of birth is required.';
    if (guarantor.relationship === 'Other' && !guarantor.custom_relationship.trim()) {
      errors.guarantor_rel_custom = 'Please specify guarantor relationship.';
    }
    if (!guarantor.mobile.trim()) {
      errors.guarantor_mobile = 'Guarantor mobile number is required.';
    } else if (!/^\d{10}$/.test(guarantor.mobile.trim())) {
      errors.guarantor_mobile = 'Enter valid 10-digit mobile number.';
    }
    if (!guarantor.id_proof_number.trim()) {
      errors.guarantor_id_proof_number = 'Guarantor ID proof / Aadhaar number is required.';
    }

    // Dynamic Verification / Security Field Validation based on selectedDocType
    if (selectedDocType === 'NOMINEE') {
      if (!nominee.name.trim()) errors.nominee_name = t('nla.err_nominee_name');
      if (!nominee.dob) errors.nominee_dob = t('nla.err_nominee_dob');
      if (nominee.relationship === 'Other' && !nominee.custom_relationship.trim()) {
        errors.nominee_rel_custom = t('nla.err_nominee_rel_custom');
      }
      if (!nominee.mobile.trim()) errors.nominee_mobile = t('nla.err_nominee_mobile');
      if (!nominee.id_proof_number.trim()) errors.nominee_id_proof_number = t('nla.err_nominee_id_proof_number');
    } else if (selectedDocType === 'PROPERTY') {
      if (propertyDetails.type === 'Other' && !propertyDetails.custom_type.trim()) {
        errors.prop_type_custom = t('nla.err_prop_type_custom');
      }
      if (!propertyDetails.survey_number.trim()) errors.prop_survey = t('nla.err_prop_survey');
      if (!propertyDetails.market_value || parseFloat(propertyDetails.market_value) <= 0) errors.prop_val = t('nla.err_prop_val');
    } else if (selectedDocType === 'VEHICLE') {
      if (!vehicleDetails.rc_number.trim()) errors.veh_rc = t('nla.err_veh_rc');
      if (!vehicleDetails.make_model.trim()) errors.veh_make = t('nla.err_veh_make');
      if (!vehicleDetails.rc_owner_name.trim()) errors.veh_owner = t('nla.err_veh_owner');
    } else if (selectedDocType === 'CHEQUE') {
      if (!chequeDetails.bank_name.trim()) errors.chq_bank = t('nla.err_chq_bank');
      if (!chequeDetails.account_number.trim()) errors.chq_acc = t('nla.err_chq_acc');
      if (!chequeDetails.cheque_number_range.trim()) errors.chq_range = t('nla.err_chq_range');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Open Paper Application Form Preview Sheet before final submission
  const handleOpenPreview = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const year = new Date().getFullYear();
    let maxSeq = 0;
    for (const l of loans) {
      const match = l.loan_account_no && l.loan_account_no.match(/^(?:APP|LN)-\d+-(\d+)$/);
      if (match && match[1]) {
        const seq = parseInt(match[1], 10);
        if (!isNaN(seq) && seq < 1000 && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
    if (maxSeq === 0) {
      maxSeq = loans.length;
    }
    const nextSeq = String(maxSeq + 1).padStart(4, '0');
    const assignedAppNo = `APP-${year}-${nextSeq}`;

    const payload = {
      mode: 'APPLICATION',
      loan_account_no: assignedAppNo,
      borrower_id: selectedBorrowerId,
      borrower_name: selectedBorrower?.full_name || 'Applicant',
      phone: selectedBorrower?.phone || '',
      scheme_id: schemeId,
      principal_amount: parseFloat(loanTerms.principal_amount),
      monthly_interest_rate: parseFloat(loanTerms.monthly_interest_rate),
      tenure_months: parseFloat(loanTerms.tenure_months),
      repayment_frequency: loanTerms.repayment_frequency,
      repayment_method: creditSummary.repMethod,
      interest_calculation: creditSummary.calcStrategy,
      purpose: loanTerms.purpose,
      installment_amount: creditSummary.installmentAmount,
      total_interest: creditSummary.totalInterest,
      total_payable: creditSummary.totalPayable,
      guarantor: {
        ...guarantor,
        final_relationship: guarantor.relationship === 'Other' ? guarantor.custom_relationship : guarantor.relationship
      },
      nominee: selectedDocType === 'NOMINEE' ? {
        ...nominee,
        final_relationship: nominee.relationship === 'Other' ? nominee.custom_relationship : nominee.relationship
      } : null,
      security: {
        type: selectedDocType,
        details: selectedDocType === 'PROPERTY' ? {
          ...propertyDetails,
          final_type: propertyDetails.type === 'Other' ? propertyDetails.custom_type : propertyDetails.type
        } : selectedDocType === 'VEHICLE' ? vehicleDetails :
            selectedDocType === 'CHEQUE' ? chequeDetails :
            selectedDocType === 'OTHERS' ? othersDetails : null
      }
    };

    setPendingPayload(payload);
    setPreviewSheetOpen(true);
  };

  // Final Confirmation Submit after reviewing Paper Application Form Sheet
  const handleFinalSubmit = async () => {
    if (!pendingPayload || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await onSubmit(pendingPayload);
      setPreviewSheetOpen(false);
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.message || 'Failed to submit this loan application.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper renderer for visual image/file thumbnail grid preview box
  const renderThumbnailPreviewBox = (filesList, setFilesCallback) => {
    if (!filesList || !filesList.length) return null;

    return (
      <div className="uploaded-thumbnails-grid">
        {filesList.map((fileObj, idx) => {
          const isImg = fileObj.type?.startsWith('image/') || fileObj.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
          return (
            <div key={idx} className="thumb-preview-box">
              {isImg ? (
                <img src={fileObj.url} alt={fileObj.name} className="thumb-img" />
              ) : (
                <div className="thumb-doc-badge">
                  <FileText style={{ width: 18, height: 18 }} />
                  <span className="doc-ext">{fileObj.name.split('.').pop()}</span>
                </div>
              )}
              <span className="thumb-name" title={fileObj.name}>{fileObj.name}</span>
              <button
                type="button"
                onClick={() => handleRemoveFile(idx, filesList, setFilesCallback)}
                className="btn-remove-thumb"
                title={t('nla.remove_image')}
              >
                <X style={{ width: 10, height: 10 }} />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="new-loan-app-page">

      {/* 1. Header Navigation Bar */}
      <div className="new-app-header-card">
        <div className="header-left">
          <button type="button" onClick={onCancel} className="btn-back-link">
            <ArrowLeft style={{ width: 15, height: 15 }} />
            <span>{t('nla.back_to_applications')}</span>
          </button>
          <div className="title-row">
            <h1>{t('nla.title')}</h1>
            <span className="badge-req">{t('nla.badge_fresh')}</span>
          </div>
        </div>
      </div>

      {Object.keys(formErrors).length > 0 && (
        <div className="app-error-alert">
          <AlertTriangle style={{ width: 16, height: 16 }} />
          <span>{t('nla.err_required_fields')}</span>
        </div>
      )}

      {/* 2. Main Page Layout */}
      <form onSubmit={handleOpenPreview} className="new-app-layout-grid">

        {/* LEFT COLUMN: Main Form Work Area */}
        <div className="main-form-col">

          {/* Card 1: Applicant Customer Selection */}
          <div className="app-form-card">
            <div className="card-head">
              <div className="icon-box icon-box--blue">
                <User style={{ width: 16, height: 16 }} />
              </div>
              <h3>{t('nla.select_customer_account')}</h3>
            </div>

            <div className="card-body">
              {customerCreatedMsg && (
                <div className="form-msg-success">
                  <CheckCircle2 style={{ width: 14, height: 14, flexShrink: 0 }} />
                  <span>{customerCreatedMsg}</span>
                </div>
              )}
              <div className="form-group-full">
                <label className="req">{t('nla.select_applicant_customer')}</label>
                <div className="customer-select-row">
                  <div className="dropdown-wrap">
                    <SharedDropdown
                      value={selectedBorrowerId}
                      onChange={(e) => handleBorrowerSelect(e.target.value)}
                      placeholder={t('nla.select_customer_placeholder')}
                      searchable
                      options={borrowers.map(b => ({
                        value: b.id,
                        label: `${b.full_name} (${b.borrower_code || 'KTG-CUST'}) - Ph: ${b.phone}`
                      }))}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateCustomer(true)}
                    className="btn-create-customer"
                  >
                    <UserPlus style={{ width: 15, height: 15 }} />
                    <span>Create New Customer</span>
                  </button>
                </div>
                {formErrors.borrower && <span className="err-txt">{formErrors.borrower}</span>}
              </div>
            </div>
          </div>

          {showCreateCustomer && createPortal(
            <div className="customer-form-modal-overlay">
              <CustomerFormPage
                mode="CREATE"
                branches={branches}
                tenant={tenant}
                onCancel={() => setShowCreateCustomer(false)}
                onSubmit={async (payload) => {
                  const created = await onCreateBorrower(payload);
                  handleBorrowerSelect(String(created.id));
                  setShowCreateCustomer(false);
                  setCustomerCreatedMsg(`${created.full_name} created and selected.`);
                  setTimeout(() => setCustomerCreatedMsg(''), 4000);
                }}
              />
            </div>,
            document.body
          )}

          {/* Card 2: Requested Loan Terms & Scheme (Compact 3-Column Grid) */}
          <div className="app-form-card">
            <div className="card-head">
              <div className="icon-box icon-box--green">
                <Clock style={{ width: 16, height: 16 }} />
              </div>
              <h3>{t('nla.loan_terms_scheme')}</h3>
            </div>

            <div className="card-body">
              <div className="form-grid-3col">

                <div className="form-group">
                  <label className="req">{t('nla.select_loan_scheme')}</label>
                  <SharedDropdown
                    value={schemeId}
                    onChange={handleSchemeChange}
                    placeholder="-- Select Loan Scheme --"
                    options={activeSchemes.map(s => ({
                      value: s.id,
                      label: `${s.name} (${s.rate_per_unit}% ${rateBasisSuffix(s.interest_basis)})`
                    }))}
                  />
                  {formErrors.scheme && <span className="err-txt">{formErrors.scheme}</span>}
                  {selectedScheme && (selectedScheme.min_amount || selectedScheme.max_amount) && (
                    <span className="scheme-limits-hint">
                      {t('nla.allowed_prefix')} ₹{fmt(selectedScheme.min_amount || 0)} – ₹{fmt(selectedScheme.max_amount || 0)}
                      {(selectedScheme.min_tenure_months || selectedScheme.max_tenure_months) &&
                        `, ${selectedScheme.min_tenure_months || 0}–${selectedScheme.max_tenure_months || 0} ${t('nla.months_suffix')}`}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="req">{t('nla.requested_principal_rs')}</label>
                  <input
                    type="number"
                    name="principal_amount"
                    value={loanTerms.principal_amount}
                    onChange={handleTermChange}
                    className="input-field"
                    placeholder="e.g. 50000"
                  />
                  {formErrors.principal_amount && <span className="err-txt">{formErrors.principal_amount}</span>}
                </div>

                <div className="form-group">
                  <label className="req">{t('nla.monthly_rate_pct')}</label>
                  <input
                    type="number"
                    step="0.1"
                    name="monthly_interest_rate"
                    value={loanTerms.monthly_interest_rate}
                    onChange={handleTermChange}
                    className="input-field"
                  />
                </div>

                <div className="form-group">
                  <label className="req">{t('nla.tenure_months_label')}</label>
                  <input
                    type="number"
                    name="tenure_months"
                    value={loanTerms.tenure_months}
                    onChange={handleTermChange}
                    className="input-field"
                  />
                  {formErrors.tenure_months && <span className="err-txt">{formErrors.tenure_months}</span>}
                </div>

                <div className="form-group">
                  <label className="req">{t('nla.installment_frequency')}</label>
                  <SharedDropdown
                    name="repayment_frequency"
                    value={loanTerms.repayment_frequency}
                    onChange={handleTermChange}
                    placeholder="-- Select Frequency --"
                    options={[
                      { value: 'DAILY', label: t('nla.freq_daily_emi') },
                      { value: 'WEEKLY', label: t('nla.freq_weekly_installment') },
                      { value: 'MONTHLY', label: t('nla.freq_monthly_emi') }
                    ]}
                  />
                  {formErrors.repayment_frequency && <span className="err-txt">{formErrors.repayment_frequency}</span>}
                </div>

                <div className="form-group">
                  <label>{t('nla.loan_purpose')}</label>
                  <input
                    type="text"
                    name="purpose"
                    value={loanTerms.purpose}
                    onChange={handleTermChange}
                    className="input-field"
                    placeholder="e.g. Business Working Capital (Optional)"
                  />
                  {formErrors.purpose && <span className="err-txt">{formErrors.purpose}</span>}
                </div>

              </div>
            </div>
          </div>

          {/* Card: Mandatory Guarantor Details */}
          <div className="app-form-card">
            <div className="card-head">
              <div className="icon-box icon-box--blue">
                <Users style={{ width: 16, height: 16 }} />
              </div>
              <div className="card-head-title-wrap">
                <h3>Guarantor Required Details</h3>
                <span className="badge-mandatory">Mandatory</span>
              </div>
            </div>

            <div className="card-body">
              <div className="form-grid-3col">
                <div className="form-group">
                  <label className="req">Guarantor Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={guarantor.name}
                    onChange={handleGuarantorChange}
                    className="input-field"
                    placeholder="Guarantor Full Name"
                  />
                  {formErrors.guarantor_name && <span className="err-txt">{formErrors.guarantor_name}</span>}
                </div>

                <div className="form-group">
                  <label className="req">Date of Birth (DOB)</label>
                  <SharedDatePicker
                    name="dob"
                    value={guarantor.dob}
                    onChange={handleGuarantorChange}
                    buttonStyle={{ height: 38 }}
                  />
                  {formErrors.guarantor_dob && <span className="err-txt">{formErrors.guarantor_dob}</span>}
                </div>

                <div className="form-group">
                  <label className="req">Relationship to Applicant</label>
                  <SharedDropdown
                    name="relationship"
                    value={guarantor.relationship}
                    onChange={handleGuarantorChange}
                    options={[
                      { value: 'Father', label: 'Father' },
                      { value: 'Mother', label: 'Mother' },
                      { value: 'Spouse', label: 'Spouse' },
                      { value: 'Brother', label: 'Brother' },
                      { value: 'Sister', label: 'Sister' },
                      { value: 'Son', label: 'Son' },
                      { value: 'Daughter', label: 'Daughter' },
                      { value: 'Friend', label: 'Friend' },
                      { value: 'Relative', label: 'Relative' },
                      { value: 'Other', label: 'Other' }
                    ]}
                  />
                </div>

                {guarantor.relationship === 'Other' && (
                  <div className="form-group">
                    <label className="req">Specify Relationship</label>
                    <input
                      type="text"
                      name="custom_relationship"
                      value={guarantor.custom_relationship}
                      onChange={handleGuarantorChange}
                      className="input-field"
                      placeholder="Type relationship (e.g. Neighbor, Colleague)"
                    />
                    {formErrors.guarantor_rel_custom && <span className="err-txt">{formErrors.guarantor_rel_custom}</span>}
                  </div>
                )}

                <div className="form-group">
                  <label className="req">Mobile Phone</label>
                  <input
                    type="text"
                    name="mobile"
                    value={guarantor.mobile}
                    onChange={handleGuarantorChange}
                    className="input-field"
                    placeholder="10-digit mobile"
                  />
                  {formErrors.guarantor_mobile && <span className="err-txt">{formErrors.guarantor_mobile}</span>}
                </div>

                <div className="form-group">
                  <label className="req">ID Proof Type</label>
                  <SharedDropdown
                    name="id_proof_type"
                    value={guarantor.id_proof_type}
                    onChange={handleGuarantorChange}
                    options={[
                      { value: 'Aadhaar Card', label: 'Aadhaar Card' },
                      { value: 'PAN Card', label: 'PAN Card' },
                      { value: 'Voter ID', label: 'Voter ID' },
                      { value: 'Driving License', label: 'Driving License' }
                    ]}
                  />
                </div>

                <div className="form-group">
                  <label className="req">ID Proof / Aadhaar Number</label>
                  <input
                    type="text"
                    name="id_proof_number"
                    value={guarantor.id_proof_number}
                    onChange={handleGuarantorChange}
                    className="input-field"
                    placeholder="Document / Aadhaar Number"
                  />
                  {formErrors.guarantor_id_proof_number && <span className="err-txt">{formErrors.guarantor_id_proof_number}</span>}
                </div>

                {/* Upload Guarantor ID Documents / Photo */}
                <div className="form-group form-group--full-width">
                  <label>Upload Guarantor ID Proof / Photo (Optional)</label>
                  <div className="upload-controls-wrap">
                    <label className="btn-upload-file">
                      <Upload style={{ width: 14, height: 14 }} />
                      <span>Upload Documents & Images</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => handleMultipleFilesUpload(e, guarantor.files, (newFiles) => setGuarantor(prev => ({ ...prev, files: newFiles })), 'nominee-proofs', 'guarantor')}
                      />
                    </label>

                    {renderThumbnailPreviewBox(guarantor.files, (newFiles) => setGuarantor(prev => ({ ...prev, files: newFiles })))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Verification & Security Document Selection Dropdown (None Initially) */}
          <div className="app-form-card">
            <div className="card-head">
              <div className="icon-box icon-box--purple">
                <Shield style={{ width: 16, height: 16 }} />
              </div>
              <h3>{t('nla.verification_security_selection')}</h3>
            </div>

            <div className="card-body">

              {/* Document Dropdown Selection ('NONE' initially) */}
              <div className="form-group-full">
                <label>{t('nla.select_verification_doc_type')}</label>
                <SharedDropdown
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                  options={[
                    { value: 'NONE', label: t('nla.sec_none') },
                    { value: 'NOMINEE', label: t('nla.sec_nominee') },
                    { value: 'PROPERTY', label: t('nla.sec_property') },
                    { value: 'VEHICLE', label: t('nla.sec_vehicle') },
                    { value: 'CHEQUE', label: t('nla.sec_cheque') },
                    { value: 'OTHERS', label: t('nla.sec_others') }
                  ]}
                />
              </div>

              {/* Dynamic Revealed Input Fields Container */}

              {/* Option A: Revealed Nominee Fields */}
              {selectedDocType === 'NOMINEE' && (
                <div className="document-revealed-subcard">
                  <div className="doc-subhead">
                    <Users style={{ width: 15, height: 15, color: '#7C3AED' }} />
                    <span>{t('nla.nominee_required_details')}</span>
                  </div>

                  <div className="form-grid-3col">
                    <div className="form-group">
                      <label className="req">{t('nla.nominee_full_name')}</label>
                      <input
                        type="text"
                        name="name"
                        value={nominee.name}
                        onChange={handleNomineeChange}
                        className="input-field"
                        placeholder="Full Name"
                      />
                      {formErrors.nominee_name && <span className="err-txt">{formErrors.nominee_name}</span>}
                    </div>

                    <div className="form-group">
                      <label className="req">{t('nla.nominee_dob')}</label>
                      <SharedDatePicker
                        name="dob"
                        value={nominee.dob}
                        onChange={handleNomineeChange}
                        buttonStyle={{ height: 38 }}
                      />
                      {formErrors.nominee_dob && <span className="err-txt">{formErrors.nominee_dob}</span>}
                    </div>

                    <div className="form-group">
                      <label className="req">{t('nla.relationship')}</label>
                      <SharedDropdown
                        name="relationship"
                        value={nominee.relationship}
                        onChange={handleNomineeChange}
                        options={[
                          { value: 'Spouse', label: t('nla.rel_spouse') },
                          { value: 'Father', label: t('nla.rel_father') },
                          { value: 'Mother', label: t('nla.rel_mother') },
                          { value: 'Son', label: t('nla.rel_son') },
                          { value: 'Daughter', label: t('nla.rel_daughter') },
                          { value: 'Brother', label: t('nla.rel_brother') },
                          { value: 'Sister', label: t('nla.rel_sister') },
                          { value: 'Other', label: t('nla.rel_other') }
                        ]}
                      />
                    </div>

                    {/* If Relationship === 'Other', reveal custom relationship input */}
                    {nominee.relationship === 'Other' && (
                      <div className="form-group">
                        <label className="req">{t('nla.specify_relationship')}</label>
                        <input
                          type="text"
                          name="custom_relationship"
                          value={nominee.custom_relationship}
                          onChange={handleNomineeChange}
                          className="input-field"
                          placeholder="Type relationship (e.g. Guardian)"
                        />
                        {formErrors.nominee_rel_custom && <span className="err-txt">{formErrors.nominee_rel_custom}</span>}
                      </div>
                    )}

                    <div className="form-group">
                      <label className="req">{t('nla.mobile_number')}</label>
                      <input
                        type="text"
                        name="mobile"
                        value={nominee.mobile}
                        onChange={handleNomineeChange}
                        className="input-field"
                        placeholder="10-digit mobile"
                      />
                      {formErrors.nominee_mobile && <span className="err-txt">{formErrors.nominee_mobile}</span>}
                    </div>

                    <div className="form-group">
                      <label className="req">{t('nla.id_proof_type')}</label>
                      <SharedDropdown
                        name="id_proof_type"
                        value={nominee.id_proof_type}
                        onChange={handleNomineeChange}
                        options={[
                          { value: 'Aadhaar Card', label: t('nla.id_aadhaar_card') },
                          { value: 'PAN Card', label: t('nla.id_pan_card') },
                          { value: 'Voter ID', label: t('nla.id_voter_id') },
                          { value: 'Driving License', label: t('nla.id_driving_license') }
                        ]}
                      />
                    </div>

                    <div className="form-group">
                      <label className="req">{t('nla.id_proof_number')}</label>
                      <input
                        type="text"
                        name="id_proof_number"
                        value={nominee.id_proof_number}
                        onChange={handleNomineeChange}
                        className="input-field"
                        placeholder="Document Number"
                      />
                      {formErrors.nominee_id_proof_number && <span className="err-txt">{formErrors.nominee_id_proof_number}</span>}
                    </div>

                    {/* Upload Nominee ID Documents (Multiple Image & File Upload Support) */}
                    <div className="form-group form-group--full-width">
                      <label>{t('nla.upload_nominee_docs')}</label>
                      <div className="upload-controls-wrap">
                        <label className="btn-upload-file">
                          <Upload style={{ width: 14, height: 14 }} />
                          <span>{t('nla.upload_images_documents')}</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*,.pdf"
                            style={{ display: 'none' }}
                            onChange={(e) => handleMultipleFilesUpload(e, nominee.files, (newFiles) => setNominee(prev => ({ ...prev, files: newFiles })), 'nominee-proofs', 'nominee')}
                          />
                        </label>

                        {/* Thumbnail Preview Box Grid */}
                        {renderThumbnailPreviewBox(nominee.files, (newFiles) => setNominee(prev => ({ ...prev, files: newFiles })))}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* Option B: Revealed Property Document Fields */}
              {selectedDocType === 'PROPERTY' && (
                <div className="document-revealed-subcard">
                  <div className="doc-subhead">
                    <Building style={{ width: 15, height: 15, color: 'var(--color-info, #2563EB)' }} />
                    <span>{t('nla.property_document_details')}</span>
                  </div>

                  <div className="form-grid-3col">
                    <div className="form-group">
                      <label className="req">{t('nla.property_type')}</label>
                      <SharedDropdown
                        value={propertyDetails.type}
                        onChange={(e) => setPropertyDetails({ ...propertyDetails, type: e.target.value })}
                        options={[
                          { value: 'Residential House', label: t('nla.prop_residential') },
                          { value: 'Commercial Shop', label: t('nla.prop_commercial') },
                          { value: 'Agricultural Land', label: t('nla.prop_agricultural') },
                          { value: 'Vacant Plot', label: t('nla.prop_vacant') },
                          { value: 'Other', label: t('nla.prop_other') }
                        ]}
                      />
                    </div>

                    {/* If Property Type === 'Other', reveal custom property type input */}
                    {propertyDetails.type === 'Other' && (
                      <div className="form-group">
                        <label className="req">{t('nla.specify_custom_property_type')}</label>
                        <input
                          type="text"
                          value={propertyDetails.custom_type}
                          onChange={(e) => setPropertyDetails({ ...propertyDetails, custom_type: e.target.value })}
                          className="input-field"
                          placeholder="Type property category"
                        />
                        {formErrors.prop_type_custom && <span className="err-txt">{formErrors.prop_type_custom}</span>}
                      </div>
                    )}

                    <div className="form-group">
                      <label className="req">{t('nla.doc_survey_number')}</label>
                      <input
                        type="text"
                        value={propertyDetails.survey_number}
                        onChange={(e) => setPropertyDetails({ ...propertyDetails, survey_number: e.target.value })}
                        className="input-field"
                        placeholder="Doc No / Survey No"
                      />
                      {formErrors.prop_survey && <span className="err-txt">{formErrors.prop_survey}</span>}
                    </div>

                    <div className="form-group">
                      <label className="req">{t('nla.estimated_market_value_rs')}</label>
                      <input
                        type="number"
                        value={propertyDetails.market_value}
                        onChange={(e) => setPropertyDetails({ ...propertyDetails, market_value: e.target.value })}
                        className="input-field"
                      />
                      {formErrors.prop_val && <span className="err-txt">{formErrors.prop_val}</span>}
                    </div>

                    {/* Upload Property Document Images (Multiple Allowed) */}
                    <div className="form-group form-group--full-width">
                      <label>{t('nla.upload_property_docs')}</label>
                      <div className="upload-controls-wrap">
                        <label className="btn-upload-file">
                          <Upload style={{ width: 14, height: 14 }} />
                          <span>{t('nla.upload_property_deeds_images')}</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*,.pdf"
                            style={{ display: 'none' }}
                            onChange={(e) => handleMultipleFilesUpload(e, propertyDetails.files, (newFiles) => setPropertyDetails(prev => ({ ...prev, files: newFiles })), 'cust-proofs', 'property')}
                          />
                        </label>

                        {/* Thumbnail Preview Box Grid */}
                        {renderThumbnailPreviewBox(propertyDetails.files, (newFiles) => setPropertyDetails(prev => ({ ...prev, files: newFiles })))}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* Option C: Revealed Vehicle RC Fields */}
              {selectedDocType === 'VEHICLE' && (
                <div className="document-revealed-subcard">
                  <div className="doc-subhead">
                    <Car style={{ width: 15, height: 15, color: 'var(--brand-primary, #15803D)' }} />
                    <span>{t('nla.vehicle_rc_details')}</span>
                  </div>

                  <div className="form-grid-3col">
                    <div className="form-group">
                      <label className="req">{t('nla.vehicle_rc_number')}</label>
                      <input
                        type="text"
                        value={vehicleDetails.rc_number}
                        onChange={(e) => setVehicleDetails({ ...vehicleDetails, rc_number: e.target.value })}
                        className="input-field"
                        placeholder="e.g. TN-47-AB-1234"
                      />
                      {formErrors.veh_rc && <span className="err-txt">{formErrors.veh_rc}</span>}
                    </div>

                    <div className="form-group">
                      <label className="req">{t('nla.vehicle_make_model')}</label>
                      <input
                        type="text"
                        value={vehicleDetails.make_model}
                        onChange={(e) => setVehicleDetails({ ...vehicleDetails, make_model: e.target.value })}
                        className="input-field"
                        placeholder="e.g. Honda City i-VTEC (2022)"
                      />
                      {formErrors.veh_make && <span className="err-txt">{formErrors.veh_make}</span>}
                    </div>

                    <div className="form-group">
                      <label className="req">{t('nla.rc_owner_name')}</label>
                      <input
                        type="text"
                        value={vehicleDetails.rc_owner_name}
                        onChange={(e) => setVehicleDetails({ ...vehicleDetails, rc_owner_name: e.target.value })}
                        className="input-field"
                        placeholder="Name as printed in RC"
                      />
                      {formErrors.veh_owner && <span className="err-txt">{formErrors.veh_owner}</span>}
                    </div>

                    {/* Upload RC Book Documents (Multiple Allowed) */}
                    <div className="form-group form-group--full-width">
                      <label>{t('nla.upload_rc_book_images')}</label>
                      <div className="upload-controls-wrap">
                        <label className="btn-upload-file">
                          <Upload style={{ width: 14, height: 14 }} />
                          <span>{t('nla.upload_rc_book_files')}</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*,.pdf"
                            style={{ display: 'none' }}
                            onChange={(e) => handleMultipleFilesUpload(e, vehicleDetails.files, (newFiles) => setVehicleDetails(prev => ({ ...prev, files: newFiles })), 'cust-proofs', 'vehicle')}
                          />
                        </label>

                        {/* Thumbnail Preview Box Grid */}
                        {renderThumbnailPreviewBox(vehicleDetails.files, (newFiles) => setVehicleDetails(prev => ({ ...prev, files: newFiles })))}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* Option D: Revealed Cheque Leaf Fields */}
              {selectedDocType === 'CHEQUE' && (
                <div className="document-revealed-subcard">
                  <div className="doc-subhead">
                    <CreditCard style={{ width: 15, height: 15, color: 'var(--color-warning, #D97706)' }} />
                    <span>{t('nla.cheque_pdc_details')}</span>
                  </div>

                  <div className="form-grid-2col">
                    <div className="form-group">
                      <label className="req">{t('nla.bank_name_branch')}</label>
                      <input
                        type="text"
                        value={chequeDetails.bank_name}
                        onChange={(e) => setChequeDetails({ ...chequeDetails, bank_name: e.target.value })}
                        className="input-field"
                        placeholder="e.g. State Bank of India, Karur Main"
                      />
                      {formErrors.chq_bank && <span className="err-txt">{formErrors.chq_bank}</span>}
                    </div>

                    <div className="form-group">
                      <label className="req">{t('nla.bank_account_number')}</label>
                      <input
                        type="text"
                        value={chequeDetails.account_number}
                        onChange={(e) => setChequeDetails({ ...chequeDetails, account_number: e.target.value })}
                        className="input-field"
                        placeholder="Enter account number"
                      />
                      {formErrors.chq_acc && <span className="err-txt">{formErrors.chq_acc}</span>}
                    </div>

                    <div className="form-group">
                      <label className="req">{t('nla.cheque_leaf_number_range')}</label>
                      <input
                        type="text"
                        value={chequeDetails.cheque_number_range}
                        onChange={(e) => setChequeDetails({ ...chequeDetails, cheque_number_range: e.target.value })}
                        className="input-field"
                        placeholder="e.g. 000101 to 000105"
                      />
                      {formErrors.chq_range && <span className="err-txt">{formErrors.chq_range}</span>}
                    </div>

                    <div className="form-group">
                      <label className="req">{t('nla.signed_cheques_count')}</label>
                      <input
                        type="number"
                        value={chequeDetails.cheques_count}
                        onChange={(e) => setChequeDetails({ ...chequeDetails, cheques_count: e.target.value })}
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Option E: Revealed Others (Optional Text & Multiple Document Uploads) */}
              {selectedDocType === 'OTHERS' && (
                <div className="document-revealed-subcard">
                  <div className="doc-subhead">
                    <FileText style={{ width: 15, height: 15, color: '#475569' }} />
                    <span>{t('nla.other_security_notes')}</span>
                  </div>

                  <div className="form-grid-2col">
                    <div className="form-group form-group--full-width">
                      <label>{t('nla.security_notes_desc')}</label>
                      <input
                        type="text"
                        value={othersDetails.description}
                        onChange={(e) => setOthersDetails({ ...othersDetails, description: e.target.value })}
                        className="input-field"
                        placeholder="Type any security details, asset description, or notes (optional)"
                      />
                    </div>

                    <div className="form-group form-group--full-width">
                      <label>{t('nla.upload_other_security_docs')}</label>
                      <div className="upload-controls-wrap">
                        <label className="btn-upload-file">
                          <Upload style={{ width: 14, height: 14 }} />
                          <span>{t('nla.upload_security_images_files')}</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*,.pdf"
                            style={{ display: 'none' }}
                            onChange={(e) => handleMultipleFilesUpload(e, othersDetails.files, (newFiles) => setOthersDetails(prev => ({ ...prev, files: newFiles })), 'cust-proofs', 'security')}
                          />
                        </label>

                        {/* Thumbnail Preview Box Grid */}
                        {renderThumbnailPreviewBox(othersDetails.files, (newFiles) => setOthersDetails(prev => ({ ...prev, files: newFiles })))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

        {/* RIGHT COLUMN PANEL: Selected Customer Image & Loan Preview */}
        <div className="right-preview-panel">

          {/* Customer Profile Image & Details Card */}
          <div className="cust-profile-preview-card">
            <div className="cust-avatar-box">
              {selectedBorrower?.profile_image ? (
                <img
                  src={selectedBorrower.profile_image}
                  alt={selectedBorrower.full_name}
                  className="cust-avatar-img"
                />
              ) : (
                <div className="cust-avatar-placeholder">
                  <User style={{ width: 30, height: 30 }} />
                </div>
              )}
            </div>

            <div className="cust-main-text">
              <h3>{selectedBorrower?.full_name || t('nla.no_customer_selected')}</h3>
              <span className="code-pill">{selectedBorrower?.borrower_code || '—'}</span>
            </div>

            <div className="cust-meta-rows">
              <div className="meta-item">
                <span>{t('nla.mobile_phone')}</span>
                <strong className="val-mono">{selectedBorrower?.phone || '—'}</strong>
              </div>
              <div className="meta-item">
                <span>{t('nla.aadhaar_uid')}</span>
                <strong className="val-mono">{selectedBorrower?.aadhaar_number || '—'}</strong>
              </div>
              <div className="meta-item">
                <span>{t('nla.pan_id')}</span>
                <strong className="val-mono">{selectedBorrower?.pan_number || '—'}</strong>
              </div>
              <div className="meta-item">
                <span>{t('nla.city_branch')}</span>
                <strong>{selectedBorrower?.city || '—'}, {selectedBorrower?.branch || 'Main'}</strong>
              </div>
            </div>
          </div>

          {/* Loan Details & EMI Preview Card */}
          <div className="loan-details-preview-card">
            <h4>{t('nla.loan_credit_summary_preview')}</h4>

            <div className="preview-row">
              <span>{t('nla.requested_principal_label')}</span>
              <strong>₹{fmt(creditSummary.principal)}</strong>
            </div>

            <div className="preview-row">
              <span>{t('ld.interest_rate_label')}:</span>
              <strong>{loanTerms.monthly_interest_rate}% {t('nla.per_month')}</strong>
            </div>

            <div className="preview-row">
              <span>{t('nla.tenure_period_label')}</span>
              <strong>{loanTerms.tenure_months} {t('nla.months_suffix')} ({creditSummary.totalDays} {t('nla.days_label')})</strong>
            </div>

            <div className="preview-row">
              <span>{t('nla.total_estimated_interest_label')}</span>
              <strong style={{ color: 'var(--color-warning, #D97706)' }}>+ ₹{fmt(creditSummary.totalInterest)}</strong>
            </div>

            <div className="preview-row preview-row--total">
              <span>{t('nla.total_amount_payable_label')}</span>
              <strong>₹{fmt(creditSummary.totalPayable)}</strong>
            </div>

            <div className="preview-row preview-row--emi">
              <span>
                {creditSummary.repMethod === 'INTEREST_ONLY'
                  ? `${loanTerms.repayment_frequency === 'DAILY' ? 'Daily' : loanTerms.repayment_frequency === 'WEEKLY' ? 'Weekly' : 'Monthly'} Interest Due:`
                  : `${t('nla.calculated_prefix')} ${loanTerms.repayment_frequency === 'DAILY' ? t('nla.freq_daily_short') : loanTerms.repayment_frequency === 'WEEKLY' ? t('nla.freq_weekly_short') : t('nla.freq_monthly_short')} ${t('nla.emi_suffix')}:`}
              </span>
              <span className="emi-val">₹{fmt(creditSummary.installmentAmount)}</span>
            </div>
          </div>

        </div>

        {/* Form Bottom Action Bar (Placed at grid level so on mobile it renders after summary preview) */}
        <div className="form-actions-bar">
          <button
            type="button"
            onClick={onCancel}
            className="btn-cancel-app"
          >
            {t('btn.cancel')}
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="btn-submit-app"
          >
            <Eye style={{ width: 15, height: 15 }} />
            <span>{t('nla.preview_submit')}</span>
          </button>
        </div>

      </form>

      {/* Paper Printing Black & White Application Form Sheet Modal */}
      {previewSheetOpen && pendingPayload && (
        <PrintableLoanApplicationSheet
          applicationData={pendingPayload}
          borrowerData={selectedBorrower || {}}
          tenant={tenant}
          onClose={() => setPreviewSheetOpen(false)}
          onConfirmSubmit={handleFinalSubmit}
          submitting={submitting}
          submitError={submitError}
        />
      )}

    </div>
  );
}
