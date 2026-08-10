import React, { useState } from 'react';
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
  ImageIcon
} from 'lucide-react';
import PrintableLoanApplicationSheet from './PrintableLoanApplicationSheet';
import { useLanguage } from '../../i18n/LanguageContext';

function tp(t, key, vars) {
  let str = t(key);
  Object.keys(vars || {}).forEach(k => {
    str = str.replace(`{${k}}`, vars[k]);
  });
  return str;
}

export default function NewLoanApplicationPage({
  borrowers = [],
  loanSchemes = [],
  onCancel,
  onSubmit
}) {
  const { t, tStatus } = useLanguage();
  // Only active schemes are selectable for a new application — inactive schemes stay
  // visible in Loan Scheme Master for historical/reporting purposes but shouldn't be
  // offered for fresh loans.
  const activeSchemes = loanSchemes.filter(s => s.is_active);

  // No customer pre-selected initially
  const [selectedBorrowerId, setSelectedBorrowerId] = useState('');
  const initialScheme = activeSchemes[0] || null;
  const [schemeId, setSchemeId] = useState(initialScheme?.id ? String(initialScheme.id) : '');

  // Core Loan Terms State — interest rate & frequency default from the selected Loan Scheme,
  // and stay editable afterward in case a specific applicant needs an override.
  const [loanTerms, setLoanTerms] = useState({
    principal_amount: 50000,
    monthly_interest_rate: initialScheme?.rate_per_unit ?? 2.0,
    tenure_months: 4,
    repayment_frequency: initialScheme?.repayment_frequency || 'DAILY',
    purpose: 'Working Capital & Business Expansion'
  });

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
        monthly_interest_rate: scheme.rate_per_unit,
        repayment_frequency: scheme.repayment_frequency || prev.repayment_frequency
      }));
    }
  };

  // Selected Security / Verification Document Choice ('NONE' initially)
  const [selectedDocType, setSelectedDocType] = useState('NONE');

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
    const totalDays = Math.round(months * 30);

    const repMethod = selectedScheme?.repayment_method || (selectedScheme?.repayment_mode === 'INTEREST_ONLY' ? 'INTEREST_ONLY' : 'EMI');
    const calcStrategy = selectedScheme?.interest_calculation || (selectedScheme?.repayment_mode === 'FLEXIBLE' ? 'FLEXIBLE_REDUCING' : 'CONSTANT_FLAT');

    let totalInterest = 0;
    let installmentAmount = 0;

    if (repMethod === 'INTEREST_ONLY') {
      // Interest-Only Repayment Method
      if (calcStrategy === 'FLEXIBLE_REDUCING') {
        // Interest Only + Flexible (Reducing Interest as Principal is paid)
        totalInterest = Math.round(p * (mRate / 100) * months);
      } else {
        // Interest Only + Constant (Flat Interest on Original Amount)
        totalInterest = Math.round(p * (mRate / 100) * months);
      }
      installmentAmount = Math.ceil(totalInterest / Math.max(months, 1));
    } else {
      // EMI Repayment Method
      if (calcStrategy === 'FLEXIBLE_REDUCING') {
        // EMI + Flexible (Reducing EMI)
        const r = (mRate / 100);
        if (r > 0) {
          installmentAmount = Math.ceil((p * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1));
          totalInterest = Math.round((installmentAmount * months) - p);
        } else {
          installmentAmount = Math.ceil(p / months);
          totalInterest = 0;
        }
      } else {
        // EMI + Constant (Flat EMI)
        totalInterest = Math.round(p * (mRate / 100) * months);
        const totalPayableCalc = p + totalInterest;
        if (loanTerms.repayment_frequency === 'DAILY') {
          installmentAmount = Math.ceil(totalPayableCalc / Math.max(totalDays, 1));
        } else if (loanTerms.repayment_frequency === 'WEEKLY') {
          const weeks = Math.max(Math.round(totalDays / 7), 1);
          installmentAmount = Math.ceil(totalPayableCalc / weeks);
        } else {
          installmentAmount = Math.ceil(totalPayableCalc / Math.max(months, 1));
        }
      }
    }

    const totalPayable = repMethod === 'INTEREST_ONLY' ? p + totalInterest : (installmentAmount * (loanTerms.repayment_frequency === 'DAILY' ? totalDays : months));

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

  const handleNomineeChange = (e) => {
    const { name, value } = e.target;
    setNominee(prev => ({ ...prev, [name]: value }));
  };

  // Handle Multiple File Selection & Object URL Creation
  const handleMultipleFilesUpload = (e, currentFiles, setFilesCallback) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    const newFileObjs = selectedFiles.map(file => ({
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type || (file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image/png' : 'application/pdf')
    }));

    setFilesCallback([...currentFiles, ...newFileObjs]);
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

    if (!loanTerms.purpose.trim()) {
      errors.purpose = t('nla.err_purpose_required');
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

    const payload = {
      mode: 'APPLICATION',
      borrower_id: selectedBorrowerId,
      borrower_name: selectedBorrower?.full_name || 'Applicant',
      phone: selectedBorrower?.phone || '',
      scheme_id: schemeId,
      principal_amount: parseFloat(loanTerms.principal_amount),
      monthly_interest_rate: parseFloat(loanTerms.monthly_interest_rate),
      tenure_months: parseFloat(loanTerms.tenure_months),
      repayment_frequency: loanTerms.repayment_frequency,
      purpose: loanTerms.purpose,
      installment_amount: creditSummary.installmentAmount,
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
  const handleFinalSubmit = () => {
    if (!pendingPayload) return;
    setSubmitting(true);
    setPreviewSheetOpen(false);

    setTimeout(() => {
      onSubmit(pendingPayload);
      setSubmitting(false);
    }, 500);
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
              <div className="form-group-full">
                <label className="req">{t('nla.select_applicant_customer')}</label>
                <select
                  value={selectedBorrowerId}
                  onChange={(e) => setSelectedBorrowerId(e.target.value)}
                  className="input-field-select"
                >
                  <option value="">{t('nla.select_customer_placeholder')}</option>
                  {borrowers.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.full_name} ({b.borrower_code || 'KTG-CUST'}) - Ph: {b.phone}
                    </option>
                  ))}
                </select>
                {formErrors.borrower && <span className="err-txt">{formErrors.borrower}</span>}
              </div>
            </div>
          </div>

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
                  <select
                    value={schemeId}
                    onChange={handleSchemeChange}
                    className="input-field-select"
                  >
                    {activeSchemes.length === 0 && (
                      <option value="">{t('nla.no_active_schemes')}</option>
                    )}
                    {activeSchemes.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.rate_per_unit}% p.m.)</option>
                    ))}
                  </select>
                  {selectedScheme && (selectedScheme.min_amount || selectedScheme.max_amount) && (
                    <span style={{ fontSize: '0.68rem', color: '#94A3B8', display: 'block', marginTop: 4 }}>
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
                  <select
                    name="repayment_frequency"
                    value={loanTerms.repayment_frequency}
                    onChange={handleTermChange}
                    className="input-field-select"
                  >
                    <option value="DAILY">{t('nla.freq_daily_emi')}</option>
                    <option value="WEEKLY">{t('nla.freq_weekly_installment')}</option>
                    <option value="MONTHLY">{t('nla.freq_monthly_emi')}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="req">{t('nla.loan_purpose')}</label>
                  <input
                    type="text"
                    name="purpose"
                    value={loanTerms.purpose}
                    onChange={handleTermChange}
                    className="input-field"
                    placeholder="e.g. Business Working Capital"
                  />
                  {formErrors.purpose && <span className="err-txt">{formErrors.purpose}</span>}
                </div>

              </div>
            </div>
          </div>

          {/* Card 3: Verification & Security Document Selection Dropdown (None Initially) */}
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
                <select
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                  className="input-field-select"
                >
                  <option value="NONE">{t('nla.sec_none')}</option>
                  <option value="NOMINEE">{t('nla.sec_nominee')}</option>
                  <option value="PROPERTY">{t('nla.sec_property')}</option>
                  <option value="VEHICLE">{t('nla.sec_vehicle')}</option>
                  <option value="CHEQUE">{t('nla.sec_cheque')}</option>
                  <option value="OTHERS">{t('nla.sec_others')}</option>
                </select>
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
                      <input
                        type="date"
                        name="dob"
                        value={nominee.dob}
                        onChange={handleNomineeChange}
                        className="input-field"
                      />
                      {formErrors.nominee_dob && <span className="err-txt">{formErrors.nominee_dob}</span>}
                    </div>

                    <div className="form-group">
                      <label className="req">{t('nla.relationship')}</label>
                      <select
                        name="relationship"
                        value={nominee.relationship}
                        onChange={handleNomineeChange}
                        className="input-field-select"
                      >
                        <option value="Spouse">{t('nla.rel_spouse')}</option>
                        <option value="Father">{t('nla.rel_father')}</option>
                        <option value="Mother">{t('nla.rel_mother')}</option>
                        <option value="Son">{t('nla.rel_son')}</option>
                        <option value="Daughter">{t('nla.rel_daughter')}</option>
                        <option value="Brother">{t('nla.rel_brother')}</option>
                        <option value="Sister">{t('nla.rel_sister')}</option>
                        <option value="Other">{t('nla.rel_other')}</option>
                      </select>
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
                      <select
                        name="id_proof_type"
                        value={nominee.id_proof_type}
                        onChange={handleNomineeChange}
                        className="input-field-select"
                      >
                        <option value="Aadhaar Card">{t('nla.id_aadhaar_card')}</option>
                        <option value="PAN Card">{t('nla.id_pan_card')}</option>
                        <option value="Voter ID">{t('nla.id_voter_id')}</option>
                        <option value="Driving License">{t('nla.id_driving_license')}</option>
                      </select>
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
                    <div className="form-group" style={{ gridColumn: 'span 3' }}>
                      <label>{t('nla.upload_nominee_docs')}</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label className="btn-cancel-app" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', margin: 0, height: 36, width: 'fit-content' }}>
                          <Upload style={{ width: 14, height: 14 }} />
                          <span>{t('nla.upload_images_documents')}</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*,.pdf"
                            style={{ display: 'none' }}
                            onChange={(e) => handleMultipleFilesUpload(e, nominee.files, (newFiles) => setNominee(prev => ({ ...prev, files: newFiles })))}
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
                    <Building style={{ width: 15, height: 15, color: '#2563EB' }} />
                    <span>{t('nla.property_document_details')}</span>
                  </div>

                  <div className="form-grid-3col">
                    <div className="form-group">
                      <label className="req">{t('nla.property_type')}</label>
                      <select
                        value={propertyDetails.type}
                        onChange={(e) => setPropertyDetails({ ...propertyDetails, type: e.target.value })}
                        className="input-field-select"
                      >
                        <option value="Residential House">{t('nla.prop_residential')}</option>
                        <option value="Commercial Shop">{t('nla.prop_commercial')}</option>
                        <option value="Agricultural Land">{t('nla.prop_agricultural')}</option>
                        <option value="Vacant Plot">{t('nla.prop_vacant')}</option>
                        <option value="Other">{t('nla.prop_other')}</option>
                      </select>
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
                    <div className="form-group" style={{ gridColumn: 'span 3' }}>
                      <label>{t('nla.upload_property_docs')}</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label className="btn-cancel-app" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', margin: 0, height: 36, width: 'fit-content' }}>
                          <Upload style={{ width: 14, height: 14 }} />
                          <span>{t('nla.upload_property_deeds_images')}</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*,.pdf"
                            style={{ display: 'none' }}
                            onChange={(e) => handleMultipleFilesUpload(e, propertyDetails.files, (newFiles) => setPropertyDetails(prev => ({ ...prev, files: newFiles })))}
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
                    <Car style={{ width: 15, height: 15, color: '#059669' }} />
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
                    <div className="form-group" style={{ gridColumn: 'span 3' }}>
                      <label>{t('nla.upload_rc_book_images')}</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label className="btn-cancel-app" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', margin: 0, height: 36, width: 'fit-content' }}>
                          <Upload style={{ width: 14, height: 14 }} />
                          <span>{t('nla.upload_rc_book_files')}</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*,.pdf"
                            style={{ display: 'none' }}
                            onChange={(e) => handleMultipleFilesUpload(e, vehicleDetails.files, (newFiles) => setVehicleDetails(prev => ({ ...prev, files: newFiles })))}
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
                    <CreditCard style={{ width: 15, height: 15, color: '#D97706' }} />
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
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label>{t('nla.security_notes_desc')}</label>
                      <input
                        type="text"
                        value={othersDetails.description}
                        onChange={(e) => setOthersDetails({ ...othersDetails, description: e.target.value })}
                        className="input-field"
                        placeholder="Type any security details, asset description, or notes (optional)"
                      />
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label>{t('nla.upload_other_security_docs')}</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label className="btn-cancel-app" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', margin: 0, height: 36, width: 'fit-content' }}>
                          <Upload style={{ width: 14, height: 14 }} />
                          <span>{t('nla.upload_security_images_files')}</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*,.pdf"
                            style={{ display: 'none' }}
                            onChange={(e) => handleMultipleFilesUpload(e, othersDetails.files, (newFiles) => setOthersDetails(prev => ({ ...prev, files: newFiles })))}
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

          {/* Form Bottom Action Bar */}
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
              <span className="code-pill">{selectedBorrower?.borrower_code || 'KTG-CUST-???'}</span>
              {selectedBorrower && (
                <span className={`kyc-status-badge kyc-status-badge--${(selectedBorrower?.kyc_status || 'PENDING').toLowerCase()}`}>
                  {t('nla.kyc_prefix')} {tStatus(selectedBorrower?.kyc_status || 'PENDING')}
                </span>
              )}
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
              <strong style={{ color: '#D97706' }}>+ ₹{fmt(creditSummary.totalInterest)}</strong>
            </div>

            <div className="preview-row preview-row--total">
              <span>{t('nla.total_amount_payable_label')}</span>
              <strong>₹{fmt(creditSummary.totalPayable)}</strong>
            </div>

            <div className="preview-row preview-row--emi">
              <span>{t('nla.calculated_prefix')} {loanTerms.repayment_frequency === 'DAILY' ? t('nla.freq_daily_short') : loanTerms.repayment_frequency === 'WEEKLY' ? t('nla.freq_weekly_short') : t('nla.freq_monthly_short')} {t('nla.emi_suffix')}</span>
              <span className="emi-val">₹{fmt(creditSummary.installmentAmount)}</span>
            </div>
          </div>

        </div>

      </form>

      {/* Paper Printing Black & White Application Form Sheet Modal */}
      {previewSheetOpen && pendingPayload && (
        <PrintableLoanApplicationSheet
          applicationData={pendingPayload}
          borrowerData={selectedBorrower || {}}
          onClose={() => setPreviewSheetOpen(false)}
          onConfirmSubmit={handleFinalSubmit}
        />
      )}

    </div>
  );
}
