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

  const appNo = applicationData.loan_account_no || `APP/${new Date().getFullYear()}/${Math.floor(10000 + Math.random() * 90000)}`;
  const appDate = applicationData.loan_date || new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

  const { nominee, security } = applicationData;

  // Gather all uploaded document files from nominee / security sections
  const uploadedFiles = [
    ...(nominee?.files || []),
    ...(security?.details?.files || [])
  ];

  const modalContent = (
    <div className="printable-form-overlay">

      {/* Floating Action Controls for Preview Sheet (Hidden when Printing) */}
      <div className="printable-form-floating-btns">
        <button type="button" onClick={onClose} className="btn-close" title="Close Preview">
          <ArrowLeft style={{ width: 15, height: 15 }} />
          <span>Back to List</span>
        </button>

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={handlePrint} className="btn-close" style={{ background: '#FFFFFF', color: '#0F172A' }}>
            <Printer style={{ width: 15, height: 15, color: 'var(--color-info, #2563EB)' }} />
            <span>Print Form / Save PDF</span>
          </button>

          {onReject && (
            <button type="button" disabled={actionBusy} onClick={() => setShowRejectModal(true)} className="btn-close" style={{ background: 'var(--color-danger-light, #FEF2F2)', color: 'var(--color-danger-text, #991B1B)', border: '1px solid var(--color-danger-border, #FECACA)', opacity: actionBusy ? 0.6 : 1, cursor: actionBusy ? 'not-allowed' : 'pointer' }}>
              <XCircle style={{ width: 15, height: 15 }} />
              <span>Reject Application</span>
            </button>
          )}

          {onApprove && (
            <button type="button" disabled={actionBusy} onClick={() => setShowApproveModal(true)} className="btn-print" style={{ background: 'var(--brand-primary, #15803D)', boxShadow: '0 2px 6px rgba(var(--brand-primary-rgb), 0.3)', opacity: actionBusy ? 0.6 : 1, cursor: actionBusy ? 'not-allowed' : 'pointer' }}>
              <CheckCircle2 style={{ width: 15, height: 15 }} />
              <span>Approve & Disburse Loan</span>
            </button>
          )}

          {onConfirmSubmit && !onApprove && (
            <button type="button" disabled={submitting} onClick={onConfirmSubmit} className="btn-print" style={{ background: 'var(--brand-primary, #15803D)', boxShadow: '0 2px 6px rgba(var(--brand-primary-rgb), 0.3)', opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}>
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
                <td className="field-lbl">Father / Spouse / Guarantor</td>
                <td className="field-val">{borrowerData?.father_spouse_name || applicationData?.guarantor || '—'}</td>
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
                <td className="field-val">{applicationData?.tenure_days ? `${applicationData.tenure_days} Days` : (applicationData?.tenure_months ? `${applicationData.tenure_months} Months` : '—')}</td>
                <td className="field-lbl">Installment Frequency</td>
                <td className="field-val" style={{ fontWeight: 600 }}>{applicationData?.repayment_frequency || 'DAILY'} EMI</td>
              </tr>
              <tr>
                <td className="field-lbl">Calculated Installment</td>
                <td className="field-val" style={{ fontWeight: 700 }}>{applicationData?.installment_amount != null ? `₹${fmt(applicationData.installment_amount)} / day` : '—'}</td>
                <td className="field-lbl">Loan Purpose</td>
                <td className="field-val">{applicationData?.purpose || '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 6. Section C: Nominee Details (If Provided) */}
        {nominee && nominee.name && (
          <div className="bank-section">
            <div className="section-header-bar">Section C: Nominee Required Details</div>

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

        {/* 7. Section D: Security & Collateral Document Details */}
        {security && security.type && security.type !== 'NONE' && (
          <div className="bank-section">
            <div className="section-header-bar">Section D: Security & Collateral Document Verification</div>

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

        {/* 8. Section E: Uploaded Document & Image Attachments Gallery (Printed & Previewed) */}
        {uploadedFiles.length > 0 && (
          <div className="bank-section">
            <div className="section-header-bar">Section E: Uploaded Verification Document & Image Attachments</div>
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

        {/* 9. Terms, Declaration & Signatures Box */}
        <div className="bank-declaration-box">
          <div className="dec-title" style={{ fontSize: '0.88rem', fontWeight: 700 }}>Applicant Declaration & Credit Agreement</div>
          <p className="bank-declaration-text" style={{ marginTop: 4 }}>
            I hereby declare that all particulars and details furnished in this loan application form are true, correct, and complete to the best of my knowledge and belief. I agree to abide by the rules, interest rates, and repayment terms specified by {companyInfo.name}.
          </p>

          <div className="bank-signatures-container">
            <div className="sig-box">
              <div className="sig-space"></div>
              <div className="sig-title">Applicant Borrower Signature</div>
              <div className="sig-date">Date: {appDate}</div>
            </div>

            <div className="bank-seal-box">
              <span>Branch Seal & Stamp</span>
            </div>

            <div className="sig-box">
              <div className="sig-space"></div>
              <div className="sig-title">Sanctioning Manager Signature</div>
              <div className="sig-date">Approved & Sanctioned</div>
            </div>
          </div>
        </div>

      </div>

      {/* Approval Confirmation Dialog Overlay */}
      {showApproveModal && (
        <div className="saas-modal-backdrop" style={{ zIndex: 100000 }}>
          <div className="saas-modal-card" style={{ maxWidth: 480 }}>
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: 'var(--brand-primary-light, #F0FEF5)', color: 'var(--brand-primary, #15803D)' }}>
                  <CheckCircle2 style={{ width: 20, height: 20 }} />
                </div>
                <div className="head-titles">
                  <h3>Confirm Loan Approval</h3>
                  <p>Disburse funds & convert to active loan</p>
                </div>
              </div>
              <button onClick={() => setShowApproveModal(false)} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <div className="saas-modal-body" style={{ padding: 18 }}>
              <p style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.5 }}>
                Are you sure you want to approve loan application <strong>{appNo}</strong> for <strong>{applicationData.borrower_name || borrowerData.full_name}</strong>?
                <br /><br />
                Requested Principal: <strong>₹{fmt(applicationData.principal_amount)}</strong>
                <br />
                Daily EMI: <strong>{applicationData.installment_amount != null ? `₹${fmt(applicationData.installment_amount)}/day` : '—'}</strong>
              </p>
            </div>
            {actionError && (
              <div style={{ padding: '0 18px 10px', fontSize: '0.78rem', color: 'var(--color-danger-text, #991B1B)' }}>{actionError}</div>
            )}
            <div className="saas-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" disabled={actionBusy} onClick={() => setShowApproveModal(false)} style={{ border: '1px solid #CBD5E1', background: '#FFF', color: '#334155', padding: '8px 16px', borderRadius: 8, cursor: actionBusy ? 'not-allowed' : 'pointer', fontSize: '0.78rem' }}>Cancel</button>
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
                style={{ background: 'var(--brand-primary, #15803D)', color: '#FFF', border: 'none', padding: '8px 18px', borderRadius: 8, cursor: actionBusy ? 'not-allowed' : 'pointer', opacity: actionBusy ? 0.7 : 1, fontSize: '0.78rem', fontWeight: 700 }}
              >
                {actionBusy ? 'Processing…' : 'Confirm & Disburse Loan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Confirmation Dialog Overlay */}
      {showRejectModal && (
        <div className="saas-modal-backdrop" style={{ zIndex: 100000 }}>
          <div className="saas-modal-card" style={{ maxWidth: 480 }}>
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: 'var(--color-danger-light, #FEF2F2)', color: 'var(--color-danger, #DC2626)' }}>
                  <XCircle style={{ width: 20, height: 20 }} />
                </div>
                <div className="head-titles">
                  <h3>Confirm Application Rejection</h3>
                  <p>Reject loan credit application</p>
                </div>
              </div>
              <button onClick={() => setShowRejectModal(false)} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <div className="saas-modal-body" style={{ padding: 18 }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-danger-text, #991B1B)', marginBottom: 12 }}>
                Are you sure you want to reject application <strong>{appNo}</strong> for <strong>{applicationData.borrower_name || borrowerData.full_name}</strong>?
              </p>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-danger-text, #991B1B)', textTransform: 'uppercase' }}>Rejection Reason *</label>
              <textarea
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. KYC mismatch, insufficient income, high risk score..."
                style={{ width: '100%', marginTop: 6, padding: '8px 12px', border: '1px solid var(--color-danger-border, #FCA5A5)', borderRadius: 8 }}
              />
            </div>
            {actionError && (
              <div style={{ padding: '0 18px 10px', fontSize: '0.78rem', color: 'var(--color-danger-text, #991B1B)' }}>{actionError}</div>
            )}
            <div className="saas-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" disabled={actionBusy} onClick={() => setShowRejectModal(false)} style={{ border: '1px solid #CBD5E1', background: '#FFF', color: '#334155', padding: '8px 16px', borderRadius: 8, cursor: actionBusy ? 'not-allowed' : 'pointer', fontSize: '0.78rem' }}>Cancel</button>
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
                style={{ background: 'var(--color-danger, #DC2626)', color: '#FFF', border: 'none', padding: '8px 18px', borderRadius: 8, cursor: (rejectReason.trim() && !actionBusy) ? 'pointer' : 'not-allowed', opacity: (rejectReason.trim() && !actionBusy) ? 1 : 0.5, fontSize: '0.78rem', fontWeight: 700 }}
              >
                {actionBusy ? 'Processing…' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  return createPortal(modalContent, document.body);
}