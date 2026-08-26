import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, ArrowLeft, Send, FileText, CheckCircle2, XCircle, X } from 'lucide-react';

export default function PrintableLoanApplicationSheet({
  applicationData: rawApp,
  borrowerData: rawBorrower,
  onClose,
  onConfirmSubmit,
  onApprove,
  onReject,
  initialMode = 'VIEW',
  tenant,
  submitting = false,
  submitError = null
}) {
  const applicationData = rawApp || {};
  const borrowerData = rawBorrower || {};

  const companyInfo = {
    name: tenant?.name || 'Your Company',
    tagline: 'Non-Banking Financial Company',
    address: tenant?.address || '',
    contact: tenant?.phone ? `Tel: ${tenant.phone}` : '',
    reg: [tenant?.gstin && `GSTIN: ${tenant.gstin}`, tenant?.pan && `PAN: ${tenant.pan}`].filter(Boolean).join(' | ')
  };

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const handlePrint = () => {
    window.print();
  };

  const [stableDraftAppNo] = useState(() => {
    const year = new Date().getFullYear();
    return `APP-${year}-0001`;
  });

  const appNo = applicationData.loan_account_no || applicationData.application_no || stableDraftAppNo;
  const appDate = applicationData.loan_date || new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

  const guarantor = typeof applicationData.guarantor === 'string'
    ? (() => { try { return JSON.parse(applicationData.guarantor); } catch { return { name: applicationData.guarantor }; } })()
    : (applicationData.guarantor || null);

  const { nominee, security } = applicationData;

  // Gather all uploaded document files from guarantor / nominee / security sections
  const uploadedFiles = [
    ...(guarantor?.files || []),
    ...(nominee?.files || []),
    ...(security?.details?.files || [])
  ];

  const modalContent = (
    <div className="printable-form-overlay">

      {/* Floating Action Controls for Preview Sheet (Hidden when Printing) */}
      <div className="printable-form-floating-btns">
        <div className="top-action-row">
          <button type="button" onClick={onClose} className="btn-close" title="Close Preview">
            <ArrowLeft style={{ width: 15, height: 15 }} />
            <span>Back to Form</span>
          </button>

          <button type="button" onClick={handlePrint} className="btn-close btn-print-sheet">
            <Printer style={{ width: 15, height: 15, color: 'var(--color-info, #2563EB)' }} />
            <span>Print Form / PDF</span>
          </button>
        </div>

        <div className="primary-action-row">
          {onReject && (
            <button type="button" disabled={actionBusy} onClick={() => setShowRejectModal(true)} className="btn-reject-app">
              <XCircle style={{ width: 15, height: 15 }} />
              <span>Reject Application</span>
            </button>
          )}

          {onApprove && (
            <button type="button" disabled={actionBusy} onClick={() => setShowApproveModal(true)} className="btn-approve-app">
              <CheckCircle2 style={{ width: 15, height: 15 }} />
              <span>Approve & Disburse Loan</span>
            </button>
          )}

          {onConfirmSubmit && !onApprove && (
            <button type="button" disabled={submitting} onClick={onConfirmSubmit} className="btn-confirm-app">
              <Send style={{ width: 15, height: 15 }} />
              <span>{submitting ? 'Submitting…' : 'Confirm & Submit Application'}</span>
            </button>
          )}
        </div>
      </div>

      {submitError && (
        <div style={{ position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 100001, background: 'var(--color-danger-light, #FEF2F2)', color: 'var(--color-danger-text, #991B1B)', border: '1px solid var(--color-danger-border, #FECACA)', padding: '8px 16px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 500 }}>
          {submitError}
        </div>
      )}

      {/* ISO A4 Paper Sheet (Black & White Printing Format - Natural Medium Readable Font) */}
      <div className="paper-sheet bank-form-paper">

        {/* 1. Official Bank Letterhead Header */}
        <div className="bank-header-row">
          <div className="bank-logo-col">
            <div className="bank-emblem">{(companyInfo.name || 'CO').split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase()}</div>
          </div>

          <div className="bank-title-col">
            <h1 className="bank-company-name">{companyInfo.name}</h1>
            <p className="bank-tagline">{companyInfo.tagline}</p>
            <p className="bank-contact-line">{companyInfo.address}</p>
            <p className="bank-contact-line">{companyInfo.contact}</p>
            <p className="bank-cin-line">{companyInfo.reg}</p>
          </div>

          {/* Applicant Passport Photo Box */}
          <div className="bank-photo-container borderless-photo">
            {borrowerData?.profile_image ? (
              <img src={borrowerData.profile_image} alt="Applicant Photo" />
            ) : (
              <div className="photo-instructions">
                Affix Passport Size Photo Here
              </div>
            )}
          </div>
        </div>

        {/* 2. Main Title Banner */}
        <div className="bank-title-banner">
          <span>Official Loan Credit Sanction & Application Form</span>
        </div>

        {/* 3. Form Meta Table */}
        <table className="bank-meta-table">
          <tbody>
            <tr>
              <td className="meta-lbl">Application No:</td>
              <td className="meta-val">{appNo}</td>
              <td className="meta-lbl">Date:</td>
              <td className="meta-val">{appDate}</td>
              <td className="meta-lbl">Branch:</td>
              <td className="meta-val">{borrowerData?.branch || applicationData?.branch || '—'}</td>
            </tr>
          </tbody>
        </table>

        {/* 4. Section A: Applicant Profile Details */}
        <div className="bank-section">
          <div className="section-header-bar">Section A: Applicant Customer Profile Details</div>

          <table className="bank-grid-table">
            <tbody>
              <tr>
                <td className="field-lbl" style={{ width: '22%' }}>Full Name</td>
                <td className="field-val" style={{ width: '28%' }}>{borrowerData?.full_name || applicationData?.borrower_name || '—'}</td>
                <td className="field-lbl" style={{ width: '22%' }}>Customer Code</td>
                <td className="field-val" style={{ width: '28%' }}>{borrowerData?.borrower_code || applicationData?.loan_account_no || '—'}</td>
              </tr>
              <tr>
                <td className="field-lbl">Father / Spouse Name</td>
                <td className="field-val">{borrowerData?.father_spouse_name || '—'}</td>
                <td className="field-lbl">Mobile Phone</td>
                <td className="field-val">{borrowerData?.phone || applicationData?.phone || '—'}</td>
              </tr>
              <tr>
                <td className="field-lbl">DOB / Gender</td>
                <td className="field-val">{borrowerData?.dob || '—'} {borrowerData?.gender ? `(${borrowerData.gender})` : ''}</td>
                <td className="field-lbl">Voter ID</td>
                <td className="field-val">{borrowerData?.voter_id || '—'}</td>
              </tr>
              <tr>
                <td className="field-lbl">Aadhaar UID Number</td>
                <td className="field-val">{borrowerData?.aadhaar_number || applicationData?.aadhaar || '—'}</td>
                <td className="field-lbl">PAN Card Number</td>
                <td className="field-val" style={{ textTransform: 'uppercase' }}>{borrowerData?.pan_number || applicationData?.pan || '—'}</td>
              </tr>
              <tr>
                <td className="field-lbl">Residential Address</td>
                <td className="field-val" colSpan={3}>
                  {[borrowerData?.address_line1 || borrowerData?.street_address, borrowerData?.city, borrowerData?.state, borrowerData?.pincode].filter(Boolean).join(', ') || applicationData?.branch || '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 5. Section B: Requested Loan Credit Terms */}
        <div className="bank-section">
          <div className="section-header-bar">Section B: Requested Loan Credit Terms & EMI Calculation</div>

          <table className="bank-grid-table">
            <tbody>
              <tr>
                <td className="field-lbl" style={{ width: '22%' }}>Requested Principal</td>
                <td className="field-val" style={{ width: '28%', fontWeight: 700 }}>₹{fmt(applicationData?.principal_amount)}</td>
                <td className="field-lbl" style={{ width: '22%' }}>Monthly Interest Rate</td>
                <td className="field-val" style={{ width: '28%' }}>{applicationData?.monthly_interest_rate != null ? `${applicationData.monthly_interest_rate}% per month` : '—'}</td>
              </tr>
              <tr>
                <td className="field-lbl">Tenure Period</td>
                <td className="field-val">
                  {applicationData?.tenure_days
                    ? (applicationData?.repayment_frequency === 'MONTHLY' && applicationData.tenure_days % 30 === 0
                      ? `${applicationData.tenure_days / 30} Months`
                      : applicationData?.repayment_frequency === 'WEEKLY' && applicationData.tenure_days % 7 === 0
                        ? `${applicationData.tenure_days / 7} Weeks`
                        : `${applicationData.tenure_days} Days`)
                    : (applicationData?.tenure_months ? `${applicationData.tenure_months} Months` : '—')}
                </td>
                <td className="field-lbl">Installment Frequency</td>
                <td className="field-val" style={{ fontWeight: 600 }}>{applicationData?.repayment_frequency || 'DAILY'} {applicationData?.repayment_method === 'INTEREST_ONLY' ? 'Interest' : 'EMI'}</td>
              </tr>
              <tr>
                <td className="field-lbl">Calculated Installment</td>
                <td className="field-val" style={{ fontWeight: 700 }}>
                  {applicationData?.installment_amount != null
                    ? `₹${fmt(applicationData.installment_amount)} / ${applicationData?.repayment_frequency === 'MONTHLY' ? 'month' : applicationData?.repayment_frequency === 'WEEKLY' ? 'week' : 'day'}`
                    : '—'}
                </td>
                <td className="field-lbl">Loan Purpose</td>
                <td className="field-val">{applicationData?.purpose || '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 6. Section C: Mandatory Guarantor Details */}
        {guarantor && (guarantor.name || guarantor.mobile) && (
          <div className="bank-section">
            <div className="section-header-bar">Section C: Mandatory Guarantor Details</div>

            <table className="bank-grid-table">
              <tbody>
                <tr>
                  <td className="field-lbl" style={{ width: '22%' }}>Guarantor Name</td>
                  <td className="field-val" style={{ width: '28%', fontWeight: 700 }}>{guarantor.name}</td>
                  <td className="field-lbl" style={{ width: '22%' }}>Relationship</td>
                  <td className="field-val" style={{ width: '28%' }}>{guarantor.final_relationship || guarantor.relationship || '—'}</td>
                </tr>
                <tr>
                  <td className="field-lbl">Date of Birth (DOB)</td>
                  <td className="field-val">{guarantor.dob || '—'}</td>
                  <td className="field-lbl">Mobile Phone</td>
                  <td className="field-val" style={{ fontWeight: 600 }}>{guarantor.mobile || '—'}</td>
                </tr>
                <tr>
                  <td className="field-lbl">ID Proof Type</td>
                  <td className="field-val">{guarantor.id_proof_type || 'Aadhaar Card'}</td>
                  <td className="field-lbl">ID / Aadhaar Number</td>
                  <td className="field-val" style={{ fontWeight: 600 }}>
                    {guarantor.id_proof_number || guarantor.aadhaar || '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 7. Section D: Nominee Details (If Provided) */}
        {nominee && nominee.name && (
          <div className="bank-section">
            <div className="section-header-bar">Section D: Nominee Details</div>

            <table className="bank-grid-table">
              <tbody>
                <tr>
                  <td className="field-lbl" style={{ width: '22%' }}>Nominee Name</td>
                  <td className="field-val" style={{ width: '28%' }}>{nominee.name}</td>
                  <td className="field-lbl" style={{ width: '22%' }}>Relationship</td>
                  <td className="field-val" style={{ width: '28%' }}>{nominee.final_relationship || nominee.relationship}</td>
                </tr>
                <tr>
                  <td className="field-lbl">Date of Birth (DOB)</td>
                  <td className="field-val">{nominee.dob || '—'}</td>
                  <td className="field-lbl">Mobile Phone</td>
                  <td className="field-val">{nominee.mobile || '—'}</td>
                </tr>
                <tr>
                  <td className="field-lbl">ID Proof Type</td>
                  <td className="field-val">{nominee.id_proof_type || 'Aadhaar Card'}</td>
                  <td className="field-lbl">ID Document Number</td>
                  <td className="field-val" style={{ fontWeight: 600 }}>
                    {nominee.id_proof_number || '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 8. Section E: Security & Collateral Document Details */}
        {security && security.type && security.type !== 'NONE' && (
          <div className="bank-section">
            <div className="section-header-bar">Section E: Security & Collateral Document Verification</div>

            <table className="bank-grid-table">
              <tbody>
                <tr>
                  <td className="field-lbl" style={{ width: '22%' }}>Security Category</td>
                  <td className="field-val" colSpan={3} style={{ fontWeight: 700 }}>
                    {security.type === 'PROPERTY' && 'Property Document (Land / House Deed)'}
                    {security.type === 'VEHICLE' && 'Vehicle RC (Registration Certificate)'}
                    {security.type === 'CHEQUE' && 'Cheque Leaf (Post-Dated Cheques / PDC)'}
                    {security.type === 'OTHERS' && 'Other Security Document & Notes'}
                  </td>
                </tr>
                {security.type === 'PROPERTY' && (
                  <>
                    <tr>
                      <td className="field-lbl">Property Type</td>
                      <td className="field-val">{security.details?.final_type || security.details?.type || 'Residential'}</td>
                      <td className="field-lbl">Survey / Doc No</td>
                      <td className="field-val" style={{ fontWeight: 600 }}>{security.details?.survey_number || '—'}</td>
                    </tr>
                    <tr>
                      <td className="field-lbl">Estimated Market Value</td>
                      <td className="field-val" colSpan={3} style={{ fontWeight: 700 }}>₹{fmt(security.details?.market_value)}</td>
                    </tr>
                  </>
                )}
                {security.type === 'VEHICLE' && (
                  <>
                    <tr>
                      <td className="field-lbl">RC Registration No</td>
                      <td className="field-val" style={{ fontWeight: 600 }}>{security.details?.rc_number || '—'}</td>
                      <td className="field-lbl">Make & Model</td>
                      <td className="field-val">{security.details?.make_model || '—'}</td>
                    </tr>
                    <tr>
                      <td className="field-lbl">RC Owner Name</td>
                      <td className="field-val" colSpan={3}>{security.details?.rc_owner_name || '—'}</td>
                    </tr>
                  </>
                )}
                {security.type === 'CHEQUE' && (
                  <>
                    <tr>
                      <td className="field-lbl">Bank Name & Branch</td>
                      <td className="field-val">{security.details?.bank_name || '—'}</td>
                      <td className="field-lbl">Bank Account No</td>
                      <td className="field-val" style={{ fontWeight: 600 }}>{security.details?.account_number || '—'}</td>
                    </tr>
                    <tr>
                      <td className="field-lbl">Cheque Leaf Range</td>
                      <td className="field-val">{security.details?.cheque_number_range || '—'}</td>
                      <td className="field-lbl">Signed Cheques Count</td>
                      <td className="field-val">{security.details?.cheques_count || 0} Cheques</td>
                    </tr>
                  </>
                )}
                {security.type === 'OTHERS' && (
                  <tr>
                    <td className="field-lbl">Security Notes</td>
                    <td className="field-val" colSpan={3}>{security.details?.description || 'No description provided.'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 9. Section F: Uploaded Document & Image Attachments Gallery (Printed & Previewed) */}
        {uploadedFiles.length > 0 && (
          <div className="bank-section">
            <div className="section-header-bar">Section F: Uploaded Verification Document & Image Attachments</div>
            <div className="printed-attachments-container">
              {uploadedFiles.map((fileObj, idx) => {
                const isImg = fileObj.type?.startsWith('image/') || fileObj.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                return (
                  <div key={idx} className="printed-attachment-card">
                    {isImg ? (
                      <img src={fileObj.url} alt={fileObj.name} className="attached-img-print" />
                    ) : (
                      <div className="attached-doc-badge">
                        <FileText style={{ width: 24, height: 24, color: '#000000' }} />
                        <span>PDF / Document</span>
                      </div>
                    )}
                    <span className="attached-caption">{fileObj.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 10. Terms, Declaration & Signatures Box */}
        <div className="bank-declaration-box">
          <div className="dec-title" style={{ fontSize: '0.88rem', fontWeight: 700 }}>Applicant & Guarantor Declaration</div>
          <p className="bank-declaration-text" style={{ marginTop: 4 }}>
            We hereby declare that all particulars and details furnished in this loan application form are true, correct, and complete to the best of our knowledge and belief. We agree jointly and severally to abide by the rules, interest rates, and repayment terms specified by {companyInfo.name}.
          </p>

          <div className="bank-signatures-container">
            <div className="sig-box">
              <div className="sig-space"></div>
              <div className="sig-title">Applicant Borrower</div>
              <div className="sig-date">Date: {appDate}</div>
            </div>

            <div className="sig-box">
              <div className="sig-space"></div>
              <div className="sig-title">Guarantor Signature</div>
              <div className="sig-date">Date: {appDate}</div>
            </div>

            <div className="bank-seal-box">
              <span>Branch Seal & Stamp</span>
            </div>

            <div className="sig-box">
              <div className="sig-space"></div>
              <div className="sig-title">Sanctioning Manager</div>
              <div className="sig-date">Approved & Sanctioned</div>
            </div>
          </div>
        </div>

      </div>

      {/* Approval Confirmation Dialog Overlay (Portaled to document.body) */}
      {showApproveModal && createPortal(
        <div className="saas-modal-backdrop" style={{ zIndex: 100020 }}>
          <div className="saas-modal-card" style={{ maxWidth: 480 }}>
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: 'var(--brand-primary-light, #F0FEF5)', color: 'var(--brand-primary, #15803D)' }}>
                  <CheckCircle2 style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3>Confirm Loan Approval</h3>
                  <p>Approve credit application and send to Disbursal queue</p>
                </div>
              </div>
              <button onClick={() => setShowApproveModal(false)} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <div className="saas-modal-body">
              <p style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.5, margin: 0 }}>
                Are you sure you want to approve loan application <strong style={{ color: 'var(--brand-primary, #15803D)' }}>{appNo}</strong> for <strong>{applicationData.borrower_name || borrowerData.full_name}</strong>?
              </p>

              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8rem', marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Requested Principal:</span>
                  <strong style={{ color: '#0F172A', fontSize: '0.92rem' }}>₹{fmt(applicationData.principal_amount)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Installment:</span>
                  <strong style={{ color: 'var(--brand-primary-hover, #0E5327)' }}>
                    {applicationData.installment_amount != null
                      ? `₹${fmt(applicationData.installment_amount)}${applicationData?.repayment_frequency === 'MONTHLY' ? ' / month' : applicationData?.repayment_frequency === 'WEEKLY' ? ' / week' : ' / day'}`
                      : '—'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Branch:</span>
                  <span style={{ fontWeight: 600, color: '#334155' }}>{applicationData.branch || borrowerData.branch || '—'}</span>
                </div>
              </div>
            </div>
            {actionError && (
              <div style={{ padding: '0 18px 10px', fontSize: '0.78rem', color: 'var(--color-danger-text, #991B1B)' }}>{actionError}</div>
            )}
            <div className="saas-modal-footer">
              <button type="button" disabled={actionBusy} onClick={() => setShowApproveModal(false)} className="btn-cancel">Cancel</button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={async () => {
                  setActionBusy(true);
                  setActionError('');
                  try {
                    await onApprove?.(rawApp);
                    setShowApproveModal(false);
                  } catch (err) {
                    setActionError(err?.response?.data?.message || err?.message || 'Failed to approve loan.');
                  } finally {
                    setActionBusy(false);
                  }
                }}
                className="btn-submit"
              >
                <CheckCircle2 style={{ width: 14, height: 14 }} />
                <span>{actionBusy ? 'Processing…' : 'Confirm & Approve'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Rejection Confirmation Dialog Overlay (Portaled to document.body) */}
      {showRejectModal && createPortal(
        <div className="saas-modal-backdrop" style={{ zIndex: 100020 }}>
          <div className="saas-modal-card" style={{ maxWidth: 480 }}>
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: 'var(--color-danger-light, #FEF2F2)', color: 'var(--color-danger, #DC2626)' }}>
                  <XCircle style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3>Confirm Application Rejection</h3>
                  <p>Reject loan credit application</p>
                </div>
              </div>
              <button onClick={() => setShowRejectModal(false)} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <div className="saas-modal-body">
              <p style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.5, margin: 0 }}>
                Are you sure you want to reject application <strong style={{ color: 'var(--color-danger, #DC2626)' }}>{appNo}</strong> for <strong>{applicationData.borrower_name || borrowerData.full_name}</strong>?
              </p>
              <div className="form-group" style={{ marginTop: 12 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>Rejection Reason *</label>
                <textarea
                  rows={3}
                  required
                  className="input-control"
                  style={{ height: 'auto', padding: '8px 12px', resize: 'vertical' }}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. KYC mismatch, insufficient income, high risk score..."
                />
              </div>
            </div>
            {actionError && (
              <div style={{ padding: '0 18px 10px', fontSize: '0.78rem', color: 'var(--color-danger-text, #991B1B)' }}>{actionError}</div>
            )}
            <div className="saas-modal-footer">
              <button type="button" disabled={actionBusy} onClick={() => setShowRejectModal(false)} className="btn-cancel">Cancel</button>
              <button
                type="button"
                disabled={!rejectReason.trim() || actionBusy}
                onClick={async () => {
                  setActionBusy(true);
                  setActionError('');
                  try {
                    await onReject?.(rawApp, rejectReason.trim());
                    setShowRejectModal(false);
                  } catch (err) {
                    setActionError(err?.response?.data?.message || err?.message || 'Failed to reject application.');
                  } finally {
                    setActionBusy(false);
                  }
                }}
                className="btn-submit"
                style={{ background: 'var(--color-danger, #DC2626)' }}
              >
                <XCircle style={{ width: 14, height: 14 }} />
                <span>{actionBusy ? 'Processing…' : 'Confirm Rejection'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );

  return createPortal(modalContent, document.body);
}