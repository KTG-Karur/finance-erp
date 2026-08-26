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
  FileWarning,
  Printer,
  Shield,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import PrintableLoanApplicationSheet from '../loan/PrintableLoanApplicationSheet';
import PrintableCustomerLedgerSheet from './PrintableCustomerLedgerSheet';

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

export default function CustomerProfileModal({ borrower, onClose, onEdit, tenant, collections = [], fixedDeposits = [], recurringDeposits = [], journalEntries = [] }) {
  const { t } = useLanguage();
  const borrowerDocs = borrower?.documents || [];
  const [selectedDocId, setSelectedDocId] = useState(borrowerDocs[0]?.id || null);
  const [zoomScale, setZoomScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Inspected Loan Application state
  const [inspectedLoan, setInspectedLoan] = useState(null);
  const [showLoanAppSheet, setShowLoanAppSheet] = useState(false);
  const [showCustomerLedgerSheet, setShowCustomerLedgerSheet] = useState(false);

  useEffect(() => {
    setSelectedDocId(borrowerDocs[0]?.id || null);
    setZoomScale(1);
    setRotation(0);
    setInspectedLoan(null);
    setShowLoanAppSheet(false);
    setShowCustomerLedgerSheet(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [borrower?.id]);

  if (!borrower) return null;

  const fmt = n => Number(n || 0).toLocaleString('en-IN');
  const address = [borrower.address_line1, borrower.address_line2, borrower.city, borrower.state, borrower.pincode]
    .filter(Boolean).join(', ');

  const bPhone = (borrower?.phone || '').toString().replace(/\D/g, '');

  const linkedFDs = (fixedDeposits || []).filter(fd => (
    (fd.borrower_id && fd.borrower_id === borrower.id) ||
    (!fd.borrower_id && (fd.phone || '').toString().replace(/\D/g, '') === bPhone && bPhone) ||
    (fd.customer_name && borrower.full_name && fd.customer_name.trim().toLowerCase() === borrower.full_name.trim().toLowerCase())
  ));

  const linkedRDs = (recurringDeposits || []).filter(rd => (
    (rd.borrower_id && rd.borrower_id === borrower.id) ||
    (!rd.borrower_id && (rd.phone || '').toString().replace(/\D/g, '') === bPhone && bPhone) ||
    (rd.customer_name && borrower.full_name && rd.customer_name.trim().toLowerCase() === borrower.full_name.trim().toLowerCase())
  ));

  const totalFdHeld = linkedFDs.reduce((s, fd) => s + Number(fd.principal_amount || 0), 0);
  const totalRdHeld = linkedRDs.reduce((s, rd) => s + Number(rd.total_deposited || (rd.monthly_installment * (rd.paid_installments_count || 0)) || 0), 0);

  const loanGuarantor = inspectedLoan ? (typeof inspectedLoan.guarantor === 'string' ? (() => { try { return JSON.parse(inspectedLoan.guarantor); } catch { return { name: inspectedLoan.guarantor }; } })() : (inspectedLoan.guarantor || null)) : null;
  const loanNominee = inspectedLoan ? (typeof inspectedLoan.nominee === 'string' ? (() => { try { return JSON.parse(inspectedLoan.nominee); } catch { return null; } })() : (inspectedLoan.nominee || null)) : null;
  const loanSecurity = inspectedLoan ? (typeof inspectedLoan.security === 'string' ? (() => { try { return JSON.parse(inspectedLoan.security); } catch { return null; } })() : (inspectedLoan.security || null)) : null;

  const combinedDocs = [
    ...borrowerDocs,
    ...((loanGuarantor?.files || []).map((f, i) => ({ id: `g-doc-${i}`, name: f.name || 'Guarantor Proof', category: 'GUARANTOR', url: f.url, mime: f.type }))),
    ...((loanNominee?.files || []).map((f, i) => ({ id: `n-doc-${i}`, name: f.name || 'Nominee Document', category: 'NOMINEE', url: f.url, mime: f.type }))),
    ...((loanSecurity?.details?.files || []).map((f, i) => ({ id: `s-doc-${i}`, name: f.name || 'Security Deed/Doc', category: 'SECURITY', url: f.url, mime: f.type })))
  ];

  const docs = combinedDocs;
  const activeDoc = docs.find(d => d.id === selectedDocId) || docs[0] || null;
  const activeIsImage = activeDoc?.url && (
    (activeDoc?.mime || '').startsWith('image/') ||
    activeDoc.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
    activeDoc.url.startsWith('data:image') ||
    activeDoc.url.match(/\.(jpg|jpeg|png|gif|webp)/i)
  );

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

        {/* Top Close Button */}
        <button
          type="button"
          className="cpx-close"
          onClick={onClose}
          title={t('cp.close_profile')}
        >
          <X style={{ width: 17, height: 17 }} />
        </button>

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
            {linkedFDs.length > 0 && (
              <div className="cpx-stat">
                <Landmark style={{ width: 15, height: 15, color: '#60A5FA' }} />
                <div>
                  <strong style={{ color: '#60A5FA' }}>₹{fmt(totalFdHeld)}</strong>
                  <span>Fixed Deposits ({linkedFDs.length})</span>
                </div>
              </div>
            )}
            {linkedRDs.length > 0 && (
              <div className="cpx-stat">
                <Wallet style={{ width: 15, height: 15, color: '#C084FC' }} />
                <div>
                  <strong style={{ color: '#C084FC' }}>₹{fmt(totalRdHeld)}</strong>
                  <span>Recurring Deposits ({linkedRDs.length})</span>
                </div>
              </div>
            )}
          </div>

          <div className="cpx-portrait-actions">
            <button
              type="button"
              className="cpx-btn cpx-btn--light"
              onClick={() => setShowCustomerLedgerSheet(true)}
              title="Print complete financial year ledger statement of all customer transactions"
            >
              <Printer style={{ width: 13, height: 13 }} />
              <span>Print Customer Ledger</span>
            </button>
            <button type="button" className="cpx-btn cpx-btn--light" onClick={onEdit}>
              <Pencil style={{ width: 13, height: 13 }} />
              <span>{t('cp.edit_profile')}</span>
            </button>
          </div>
        </aside>

        {/* ── RIGHT: Modern Executive Detail Panel ───────────────────────── */}
        <section className="cpx-detail-panel">
          <div className="cpx-detail-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 60 }}>
            <div>
              <h3>{t('cp.record_title')}</h3>
              <p>{t('cp.record_subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCustomerLedgerSheet(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 6,
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                color: '#0F172A',
                fontSize: '0.74rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Printer style={{ width: 13, height: 13, color: 'var(--brand-primary, #15803D)' }} />
              <span>Print FY Ledger</span>
            </button>
          </div>

          <div className="cpx-detail-body">

            {/* Associated Loans at top */}
            <div className="cpx-card-section">
              <div className="cpx-card-section-head" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CreditCard style={{ width: 14, height: 14, color: 'var(--brand-primary, #15803D)' }} />
                  <h4>{t('cp.associated_loans')} ({borrower.loansList?.length || 0})</h4>
                </div>
                {inspectedLoan && (
                  <button
                    type="button"
                    onClick={() => { setInspectedLoan(null); }}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: 'var(--brand-primary, #15803D)',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    View All Loans
                  </button>
                )}
              </div>
              {(!borrower.loansList || borrower.loansList.length === 0) ? (
                <div className="cpx-empty">{t('cp.no_loans')}</div>
              ) : (
                <div className="cpx-loans">
                  {borrower.loansList.map(loan => {
                    const freq = loan.repayment_frequency || 'DAILY';
                    const emiSuffix = freq === 'MONTHLY' ? '/month' : freq === 'WEEKLY' ? '/week' : t('cp.per_day');
                    const isSelected = inspectedLoan?.id === loan.id;
                    return (
                      <div
                        className={`cpx-loan-row ${isSelected ? 'is-selected' : ''}`}
                        key={loan.id}
                        onClick={() => {
                          setInspectedLoan(isSelected ? null : loan);
                          setSelectedDocId(null);
                        }}
                        style={{
                          cursor: 'pointer',
                          border: isSelected ? '1.5px solid var(--brand-primary, #15803D)' : '1px solid #E2E8F0',
                          background: isSelected ? 'var(--brand-primary-light, #F0FEF5)' : '#FFFFFF',
                          transition: 'all 0.15s ease'
                        }}
                        title="Click to view loan application details, guarantor, and submitted documents"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <strong style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: isSelected ? 'var(--brand-primary, #15803D)' : '#0F172A', display: 'block' }}>
                              {loan.loan_account_no}
                            </strong>
                            <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block' }}>
                              {t('cp.disbursed')} ₹{fmt(loan.principal_amount)} • EMI ₹{fmt(loan.installment_amount)}{emiSuffix}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div className={`cpx-loan-pending ${loan.pending_amount > 0 ? 'danger' : 'success'}`}>
                            ₹{fmt(loan.pending_amount)}
                          </div>
                          <ChevronRight style={{ width: 14, height: 14, color: isSelected ? 'var(--brand-primary, #15803D)' : '#94A3B8' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Inspected Loan Application Summary Card */}
              {inspectedLoan && (
                <div style={{
                  marginTop: 12,
                  padding: 14,
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FileText style={{ width: 14, height: 14, color: 'var(--brand-primary, #15803D)' }} />
                      <strong style={{ fontSize: '0.8rem', color: '#0F172A' }}>
                        Loan Application: {inspectedLoan.loan_account_no}
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLoanAppSheet(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '5px 10px',
                        borderRadius: 6,
                        background: 'var(--brand-primary, #15803D)',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <Printer style={{ width: 12, height: 12 }} />
                      <span>Print Application Form</span>
                    </button>
                  </div>

                  <div className="cpx-grid" style={{ marginBottom: 8 }}>
                    <Field label="Sanctioned Principal" value={`₹${fmt(inspectedLoan.principal_amount)}`} />
                    <Field label="Total Payable" value={`₹${fmt(inspectedLoan.total_payable)}`} />
                    <Field label="Interest Rate" value={inspectedLoan.monthly_interest_rate ? `${inspectedLoan.monthly_interest_rate}% /month` : '—'} />
                    <Field label="Loan Purpose" value={inspectedLoan.purpose || 'General Credit'} />
                  </div>

                  {/* Guarantor Details */}
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Users style={{ width: 13, height: 13, color: 'var(--brand-primary, #15803D)' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A' }}>Guarantor Details</span>
                    </div>
                    <div className="cpx-grid">
                      <Field label="Guarantor Name" value={loanGuarantor?.name || (typeof inspectedLoan.guarantor === 'string' && !inspectedLoan.guarantor.startsWith('{') ? inspectedLoan.guarantor : '') || borrower.guarantor_name} />
                      <Field label="Relationship" value={loanGuarantor?.final_relationship || loanGuarantor?.relationship || 'Guarantor'} />
                      <Field label="Mobile Number" value={loanGuarantor?.mobile || borrower.guarantor_phone} />
                      <Field label="ID Proof" value={loanGuarantor?.id_proof_number ? `${loanGuarantor.id_proof_type || 'Aadhaar'}: ${loanGuarantor.id_proof_number}` : '—'} />
                    </div>
                  </div>

                  {/* Nominee Details */}
                  {(loanNominee || borrower.nominee_name) && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Users style={{ width: 13, height: 13, color: '#7C3AED' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A' }}>Nominee Details</span>
                      </div>
                      <div className="cpx-grid">
                        <Field label="Nominee Name" value={loanNominee?.name || borrower.nominee_name} />
                        <Field label="Relationship" value={loanNominee?.final_relationship || loanNominee?.relationship || borrower.nominee_relation || 'Nominee'} />
                        <Field label="Mobile Number" value={loanNominee?.mobile || borrower.nominee_phone} />
                        <Field label="ID Proof" value={loanNominee?.id_proof_number ? `${loanNominee.id_proof_type || 'Aadhaar'}: ${loanNominee.id_proof_number}` : '—'} />
                      </div>
                    </div>
                  )}

                  {/* Security Collateral */}
                  {loanSecurity?.type && loanSecurity.type !== 'NOMINEE' && loanSecurity.type !== 'NONE' && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Shield style={{ width: 13, height: 13, color: '#2563EB' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A' }}>Pledged Collateral ({loanSecurity.type})</span>
                      </div>
                      <div className="cpx-grid">
                        {loanSecurity.type === 'PROPERTY' && (
                          <>
                            <Field label="Property Type" value={loanSecurity.details?.final_type || loanSecurity.details?.type} />
                            <Field label="Survey Number" value={loanSecurity.details?.survey_number} />
                            <Field label="Valuation" value={`₹${fmt(loanSecurity.details?.market_value)}`} />
                          </>
                        )}
                        {loanSecurity.type === 'VEHICLE' && (
                          <>
                            <Field label="RC Number" value={loanSecurity.details?.rc_number} />
                            <Field label="Make & Model" value={loanSecurity.details?.make_model} />
                            <Field label="RC Owner" value={loanSecurity.details?.rc_owner_name} />
                          </>
                        )}
                        {loanSecurity.type === 'CHEQUE' && (
                          <>
                            <Field label="Bank" value={loanSecurity.details?.bank_name} />
                            <Field label="Account No" value={loanSecurity.details?.account_number} />
                            <Field label="Cheque Range" value={loanSecurity.details?.cheque_number_range} />
                          </>
                        )}
                        {loanSecurity.type === 'OTHERS' && (
                          <Field label="Description" value={loanSecurity.details?.description} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Linked Fixed Deposits (FD) Section */}
            {linkedFDs.length > 0 && (
              <div className="cpx-card-section">
                <div className="cpx-card-section-head">
                  <Landmark style={{ width: 14, height: 14, color: '#2563EB' }} />
                  <h4 style={{ color: '#2563EB' }}>Linked Fixed Deposits ({linkedFDs.length})</h4>
                </div>
                <div className="cpx-loans">
                  {linkedFDs.map(fd => (
                    <div
                      className="cpx-loan-row"
                      key={fd.id}
                      style={{ border: '1px solid #E2E8F0', background: '#FFFFFF' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <strong style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#2563EB', display: 'block' }}>
                            {fd.fd_account_no}
                          </strong>
                          <span style={{ fontSize: '0.64rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#DBEAFE', color: '#1D4ED8' }}>
                            {fd.status || 'ACTIVE'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block' }}>
                          Deposit: ₹{fmt(fd.principal_amount)} • {fd.tenure_months || 12}M @ {fd.interest_rate}% p.a. • Maturity: ₹{fmt(fd.maturity_amount || fd.principal_amount)}
                        </span>
                        {fd.reference && (
                          <span style={{ fontSize: '0.68rem', color: '#475569', background: '#F1F5F9', padding: '1px 6px', borderRadius: 4, width: 'fit-content' }}>
                            Ref: {fd.reference}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                          {String(fd.deposit_date || fd.created_at || '').slice(0, 10)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Linked Recurring Deposits (RD) Section */}
            {linkedRDs.length > 0 && (
              <div className="cpx-card-section">
                <div className="cpx-card-section-head">
                  <Wallet style={{ width: 14, height: 14, color: '#7C3AED' }} />
                  <h4 style={{ color: '#7C3AED' }}>Linked Recurring Deposits ({linkedRDs.length})</h4>
                </div>
                <div className="cpx-loans">
                  {linkedRDs.map(rd => (
                    <div
                      className="cpx-loan-row"
                      key={rd.id}
                      style={{ border: '1px solid #E2E8F0', background: '#FFFFFF' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <strong style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#7C3AED', display: 'block' }}>
                            {rd.rd_account_no}
                          </strong>
                          <span style={{ fontSize: '0.64rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#F3E8FF', color: '#7E22CE' }}>
                            {rd.status || 'ACTIVE'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block' }}>
                          Monthly: ₹{fmt(rd.monthly_installment)} • {rd.tenure_months}M ({rd.paid_installments_count || 0} Paid) • Total: ₹{fmt(rd.total_deposited || (rd.monthly_installment * (rd.paid_installments_count || 0)))}
                        </span>
                        {rd.reference && (
                          <span style={{ fontSize: '0.68rem', color: '#475569', background: '#F1F5F9', padding: '1px 6px', borderRadius: 4, width: 'fit-content' }}>
                            Ref: {rd.reference}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                          {String(rd.start_date || rd.created_at || '').slice(0, 10)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

      {showLoanAppSheet && inspectedLoan && (
        <PrintableLoanApplicationSheet
          applicationData={inspectedLoan}
          borrowerData={borrower}
          tenant={tenant}
          onClose={() => setShowLoanAppSheet(false)}
        />
      )}

      {showCustomerLedgerSheet && (
        <PrintableCustomerLedgerSheet
          borrower={borrower}
          tenant={tenant}
          collections={collections}
          fixedDeposits={fixedDeposits}
          recurringDeposits={recurringDeposits}
          journalEntries={journalEntries}
          onClose={() => setShowCustomerLedgerSheet(false)}
        />
      )}
    </div>
  );
}
