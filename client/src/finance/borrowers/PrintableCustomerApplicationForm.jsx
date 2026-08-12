import React from 'react';
import { Printer, ArrowLeft, FileText, Check } from 'lucide-react';

export default function PrintableCustomerApplicationForm({
  formData = {},
  profileImage = null,
  documents = [],
  onClose,
  tenant
}) {
  const companyInfo = {
    name: tenant?.name || 'Your Company',
    tagline: 'Non-Banking Financial Company',
    address: tenant?.address || '',
    contact: tenant?.phone ? `Tel: ${tenant.phone}` : '',
    reg: [tenant?.gstin && `GSTIN: ${tenant.gstin}`, tenant?.pan && `PAN: ${tenant.pan}`].filter(Boolean).join(' | ')
  };

  const handlePrint = () => {
    window.print();
  };

  const appNo = formData.borrower_code || '—';
  const appDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const formatDisplayDate = (value) => {
    if (!value) return '—';
    const str = String(value);
    const dateOnly = str.slice(0, 10);
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? `${dateOnly}T00:00:00` : str);
    if (Number.isNaN(d.getTime())) return dateOnly;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="printable-form-overlay">

      {/* Floating Action Controls (Hidden on Print - No Top Black Header Bar) */}
      <div className="printable-form-floating-btns">
        <button type="button" onClick={onClose} className="btn-close" title="Back to Directory">
          <ArrowLeft style={{ width: 15, height: 15 }} />
          <span>Back</span>
        </button>

        <button type="button" onClick={handlePrint} className="btn-print">
          <Printer style={{ width: 15, height: 15 }} />
          <span>Print Application Form</span>
        </button>
      </div>

      {/* ── SHEET 1: Application Form & Signatures ── */}
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

          {/* Passport Photo Box (No Border) */}
          <div className="bank-photo-container borderless-photo">
            {profileImage ? (
              <img src={profileImage} alt="Applicant Photo" />
            ) : (
              <div className="photo-instructions">
                Affix Passport Size Photo Here
              </div>
            )}
          </div>
        </div>

        {/* 2. Main Title Banner */}
        <div className="bank-title-banner">
          <span>Customer Borrower Enrollment & KYC Application Form</span>
        </div>

        {/* 3. Form Meta Table */}
        <table className="bank-meta-table">
          <tbody>
            <tr>
              <td className="meta-lbl">Form No / Ref:</td>
              <td className="meta-val">{appNo}</td>
              <td className="meta-lbl">Date:</td>
              <td className="meta-val">{appDate}</td>
              <td className="meta-lbl">Branch:</td>
              <td className="meta-val">{formData.branch || '—'}</td>
            </tr>
          </tbody>
        </table>

        {/* 4. Section A: Applicant Personal & Contact Details */}
        <div className="bank-section">
          <div className="section-header-bar">Section A: Applicant Personal & Contact Details</div>

          <table className="bank-grid-table">
            <tbody>
              <tr>
                <td className="field-lbl" style={{ width: '22%' }}>Full Name *</td>
                <td className="field-val" colSpan={3}>
                  {formData.full_name || '—'}
                </td>
              </tr>
              <tr>
                <td className="field-lbl">Father / Spouse Name</td>
                <td className="field-val" colSpan={3}>{formData.father_spouse_name || '—'}</td>
              </tr>
              <tr>
                <td className="field-lbl" style={{ width: '22%' }}>Date of Birth</td>
                <td className="field-val val-mono" style={{ width: '28%' }}>{formatDisplayDate(formData.dob)}</td>
                <td className="field-lbl" style={{ width: '22%' }}>Gender</td>
                <td className="field-val" style={{ width: '28%' }}>{formData.gender || '—'}</td>
              </tr>
              <tr>
                <td className="field-lbl">Primary Mobile *</td>
                <td className="field-val val-mono">{formData.phone || '—'}</td>
                <td className="field-lbl">Alternate Phone</td>
                <td className="field-val val-mono">{formData.alt_phone || '—'}</td>
              </tr>
              <tr>
                <td className="field-lbl">Email Address</td>
                <td className="field-val" colSpan={3}>{formData.email || '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 5. Section B: Residential & Communication Address */}
        <div className="bank-section">
          <div className="section-header-bar">Section B: Residential & Communication Address</div>

          <table className="bank-grid-table">
            <tbody>
              <tr>
                <td className="field-lbl" style={{ width: '22%' }}>Address Line 1</td>
                <td className="field-val" colSpan={3}>{formData.address_line1 || '—'}</td>
              </tr>
              <tr>
                <td className="field-lbl" style={{ width: '22%' }}>City / Taluk</td>
                <td className="field-val" style={{ width: '28%' }}>{formData.city || '—'}</td>
                <td className="field-lbl" style={{ width: '22%' }}>State</td>
                <td className="field-val" style={{ width: '28%' }}>{formData.state || '—'}</td>
              </tr>
              <tr>
                <td className="field-lbl">Postal Pincode *</td>
                <td className="field-val val-mono">{formData.pincode || '—'}</td>
                <td className="field-lbl">Country</td>
                <td className="field-val">India</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 6. Section C: Government KYC Identification Proofs */}
        <div className="bank-section">
          <div className="section-header-bar">Section C: Government KYC Identification Proofs</div>

          <table className="bank-grid-table">
            <tbody>
              <tr>
                <td className="field-lbl" style={{ width: '22%' }}>Primary ID Type</td>
                <td className="field-val" colSpan={3}>
                  {formData.id_proof_type || '—'}
                </td>
              </tr>
              <tr>
                <td className="field-lbl" style={{ width: '22%' }}>Aadhaar Number</td>
                <td className="field-val val-mono" style={{ width: '28%' }}>
                  {formData.aadhaar_number || '—'}
                </td>
                <td className="field-lbl" style={{ width: '22%' }}>PAN Card Number</td>
                <td className="field-val val-mono" style={{ width: '28%' }}>
                  {formData.pan_number || '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 7. Section D: Applicant Declaration & Undertaking */}
        <div className="bank-section">
          <div className="section-header-bar">Section D: Applicant Declaration & Undertaking</div>
        </div>

        <div className="bank-declaration-box">
          <div className="bank-declaration-text">
            I hereby declare that all information furnished in this enrollment form is true and correct. I authorize {companyInfo.name} to verify my KYC documents and Aadhaar/PAN records as per RBI guidelines.
          </div>

          {/* 8. Signatures & Bank Verification Stamp Row */}
          <div className="bank-signatures-container">
            <div className="sig-box">
              <div className="sig-space"></div>
              <div className="sig-title">Signature of Applicant</div>
              <div className="sig-date">Date: {appDate}</div>
            </div>

            <div className="bank-seal-box">
              <span>Branch Stamp / Seal</span>
            </div>

            <div className="sig-box">
              <div className="sig-space"></div>
              <div className="sig-title">Authorised Manager Signature</div>
              <div className="sig-date">Verified & Approved By</div>
            </div>
          </div>
        </div>

      </div>

      {/* ── SHEET 2: Annexure - Attached Government KYC Document Scans ── */}
      {documents.length > 0 && (
        <div className="paper-sheet bank-form-paper page-break">
          <div className="annexure-header-row">
            <div className="annexure-title">
              <h2>Annexure: Attached Government KYC Document Scans</h2>
              <p>Applicant: <strong>{formData.full_name}</strong> | Form No: <strong>{appNo}</strong></p>
            </div>
            <div className="annexure-count">
              <span>{documents.length} Uploaded Attachments</span>
            </div>
          </div>

          <div className="bank-doc-proofs-grid">
            {documents.map((doc, idx) => (
              <div key={doc.id || idx} className="bank-doc-card">
                <div className="doc-type-title">
                  <Check style={{ width: 13, height: 13, color: '#000' }} />
                  <span>{doc.category ? doc.category.replace('_', ' ') : doc.name}</span>
                </div>

                {doc.url && (doc.type?.includes('image') || doc.url.startsWith('data:image')) ? (
                  <img src={doc.url} alt={doc.name} className="doc-image-preview" />
                ) : (
                  <div className="doc-fallback">
                    <FileText style={{ width: 22, height: 22 }} />
                    <span>{doc.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
