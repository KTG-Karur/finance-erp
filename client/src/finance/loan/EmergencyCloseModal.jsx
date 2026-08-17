import React, { useState } from 'react';
import {
  X, AlertTriangle, CheckCircle2, ShieldAlert, FileText,
  DollarSign, ArrowRight, Building2
} from 'lucide-react';
import api from '../../api/client';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import SharedDropdown from '../../components/common/SharedDropdown';
import SharedDatePicker from '../../components/common/SharedDatePicker';

const fmt = n => Number(n || 0).toLocaleString('en-IN');

export const EMERGENCY_REASONS = [
  { id: 'COMPROMISE_SETTLEMENT', label: 'One-Time Settlement (OTS) / Compromise Recovery' },
  { id: 'BORROWER_DEMISE', label: 'Borrower Demise / Deceased (Compassionate Closing)' },
  { id: 'INSOLVENCY', label: 'Borrower Insolvency / Bankruptcy' },
  { id: 'DISASTER_LOSS', label: 'Natural Calamity / Business Loss Disaster' },
  { id: 'DEFAULT_WRITE_OFF', label: 'Irrecoverable Default / Bad Debt Write-Off' },
  { id: 'MANAGEMENT_APPROVAL', label: 'Special Management Discretionary Approval' }
];

export default function EmergencyCloseModal({
  loan,
  onClose,
  onSuccess,
  onSwitchToPreclosure
}) {
  const { t } = useLanguage();
  const today = new Date().toISOString().slice(0, 10);

  const pendingBalance = Number(loan?.pending_amount || 0);

  const [closedDate, setClosedDate] = useState(today);
  const [recoveryAmount, setRecoveryAmount] = useState(0);
  const [reasonCategory, setReasonCategory] = useState('COMPROMISE_SETTLEMENT');
  const [reasonDetails, setReasonDetails] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [transactionRef, setTransactionRef] = useState('');
  const [confirmUnderstood, setConfirmUnderstood] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const writtenOffLoss = Math.max(0, pendingBalance - Number(recoveryAmount || 0));

  const handleExecuteEmergencyClose = async (e) => {
    e?.preventDefault();
    if (!confirmUnderstood) {
      setError('Please check the confirmation box acknowledging this irreversible account termination.');
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await api.post(`/finance/loans/${loan.id}/emergency-close`, {
        closed_date: closedDate,
        recovery_amount: Number(recoveryAmount || 0),
        reason_category: reasonCategory,
        reason_details: reasonDetails,
        payment_mode: paymentMode,
        transaction_ref: transactionRef
      });

      if (res.data?.success) {
        onSuccess?.(res.data.data);
        onClose();
      } else {
        setError(res.data?.message || 'Emergency closing failed.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to execute emergency closure.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: 14,
        maxWidth: 540,
        width: '100%',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'InterVariable, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#0F172A'
      }}>
        
        {/* Modal Header */}
        <div style={{
          padding: '16px 22px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#FEF2F2'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#FEE2E2',
              border: '1px solid #FECACA',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldAlert style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#991B1B' }}>
                Emergency & Compromise Loan Closing
              </h3>
              <span style={{ fontSize: '0.74rem', color: '#7F1D1D' }}>
                Account: <strong>{loan?.loan_account_no}</strong> | {loan?.borrower_name}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#FFFFFF',
              border: '1px solid #FECACA',
              color: '#991B1B',
              width: 30,
              height: 30,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleExecuteEmergencyClose} style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {onSwitchToPreclosure && (
            <div style={{
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: 8,
              padding: '9px 13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10
            }}>
              <div>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#15803D', display: 'block' }}>
                  Want standard full payoff instead of loss write-off?
                </span>
                <span style={{ fontSize: '0.71rem', color: '#166534' }}>
                  Preclose account with complete EMI or Principal + Interest collection.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSwitchToPreclosure(loan);
                }}
                style={{
                  background: '#15803D',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 6,
                  padding: '5px 12px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Change to Pre-closing →
              </button>
            </div>
          )}

          {/* Warning Banner */}
          <div style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 8,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10
          }}>
            <AlertTriangle style={{ width: 18, height: 18, color: '#D97706', marginTop: 1, flexShrink: 0 }} />
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#92400E', display: 'block' }}>
                Irreversible Account Termination
              </span>
              <span style={{ fontSize: '0.73rem', color: '#78350F', lineHeight: 1.4 }}>
                This will immediately mark the loan as <strong>CLOSED</strong>. Any unrecovered balance will be posted to the <strong>Bad Debt / Loss Provision Expense</strong> ledger.
              </span>
            </div>
          </div>

          {/* Current Outstanding Balance Card */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Current Pending Balance
              </span>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#DC2626' }}>
                ₹{fmt(pendingBalance)}
              </div>
            </div>

            <div style={{ textAlign: 'right', fontSize: '0.74rem', color: '#64748B' }}>
              Principal: <strong>₹{fmt(loan?.principal_amount)}</strong><br />
              Already Collected: <strong>₹{fmt(loan?.collected_amount)}</strong>
            </div>
          </div>

          {/* Compromise Recovery & Write-off Split */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Compromise Recovery Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                max={pendingBalance}
                value={recoveryAmount}
                onChange={(e) => setRecoveryAmount(Math.max(0, Math.min(pendingBalance, Number(e.target.value))))}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 7,
                  border: '1px solid #CBD5E1',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block', marginTop: 2 }}>
                Amount customer or guarantor is paying
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Calculated Write-Off Loss (₹)
              </label>
              <div style={{
                padding: '8px 10px',
                borderRadius: 7,
                border: '1px solid #FECACA',
                background: '#FEF2F2',
                fontSize: '0.86rem',
                fontWeight: 800,
                color: '#DC2626'
              }}>
                ₹{fmt(writtenOffLoss)}
              </div>
              <span style={{ fontSize: '0.68rem', color: '#991B1B', display: 'block', marginTop: 2 }}>
                Posted to Bad Debt Expense
              </span>
            </div>
          </div>

          {/* Reason Category Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              Reason Category *
            </label>
            <SharedDropdown
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
              options={EMERGENCY_REASONS.map(r => ({ value: r.id, label: r.label }))}
            />
          </div>

          {/* Date & Payment Mode */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Closure Date *
              </label>
              <SharedDatePicker
                value={closedDate}
                onChange={(e) => setClosedDate(e.target.value)}
                max={today}
                buttonStyle={{ height: 36 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Payment Mode (if recovery &gt; 0)
              </label>
              <SharedDropdown
                value={paymentMode}
                disabled={recoveryAmount <= 0}
                onChange={(e) => setPaymentMode(e.target.value)}
                options={[
                  { value: 'CASH', label: 'Cash in Hand' },
                  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                  { value: 'UPI', label: 'UPI / Online' },
                  { value: 'CHEQUE', label: 'Cheque' }
                ]}
              />
            </div>
          </div>

          {/* Reason Details & Audit Explanation */}
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              Detailed Audit Explanation / Authorization Note *
            </label>
            <textarea
              rows={2}
              required
              value={reasonDetails}
              onChange={(e) => setReasonDetails(e.target.value)}
              placeholder="Provide reason, management approval memo reference, or dispute settlement terms..."
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 7,
                border: '1px solid #CBD5E1',
                fontSize: '0.82rem',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                resize: 'none'
              }}
            />
          </div>

          {/* Confirmation Checkbox */}
          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: '10px 12px',
            borderRadius: 7,
            border: '1px solid #E2E8F0',
            background: '#F8FAFC',
            cursor: 'pointer',
            userSelect: 'none'
          }}>
            <input
              type="checkbox"
              checked={confirmUnderstood}
              onChange={(e) => setConfirmUnderstood(e.target.checked)}
              style={{ marginTop: 2, accentColor: '#DC2626' }}
            />
            <span style={{ fontSize: '0.75rem', color: '#334155', lineHeight: 1.35 }}>
              I confirm that I have verified the circumstances and have management authorization to execute this emergency closure and write-off.
            </span>
          </label>

          {error && (
            <div style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#991B1B',
              padding: '8px 12px',
              borderRadius: 7,
              fontSize: '0.78rem'
            }}>
              {error}
            </div>
          )}

          {/* Modal Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                background: '#FFFFFF',
                color: '#475569',
                border: '1px solid #CBD5E1',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || !confirmUnderstood}
              style={{
                background: '#DC2626',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                padding: '8px 20px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: (submitting || !confirmUnderstood) ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)',
                opacity: (submitting || !confirmUnderstood) ? 0.6 : 1
              }}
            >
              <ShieldAlert style={{ width: 15, height: 15 }} />
              <span>{submitting ? 'Executing Write-Off...' : 'Authorize Emergency Close'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
