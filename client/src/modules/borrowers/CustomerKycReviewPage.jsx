import React, { useState } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  User,
  Phone,
  MapPin,
  Briefcase,
  Users,
  FileCheck2,
  FileWarning,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';

const ID_PROOF_LABELS = {
  AADHAAR: 'Aadhaar Card',
  VOTER_ID: 'Voter ID',
  PASSPORT: 'Passport',
  DRIVING_LICENSE: 'Driving License'
};

function StatusBadge({ status }) {
  const map = {
    VERIFIED: { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0', icon: ShieldCheck, label: 'VERIFIED' },
    REJECTED: { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA', icon: ShieldAlert, label: 'REJECTED' },
    PENDING: { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A', icon: ShieldQuestion, label: 'PENDING REVIEW' }
  };
  const cfg = map[status] || map.PENDING;
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 20,
      fontSize: '0.75rem', fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      letterSpacing: '0.02em'
    }}>
      <Icon style={{ width: 14, height: 14 }} />
      <span>{cfg.label}</span>
    </span>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #F1F5F9' }}>
        <Icon style={{ width: 15, height: 15, color: '#059669' }} />
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>{title}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A' }}>{value || '—'}</span>
    </div>
  );
}

function DocRow({ label, present }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 10
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {present ? <FileCheck2 style={{ width: 15, height: 15, color: '#059669' }} /> : <FileWarning style={{ width: 15, height: 15, color: '#CBD5E1' }} />}
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>{label}</span>
      </div>
      <span style={{
        fontSize: '0.68rem', fontWeight: 700, padding: '2px 9px', borderRadius: 20,
        background: present ? '#ECFDF5' : '#F1F5F9', color: present ? '#047857' : '#94A3B8',
        border: `1px solid ${present ? '#A7F3D0' : '#E2E8F0'}`
      }}>
        {present ? 'ON FILE' : 'NOT PROVIDED'}
      </span>
    </div>
  );
}

export default function CustomerKycReviewPage({ borrower, onBack, onVerify, onReject }) {
  const [confirmingVerify, setConfirmingVerify] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  if (!borrower) return null;

  const fullAddress = [borrower.address_line1, borrower.address_line2, borrower.city, borrower.state, borrower.pincode].filter(Boolean).join(', ');

  const handleVerify = async () => {
    setSubmitting(true);
    setActionError('');
    try {
      await onVerify(borrower.id);
      setConfirmingVerify(false);
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Unable to verify KYC. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      setRejectError('Please provide a rejection reason (at least 5 characters).');
      return;
    }
    setSubmitting(true);
    setActionError('');
    try {
      await onReject(borrower.id, rejectReason.trim());
      setRejecting(false);
      setRejectReason('');
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Unable to reject KYC. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{
        background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(15,23,42,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={onBack}
            style={{
              width: 36, height: 36, borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC',
              color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }}
            title="Back to Customer Directory"
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                {borrower.full_name}
              </h1>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontFamily: 'monospace', fontWeight: 600 }}>{borrower.borrower_code}</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '3px 0 0 0' }}>KYC Verification Review</p>
          </div>
        </div>
        <StatusBadge status={borrower.kyc_status} />
      </div>

      {actionError && (
        <div className="form-alert form-alert--error" style={{ margin: 0 }}>
          <AlertTriangle style={{ width: 14, height: 14 }} />
          <span>{actionError}</span>
        </div>
      )}

      {borrower.kyc_status === 'REJECTED' && borrower.kyc_rejection_reason && (
        <div className="form-alert" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', margin: 0 }}>
          <ShieldAlert style={{ width: 14, height: 14 }} />
          <span><strong>Rejection reason:</strong> {borrower.kyc_rejection_reason}{borrower.kyc_reviewed_by ? ` — reviewed by ${borrower.kyc_reviewed_by}` : ''}{borrower.kyc_reviewed_at ? ` on ${borrower.kyc_reviewed_at}` : ''}</span>
        </div>
      )}

      {borrower.kyc_status === 'VERIFIED' && (
        <div className="form-alert" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', margin: 0 }}>
          <ShieldCheck style={{ width: 14, height: 14 }} />
          <span>
            Verified{borrower.kyc_reviewed_by ? ` by ${borrower.kyc_reviewed_by}` : ''} on {borrower.kyc_verified_at || '—'}
            {borrower.kyc_expiry_date ? ` · Valid until ${borrower.kyc_expiry_date}` : ''}
          </span>
        </div>
      )}

      <Section icon={User} title="Personal Details">
        <Field label="Full Name" value={borrower.full_name} />
        <Field label="Date of Birth" value={borrower.dob} />
        <Field label="Gender" value={borrower.gender} />
        <Field label="Occupation" value={borrower.occupation} />
        <Field label="Monthly Income" value={borrower.monthly_income ? `₹${Number(borrower.monthly_income).toLocaleString('en-IN')}` : ''} />
        <Field label="Employer" value={borrower.employer_name} />
      </Section>

      <Section icon={Phone} title="Contact Details">
        <Field label="Mobile Phone" value={borrower.phone} />
        <Field label="Alternate Phone" value={borrower.alt_phone} />
        <Field label="Email" value={borrower.email} />
        <Field label="Branch" value={borrower.branch} />
      </Section>

      <Section icon={MapPin} title="Address">
        <Field label="Full Address" value={fullAddress} />
        <Field label="City" value={borrower.city} />
        <Field label="State" value={borrower.state} />
        <Field label="Pincode" value={borrower.pincode} />
      </Section>

      <Section icon={Users} title="Guarantor & Nominee">
        <Field label="Guarantor Name" value={borrower.guarantor_name} />
        <Field label="Guarantor Phone" value={borrower.guarantor_phone} />
        <Field label="Nominee Name" value={borrower.nominee_name} />
        <Field label="Nominee Relation" value={borrower.nominee_relation} />
      </Section>

      {/* KYC Documents */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #F1F5F9' }}>
          <FileCheck2 style={{ width: 15, height: 15, color: '#059669' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>KYC Identity Documents</span>
        </div>
        <div style={{ marginBottom: 12 }}>
          <Field label="Primary ID Proof Submitted" value={ID_PROOF_LABELS[borrower.id_proof_type] || 'Aadhaar Card'} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 12 }}>
          <DocRow label={`Aadhaar Card ${borrower.aadhaar_number ? `(•• ${borrower.aadhaar_number.slice(-4)})` : ''}`} present={Boolean(borrower.aadhaar_number)} />
          <DocRow label={`PAN Card ${borrower.pan_number ? `(${borrower.pan_number})` : ''}`} present={Boolean(borrower.pan_number)} />
          <DocRow label="Address Proof" present={Boolean(borrower.address_line1)} />
        </div>
        <p style={{ fontSize: '0.72rem', color: '#94A3B8', margin: 0, fontStyle: 'italic' }}>
          Document image upload/storage is not yet available — verification should be performed against the physical or scanned copies collected during onboarding.
        </p>
      </div>

      {/* Action Bar */}
      {borrower.kyc_status === 'PENDING' && (
        <div style={{
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '18px 20px',
          display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 1px 3px rgba(15,23,42,0.04)'
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>KYC Decision</div>

          {!confirmingVerify && !rejecting && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setConfirmingVerify(true); setRejecting(false); }}
                style={{
                  flex: 1, height: 42, border: 'none', background: '#059669', color: '#FFFFFF', borderRadius: 10,
                  fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8, boxShadow: '0 2px 6px rgba(5,150,105,0.25)'
                }}
              >
                <CheckCircle2 style={{ width: 16, height: 16 }} />
                <span>Verify KYC</span>
              </button>
              <button
                onClick={() => { setRejecting(true); setConfirmingVerify(false); }}
                style={{
                  flex: 1, height: 42, border: '1px solid #FECACA', background: '#FFFFFF', color: '#DC2626', borderRadius: 10,
                  fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8
                }}
              >
                <XCircle style={{ width: 16, height: 16 }} />
                <span>Reject KYC</span>
              </button>
            </div>
          )}

          {confirmingVerify && (
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: '0.8rem', color: '#065F46', margin: 0, fontWeight: 500 }}>
                Confirm that all KYC documents for <strong>{borrower.full_name}</strong> have been reviewed and are valid. This will mark the customer as KYC Verified for 2 years.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setConfirmingVerify(false)} disabled={submitting} className="btn-cancel" style={{ padding: '8px 16px' }}>
                  Cancel
                </button>
                <button
                  onClick={handleVerify}
                  disabled={submitting}
                  style={{
                    border: 'none', background: '#059669', color: '#FFFFFF', borderRadius: 8, padding: '8px 18px',
                    fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6
                  }}
                >
                  {submitting ? <Loader2 className="spin" style={{ width: 14, height: 14 }} /> : <CheckCircle2 style={{ width: 14, height: 14 }} />}
                  <span>{submitting ? 'Verifying...' : 'Confirm Verification'}</span>
                </button>
              </div>
            </div>
          )}

          {rejecting && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Rejection Reason *
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => { setRejectReason(e.target.value); setRejectError(''); }}
                placeholder="e.g. Aadhaar photo mismatch, PAN number does not match records, address proof expired..."
                className="input-control"
                style={{ height: 'auto', padding: '10px 12px', background: '#FFFFFF' }}
              />
              {rejectError && <span className="field-error">{rejectError}</span>}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => { setRejecting(false); setRejectReason(''); setRejectError(''); }} disabled={submitting} className="btn-cancel" style={{ padding: '8px 16px' }}>
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={submitting}
                  style={{
                    border: 'none', background: '#DC2626', color: '#FFFFFF', borderRadius: 8, padding: '8px 18px',
                    fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6
                  }}
                >
                  {submitting ? <Loader2 className="spin" style={{ width: 14, height: 14 }} /> : <XCircle style={{ width: 14, height: 14 }} />}
                  <span>{submitting ? 'Rejecting...' : 'Confirm Rejection'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
