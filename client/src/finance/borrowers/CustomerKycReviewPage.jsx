import React, { useState } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  User,
  Phone,
  MapPin,
  FileCheck2,
  FileWarning,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Download,
  Eye,
  Check,
  FileText
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

function StatusBadge({ status }) {
  const { t } = useLanguage();
  const map = {
    VERIFIED: { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0', icon: ShieldCheck, label: t('kyc.verified') },
    REJECTED: { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA', icon: ShieldAlert, label: t('kyc.rejected') },
    PENDING: { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A', icon: ShieldQuestion, label: t('kyc.pending_review') }
  };
  const cfg = map[status] || map.PENDING;
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20,
      fontSize: '0.75rem', fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      letterSpacing: '0.02em', textTransform: 'uppercase'
    }}>
      <Icon style={{ width: 14, height: 14 }} />
      <span>{cfg.label}</span>
    </span>
  );
}

export default function CustomerKycReviewPage({ borrower, onBack, onVerify, onReject }) {
  const { t } = useLanguage();
  const REJECTION_CATEGORIES = [
    { id: 'BLURRY_DOCUMENT', label: t('kycr.cat_blurry') },
    { id: 'NAME_MISMATCH', label: t('kycr.cat_name_mismatch') },
    { id: 'EXPIRED_PROOF', label: t('kycr.cat_expired') },
    { id: 'INCOMPLETE_ATTACHMENT', label: t('kycr.cat_incomplete') },
    { id: 'OTHER', label: t('kycr.cat_other') }
  ];
  const [confirmingVerify, setConfirmingVerify] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [allowReEvaluate, setAllowReEvaluate] = useState(false);
  const [rejectCategory, setRejectCategory] = useState('BLURRY_DOCUMENT');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  // Interactive Document Viewer State
  const [selectedDocKey, setSelectedDocKey] = useState('profile'); // 'profile' | 'aadhaar_front' | 'aadhaar_back' | 'pan' | 'passbook'
  const [zoomScale, setZoomScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!borrower) return null;

  const docs = borrower.documents || [];
  const getDocUrl = (category) => {
    const d = docs.find(item => item.category === category);
    return d?.url || d?.dataUrl || null;
  };

  const docSources = {
    profile: borrower.profile_image,
    aadhaar_front: getDocUrl('AADHAAR_FRONT'),
    aadhaar_back: getDocUrl('AADHAAR_BACK'),
    pan: getDocUrl('PAN_CARD'),
    passbook: getDocUrl('BANK_PASSBOOK')
  };

  const activeDocSrc = docSources[selectedDocKey] || null;

  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.25, 0.75));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleResetCanvas = () => {
    setZoomScale(1);
    setRotation(0);
  };

  const fullAddress = [borrower.address_line1, borrower.address_line2, borrower.city, borrower.state, borrower.pincode].filter(Boolean).join(', ');

  const handleVerifySubmit = async () => {
    setSubmitting(true);
    setActionError('');
    try {
      await onVerify(borrower.id);
      setConfirmingVerify(false);
      setAllowReEvaluate(false);
    } catch (err) {
      setActionError(err?.response?.data?.message || t('kycr.verify_error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    const categoryLabel = REJECTION_CATEGORIES.find(c => c.id === rejectCategory)?.label || rejectCategory;
    const finalReason = rejectReason.trim() ? `${categoryLabel}: ${rejectReason.trim()}` : categoryLabel;

    setSubmitting(true);
    setActionError('');
    try {
      await onReject(borrower.id, finalReason);
      setRejecting(false);
      setAllowReEvaluate(false);
      setRejectReason('');
    } catch (err) {
      setActionError(err?.response?.data?.message || t('kycr.reject_error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="kyc-review-root">

      {/* ── Top Header Navigation Bar ── */}
      <div className="kyc-review-header">
        <div className="hdr-left">
          <button type="button" onClick={onBack} className="btn-back" title={t('kycr.back_to_directory')}>
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </button>
          <div className="hdr-title-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1>{t('kycr.title')}</h1>
              <span style={{ fontSize: '0.72rem', color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: 12, fontWeight: 700, fontFamily: 'monospace' }}>
                {borrower.borrower_code || 'KTG-CUST-001'}
              </span>
            </div>
            <p>{t('kycr.subtitle')} {borrower.full_name}</p>
          </div>
        </div>

        <div className="hdr-actions">
          <StatusBadge status={borrower.kyc_status} />
        </div>
      </div>

      {actionError && (
        <div className="form-alert form-alert--error" style={{ margin: 0 }}>
          <AlertTriangle style={{ width: 14, height: 14 }} />
          <span>{actionError}</span>
        </div>
      )}

      {/* ── 2-Column Split Workspace ── */}
      <div className="kyc-split-workspace">

        {/* LEFT COLUMN: Interactive Document Inspection Vault */}
        <div className="kyc-doc-vault">
          <div className="vault-head">
            <div className="vault-title">
              <Eye style={{ width: 16, height: 16, color: '#059669' }} />
              <span>{t('cp.canvas_title')}</span>
            </div>
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748B' }}>
              {t('kycr.canvas_hint')}
            </span>
          </div>

          {/* Document Tabs Switcher */}
          <div className="doc-tabs-row">
            <button
              type="button"
              className={`doc-tab ${selectedDocKey === 'profile' ? 'doc-tab--active' : ''}`}
              onClick={() => { setSelectedDocKey('profile'); handleResetCanvas(); }}
            >
              <User style={{ width: 13, height: 13 }} /> {t('kycr.tab_photo')}
            </button>
            <button
              type="button"
              className={`doc-tab ${selectedDocKey === 'aadhaar_front' ? 'doc-tab--active' : ''}`}
              onClick={() => { setSelectedDocKey('aadhaar_front'); handleResetCanvas(); }}
            >
              <FileCheck2 style={{ width: 13, height: 13 }} /> {t('kycr.tab_aadhaar_front')}
            </button>
            <button
              type="button"
              className={`doc-tab ${selectedDocKey === 'aadhaar_back' ? 'doc-tab--active' : ''}`}
              onClick={() => { setSelectedDocKey('aadhaar_back'); handleResetCanvas(); }}
            >
              <FileCheck2 style={{ width: 13, height: 13 }} /> {t('kycr.tab_aadhaar_back')}
            </button>
            <button
              type="button"
              className={`doc-tab ${selectedDocKey === 'pan' ? 'doc-tab--active' : ''}`}
              onClick={() => { setSelectedDocKey('pan'); handleResetCanvas(); }}
            >
              <FileText style={{ width: 13, height: 13 }} /> {t('kycr.tab_pan')}
            </button>
            <button
              type="button"
              className={`doc-tab ${selectedDocKey === 'passbook' ? 'doc-tab--active' : ''}`}
              onClick={() => { setSelectedDocKey('passbook'); handleResetCanvas(); }}
            >
              <FileText style={{ width: 13, height: 13 }} /> {t('kycr.tab_passbook')}
            </button>
          </div>

          {/* High-Tech Canvas Frame */}
          <div className="canvas-frame">
            {activeDocSrc ? (
              <img
                src={activeDocSrc}
                alt="Document Preview"
                style={{
                  transform: `scale(${zoomScale}) rotate(${rotation}deg)`
                }}
              />
            ) : (
              <div className="empty-canvas-text">
                <FileWarning style={{ width: 32, height: 32, color: '#475569' }} />
                <span>{t('kycr.no_doc_uploaded')}</span>
              </div>
            )}

            {/* Interactive Canvas Toolbar */}
            {activeDocSrc && (
              <div className="canvas-toolbar">
                <button type="button" onClick={handleZoomIn} title={t('cp.zoom_in')}>
                  <ZoomIn style={{ width: 15, height: 15 }} />
                </button>
                <span className="zoom-level">{Math.round(zoomScale * 100)}%</span>
                <button type="button" onClick={handleZoomOut} title={t('cp.zoom_out')}>
                  <ZoomOut style={{ width: 15, height: 15 }} />
                </button>
                <button type="button" onClick={handleRotate} title={t('cp.rotate')}>
                  <RotateCw style={{ width: 15, height: 15 }} />
                </button>
                <button type="button" onClick={handleResetCanvas} title={t('cp.reset_view')}>
                  <Maximize2 style={{ width: 15, height: 15 }} />
                </button>
                <a
                  href={activeDocSrc}
                  download={`KYC-${selectedDocKey}-${borrower.full_name}.png`}
                  title={t('cp.download_file')}
                  style={{ color: '#E2E8F0', display: 'flex', alignItems: 'center' }}
                >
                  <Download style={{ width: 15, height: 15 }} />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Verification Checklist & Data Comparison */}
        <div className="kyc-details-pane">

          {/* Customer Overview Card */}
          <div className="profile-overview-card">
            <div className="user-info-flex">
              <div className="avatar-circle">
                {borrower.profile_image ? (
                  <img src={borrower.profile_image} alt={borrower.full_name} />
                ) : (
                  <User style={{ width: 24, height: 24, color: '#059669' }} />
                )}
              </div>
              <div className="user-text">
                <h3>{borrower.full_name}</h3>
                <p>{t('kycr.assigned_branch')} <strong>{borrower.branch || 'Karur Main Branch'}</strong></p>
              </div>
            </div>
            <StatusBadge status={borrower.kyc_status} />
          </div>

          {/* Personal Identity Details Grid */}
          <div className="data-card">
            <div className="card-title">
              <User style={{ width: 14, height: 14, color: '#059669' }} />
              <span>{t('kycr.personal_identity_contact')}</span>
            </div>
            <div className="data-grid">
              <div className="field-box">
                <span className="lbl">{t('kycr.full_name')}</span>
                <span className="val">{borrower.full_name}</span>
              </div>
              <div className="field-box">
                <span className="lbl">{t('cp.father_spouse')}</span>
                <span className="val">{borrower.father_spouse_name || '—'}</span>
              </div>
              <div className="field-box">
                <span className="lbl">{t('cp.dob')}</span>
                <span className="val">{borrower.dob || '—'}</span>
              </div>
              <div className="field-box">
                <span className="lbl">{t('cp.gender')}</span>
                <span className="val">{borrower.gender || 'MALE'}</span>
              </div>
              <div className="field-box">
                <span className="lbl">{t('kycr.primary_mobile')}</span>
                <span className="val val-mono">{borrower.phone || '—'}</span>
              </div>
              <div className="field-box">
                <span className="lbl">{t('kycr.alternate_mobile')}</span>
                <span className="val val-mono">{borrower.alt_phone || '—'}</span>
              </div>
            </div>
          </div>

          {/* Location & Government ID Details Grid */}
          <div className="data-card">
            <div className="card-title">
              <MapPin style={{ width: 14, height: 14, color: '#059669' }} />
              <span>{t('kycr.location_govt_ids')}</span>
            </div>
            <div className="data-grid">
              <div className="field-box" style={{ gridColumn: 'span 2' }}>
                <span className="lbl">{t('kycr.address_line1')}</span>
                <span className="val">{fullAddress || '—'}</span>
              </div>
              <div className="field-box">
                <span className="lbl">{t('kycr.primary_id_type')}</span>
                <span className="val" style={{ fontWeight: 800 }}>{borrower.id_proof_type || 'AADHAAR'}</span>
              </div>
              <div className="field-box">
                <span className="lbl">{t('cp.aadhaar_number')}</span>
                <span className="val val-mono">{borrower.aadhaar_number || '—'}</span>
              </div>
              {borrower.pan_number && (
                <div className="field-box" style={{ gridColumn: 'span 2' }}>
                  <span className="lbl">{t('kycr.pan_card_number')}</span>
                  <span className="val val-mono">{borrower.pan_number}</span>
                </div>
              )}
            </div>
          </div>

          {/* Status Banners for VERIFIED or REJECTED State */}
          {borrower.kyc_status === 'VERIFIED' && (
            <div className="status-banner-card status-banner-card--verified">
              <div className="banner-icon">
                <ShieldCheck style={{ width: 22, height: 22 }} />
              </div>
              <div className="banner-content">
                <h4>{t('kycr.verification_confirmed')}</h4>
                <p>{t('kycr.verified_on')} {borrower.kyc_verified_at || new Date().toISOString().split('T')[0]} {t('kycr.valid_2_years')}</p>
                <div className="meta-pills-row">
                  <span className="pill">{t('kycr.proof_label')} {borrower.id_proof_type || 'Aadhaar Card'}</span>
                  <span className="pill">{t('kycr.identity_authenticated')}</span>
                  <span className="pill">{t('kycr.address_match_validated')}</span>
                  {!allowReEvaluate && (
                    <button
                      type="button"
                      className="btn-re-evaluate"
                      onClick={() => setAllowReEvaluate(true)}
                    >
                      <span>{t('kycr.reevaluate_modify')}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {borrower.kyc_status === 'REJECTED' && (
            <div className="status-banner-card status-banner-card--rejected">
              <div className="banner-icon">
                <ShieldAlert style={{ width: 22, height: 22 }} />
              </div>
              <div className="banner-content">
                <h4>{t('kycr.application_rejected')}</h4>
                <p><strong>{t('kycr.reason_label')}</strong> {borrower.kyc_rejection_reason || t('kycr.default_reject_reason')}</p>
                <div className="meta-pills-row">
                  <span className="pill" style={{ color: '#991B1B', borderColor: '#FECACA', background: '#FEF2F2' }}>
                    {t('kycr.proof_reupload_required')}
                  </span>
                  {!allowReEvaluate && (
                    <button
                      type="button"
                      className="btn-re-evaluate"
                      onClick={() => setAllowReEvaluate(true)}
                    >
                      <CheckCircle2 style={{ width: 13, height: 13, color: '#059669' }} />
                      <span>{t('kycr.reverify_approve')}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Decision Action Panel (Pending Review State or Re-evaluation) */}
          {(borrower.kyc_status === 'PENDING' || !borrower.kyc_status || allowReEvaluate) && (
            <div className="kyc-decision-bar">
              <div className="dec-title">
                {borrower.kyc_status === 'REJECTED' ? t('kycr.reevaluate_rejected') : t('kycr.decision_action')}
              </div>

              {!confirmingVerify && !rejecting && (
                <div className="dec-buttons">
                  <button
                    type="button"
                    className="btn-verify"
                    onClick={() => { setConfirmingVerify(true); setRejecting(false); }}
                  >
                    <CheckCircle2 style={{ width: 16, height: 16 }} />
                    <span>{t('kycr.approve_verify')}</span>
                  </button>
                  <button
                    type="button"
                    className="btn-reject"
                    onClick={() => { setRejecting(true); setConfirmingVerify(false); }}
                  >
                    <XCircle style={{ width: 16, height: 16 }} />
                    <span>{t('kycr.reject_kyc')}</span>
                  </button>
                </div>
              )}

              {/* Confirmation Approve Card */}
              {confirmingVerify && (
                <div className="confirm-approve-box">
                  <p>
                    {t('kycr.confirm_prefix')} <strong>{borrower.full_name}</strong> {t('kycr.confirm_suffix')}
                  </p>
                  <div className="btn-group-right">
                    <button type="button" onClick={() => setConfirmingVerify(false)} disabled={submitting} className="btn-cancel">
                      {t('btn.cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handleVerifySubmit}
                      disabled={submitting}
                      className="btn-confirm"
                    >
                      {submitting ? <Loader2 className="spin" style={{ width: 14, height: 14 }} /> : <CheckCircle2 style={{ width: 14, height: 14 }} />}
                      <span>{submitting ? t('kycr.verifying') : t('kycr.confirm_approval')}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Rejection Reasons Box */}
              {rejecting && (
                <div className="confirm-reject-box">
                  <label>{t('kycr.select_rejection_reason')}</label>
                  <select
                    value={rejectCategory}
                    onChange={(e) => setRejectCategory(e.target.value)}
                    className="input-select"
                  >
                    {REJECTION_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>

                  <textarea
                    rows={2}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder={t('kycr.remarks_placeholder')}
                    className="input-remark"
                  />

                  <div className="btn-group-right">
                    <button type="button" onClick={() => setRejecting(false)} disabled={submitting} className="btn-cancel">
                      {t('btn.cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handleRejectSubmit}
                      disabled={submitting}
                      className="btn-reject-confirm"
                    >
                      {submitting ? <Loader2 className="spin" style={{ width: 14, height: 14 }} /> : <XCircle style={{ width: 14, height: 14 }} />}
                      <span>{submitting ? t('kycr.rejecting') : t('kycr.confirm_rejection')}</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
