import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Building2,
  ShieldCheck,
  Briefcase,
  Landmark,
  Users,
  Pencil,
  CreditCard,
  Wallet,
  Layers,
  FileText,
  Paperclip,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Download,
  FileWarning
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

const DOC_LABELS = {
  AADHAAR_FRONT: 'Aadhaar Card (Front)',
  AADHAAR_BACK: 'Aadhaar Card (Back)',
  PAN_CARD: 'PAN Card',
  BANK_PASSBOOK: 'Bank Passbook / Cheque',
  ADDRESS_PROOF: 'Address Proof',
  OTHER: 'Additional Document'
};

function Field({ label, value }) {
  const { t } = useLanguage();
  const isEmpty = value === undefined || value === null || value === '';
  return (
    <div className="cpx-field">
      <span className="cpx-field__label">{label}</span>
      <span className={`cpx-field__value ${isEmpty ? 'is-empty' : ''}`}>
        {isEmpty ? t('cp.not_provided') : value}
      </span>
    </div>
  );
}

export default function CustomerProfileModal({ borrower, onClose, onEdit }) {
  const { t } = useLanguage();
  const docs = borrower?.documents || [];
  const [selectedDocId, setSelectedDocId] = useState(docs[0]?.id || null);
  const [zoomScale, setZoomScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    setSelectedDocId(docs[0]?.id || null);
    setZoomScale(1);
    setRotation(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [borrower?.id]);

  if (!borrower) return null;

  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  const address = [borrower.address_line1, borrower.address_line2, borrower.city, borrower.state, borrower.pincode]
    .filter(Boolean).join(', ');

  const activeDoc = docs.find(d => d.id === selectedDocId) || null;
  const activeIsImage = (activeDoc?.mime || '').startsWith('image/');

  const handleSelectDoc = (docId) => {
    setSelectedDocId(docId);
    setZoomScale(1);
    setRotation(0);
  };
  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.25, 0.75));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleResetCanvas = () => { setZoomScale(1); setRotation(0); };

  return (
    <div className="cpx-backdrop" onClick={onClose}>
      <div className="cpx-card" onClick={(e) => e.stopPropagation()}>

        {/* Top Floating Control Bar with Back & Close */}
        <div style={{
          position: 'absolute',
          top: 14,
          right: 16,
          left: 16,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              pointerEvents: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 20,
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#334155',
              fontSize: '0.78rem',
              fontWeight: 500,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
            }}
          >
            <ArrowLeft style={{ width: 14, height: 14 }} />
            <span></span>
          </button>

          <button
            type="button"
            className="cpx-close"
            onClick={onClose}
            style={{ pointerEvents: 'auto', position: 'static' }}
            title={t('cp.close_profile')}
          >
            <X style={{ width: 17, height: 17 }} />
          </button>
        </div>

        {/* ── LEFT: Large Profile Portrait Panel ───────────────────────── */}
        <aside className="cpx-portrait-panel">
          <div className="cpx-portrait-frame" style={{ borderRadius: '50%' }}>
            {borrower.profile_image ? (
              <img src={borrower.profile_image} alt={borrower.full_name} style={{ borderRadius: '50%' }} />
            ) : (
              <span>{(borrower.full_name || '?').charAt(0)}</span>
            )}
          </div>

          <h2 className="cpx-name">{borrower.full_name}</h2>
          <span className="cpx-code">{borrower.borrower_code || '—'}</span>

          <div className="cpx-contact-list">
            <div className="cpx-contact-row">
              <Phone style={{ width: 14, height: 14 }} />
              <span className={!borrower.phone ? 'is-empty' : ''}>{borrower.phone || t('cp.not_provided')}</span>
            </div>
            {borrower.email && (
              <div className="cpx-contact-row">
                <Mail style={{ width: 14, height: 14 }} />
                <span>{borrower.email}</span>
              </div>
            )}
            <div className="cpx-contact-row">
              <Building2 style={{ width: 14, height: 14 }} />
              <span>{borrower.branch || '—'}</span>
            </div>
            {address && (
              <div className="cpx-contact-row">
                <MapPin style={{ width: 14, height: 14 }} />
                <span>{address}</span>
              </div>
            )}
          </div>

          <div className="cpx-stats">
            <div className="cpx-stat">
              <Layers style={{ width: 15, height: 15 }} />
              <div>
                <strong>{borrower.loansCount ?? borrower.loansList?.length ?? 0}</strong>
                <span>{t('cp.loan_accounts')}</span>
              </div>
            </div>
            <div className="cpx-stat">
              <Wallet style={{ width: 15, height: 15 }} />
              <div>
                <strong>₹{fmt(borrower.disbursedAmount)}</strong>
                <span>{t('cp.total_disbursed')}</span>
              </div>
            </div>
            <div className="cpx-stat">
              <CreditCard style={{ width: 15, height: 15 }} />
              <div>
                <strong className={borrower.totalOutstanding > 0 ? 'danger' : 'success'}>₹{fmt(borrower.totalOutstanding)}</strong>
                <span>{t('cp.outstanding_exposure')}</span>
              </div>
            </div>
          </div>

          <div className="cpx-portrait-actions">
            <button type="button" className="cpx-btn cpx-btn--light" onClick={onEdit}>
              <Pencil style={{ width: 13, height: 13 }} />
              <span>{t('cp.edit_profile')}</span>
            </button>
          </div>
        </aside>

        {/* ── RIGHT: Modern Executive Detail Panel ───────────────────────── */}
        <section className="cpx-detail-panel">
          <div className="cpx-detail-head">
            <h3>{t('cp.record_title')}</h3>
            <p>{t('cp.record_subtitle')}</p>
          </div>

          <div className="cpx-detail-body">

            {/* Associated Loans at top */}
            <div className="cpx-card-section">
              <div className="cpx-card-section-head">
                <CreditCard style={{ width: 14, height: 14, color: 'var(--brand-primary, #15803D)' }} />
                <h4>{t('cp.associated_loans')} ({borrower.loansList?.length || 0})</h4>
              </div>
              {(!borrower.loansList || borrower.loansList.length === 0) ? (
                <div className="cpx-empty">{t('cp.no_loans')}</div>
              ) : (
                <div className="cpx-loans">
                  {borrower.loansList.map(loan => (
                    <div className="cpx-loan-row" key={loan.id}>
                      <div>
                        <strong>{loan.loan_account_no}</strong>
                        <span>{t('cp.disbursed')} ₹{fmt(loan.principal_amount)} • EMI ₹{loan.installment_amount}{t('cp.per_day')}</span>
                      </div>
                      <div className={`cpx-loan-pending ${loan.pending_amount > 0 ? 'danger' : 'success'}`}>
                        ₹{fmt(loan.pending_amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 1: Personal Details */}
            <div className="cpx-card-section">
              <div className="cpx-card-section-head">
                <Users style={{ width: 14, height: 14, color: 'var(--brand-primary, #15803D)' }} />
                <h4>{t('cp.personal_details')}</h4>
              </div>
              <div className="cpx-grid">
                <Field label={t('cp.father_spouse')} value={borrower.father_spouse_name} />
                <Field label={t('cp.dob')} value={borrower.dob} />
                <Field label={t('cp.gender')} value={borrower.gender} />
                <Field label={t('cp.marital_status')} value={borrower.marital_status} />
                <Field label={t('cp.alt_phone')} value={borrower.alt_phone} />
                <Field label={t('cp.account_status')} value={borrower.status || 'ACTIVE'} />
              </div>
            </div>

            {/* Section 2: ID & Government Identification */}
            <div className="cpx-card-section">
              <div className="cpx-card-section-head">
                <ShieldCheck style={{ width: 14, height: 14, color: 'var(--brand-primary, #15803D)' }} />
                <h4>{t('cp.id_kyc')}</h4>
              </div>
              <div className="cpx-grid">
                <Field label={t('cp.aadhaar_number')} value={borrower.aadhaar_number} />
                <Field label={t('cp.pan_number')} value={borrower.pan_number} />
                <Field label={t('cp.voter_id')} value={borrower.voter_id} />
                <Field label={t('cp.id_proof_type')} value={borrower.id_proof_type} />
              </div>
            </div>

            {/* Section 3: Employment & Income */}
            <div className="cpx-card-section">
              <div className="cpx-card-section-head">
                <Briefcase style={{ width: 14, height: 14, color: 'var(--brand-primary, #15803D)' }} />
                <h4>{t('cp.employment_income')}</h4>
              </div>
              <div className="cpx-grid">
                <Field label={t('cp.occupation')} value={borrower.occupation} />
                <Field label={t('cp.employer_name')} value={borrower.employer_name} />
                <Field label={t('cp.monthly_income')} value={borrower.monthly_income ? `₹${fmt(borrower.monthly_income)}` : ''} />
              </div>
            </div>

            {/* Section 4: Financial & Bank Details */}
            <div className="cpx-card-section">
              <div className="cpx-card-section-head">
                <Landmark style={{ width: 14, height: 14, color: 'var(--brand-primary, #15803D)' }} />
                <h4>{t('cp.bank_details')}</h4>
              </div>
              <div className="cpx-grid">
                <Field label={t('cp.bank_name')} value={borrower.bank_name} />
                <Field label={t('cp.account_number')} value={borrower.account_number} />
                <Field label={t('cp.ifsc_code')} value={borrower.ifsc_code} />
              </div>
            </div>

            {/* Section 5: Guarantor & Nominee */}
            <div className="cpx-card-section">
              <div className="cpx-card-section-head">
                <Users style={{ width: 14, height: 14, color: 'var(--brand-primary, #15803D)' }} />
                <h4>{t('cp.guarantor_nominee')}</h4>
              </div>
              <div className="cpx-grid">
                <Field label={t('cp.guarantor_name')} value={borrower.guarantor_name} />
                <Field label={t('cp.guarantor_phone')} value={borrower.guarantor_phone} />
                <Field label={t('cp.nominee_name')} value={borrower.nominee_name} />
                <Field label={t('cp.nominee_relation')} value={borrower.nominee_relation} />
              </div>
            </div>

            <div className="cpx-section">
              <h4><Paperclip style={{ width: 13, height: 13 }} /> {t('cp.uploaded_documents')} ({docs.length})</h4>

              <div className="cpx-canvas">
                <div className="cpx-canvas__head">
                  <div className="cpx-canvas__title">
                    <Eye style={{ width: 14, height: 14, color: 'var(--brand-primary, #15803D)' }} />
                    <span>{t('cp.canvas_title')}</span>
                  </div>
                  {docs.length > 0 && <span className="cpx-canvas__hint">{t('cp.canvas_hint')}</span>}
                </div>

                {docs.length > 0 && (
                  <div className="cpx-canvas__tabs">
                    {docs.map(doc => (
                      <button
                        type="button"
                        key={doc.id}
                        className={`cpx-canvas__tab ${selectedDocId === doc.id ? 'active' : ''}`}
                        onClick={() => handleSelectDoc(doc.id)}
                      >
                        <FileText style={{ width: 13, height: 13 }} />
                        <span>{DOC_LABELS[doc.category] || doc.type || doc.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="cpx-canvas__frame">
                  {activeDoc ? (
                    activeIsImage ? (
                      <img
                        src={activeDoc.url}
                        alt={activeDoc.name}
                        style={{ transform: `scale(${zoomScale}) rotate(${rotation}deg)` }}
                      />
                    ) : (
                      <div className="cpx-canvas__empty">
                        <FileText style={{ width: 32, height: 32, color: '#475569' }} />
                        <span>{activeDoc.name}</span>
                      </div>
                    )
                  ) : (
                    <div className="cpx-canvas__empty">
                      <FileWarning style={{ width: 32, height: 32, color: '#475569' }} />
                      <span>{t('cp.no_documents')}</span>
                    </div>
                  )}

                  {activeDoc && (
                    <div className="cpx-canvas__toolbar">
                      <button type="button" onClick={handleZoomIn} title={t('cp.zoom_in')}>
                        <ZoomIn style={{ width: 15, height: 15 }} />
                      </button>
                      <span className="cpx-canvas__zoom">{Math.round(zoomScale * 100)}%</span>
                      <button type="button" onClick={handleZoomOut} title={t('cp.zoom_out')}>
                        <ZoomOut style={{ width: 15, height: 15 }} />
                      </button>
                      <button type="button" onClick={handleRotate} title={t('cp.rotate')}>
                        <RotateCw style={{ width: 15, height: 15 }} />
                      </button>
                      <button type="button" onClick={handleResetCanvas} title={t('cp.reset_view')}>
                        <Maximize2 style={{ width: 15, height: 15 }} />
                      </button>
                      <a href={activeDoc.url} download={activeDoc.name} title={t('cp.download_file')}>
                        <Download style={{ width: 15, height: 15 }} />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}
