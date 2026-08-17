import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Receipt, CheckCircle2, FileText } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { calculatePaymentAllocation } from '../utils/loanCalculations';
import ThermalVoucherModal from './ThermalVoucherModal';
import SharedDropdown from './common/SharedDropdown';
import SharedDatePicker from './common/SharedDatePicker';

export default function CollectionDrawer({ isOpen, onClose, loan, borrowers = [], employees = [], tenant, onSubmit }) {
  const { t } = useLanguage();

  // This component is always mounted (App.jsx renders it unconditionally and
  // toggles `isOpen`/`loan` instead of mounting/unmounting it), so every hook
  // below must run on every render regardless of open state — bailing out
  // early before them (as this used to do) made React call a different
  // number of hooks between the closed and open renders, which corrupts
  // component state on the very transition that matters (closed -> open).
  // All hooks are declared first; the early return comes after every one of
  // them, with loan-dependent values guarded via `loan?.` until then.
  const [amountPaid, setAmountPaid] = useState(loan?.installment_amount || 0);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState('');
  const [collectorName, setCollectorName] = useState('');
  // "Received By" — pick from the real staff list, or type a name manually
  // when the collector isn't in that list.
  const [collectorEntryMode, setCollectorEntryMode] = useState('SELECT'); // 'SELECT' | 'MANUAL'

  // Dynamic Payment Method Fields
  const [upiTxnId, setUpiTxnId] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeBank, setChequeBank] = useState('');
  const [bankRefNo, setBankRefNo] = useState('');

  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (loan) {
      setAmountPaid(loan.installment_amount || 500);
      setReceipt(null);
      setShowReceiptModal(false);
      setSubmitError('');
      setUpiTxnId('');
      setChequeNo('');
      setChequeBank('');
      setBankRefNo('');
      setCollectorEntryMode('SELECT');
      setCollectorName('');
    }
  }, [loan]);

  if (!isOpen || !loan) return null;

  const currentLoan = loan;

  // Find linked borrower profile if available
  const borrowerData = (borrowers || []).find(
    b => b.id === currentLoan.borrower_id || b.phone === currentLoan.phone || b.full_name === currentLoan.borrower_name
  ) || null;

  // Profile image URL or uploaded photo
  const profileImage = currentLoan.photo || currentLoan.profile_image || borrowerData?.photo || borrowerData?.profile_image || null;
  const borrowerName = currentLoan.borrower_name || borrowerData?.full_name || 'Borrower';
  const phoneNo = currentLoan.phone || borrowerData?.phone || borrowerData?.alt_phone || '—';
  const branchLoc = currentLoan.branch || borrowerData?.branch || '—';
  const aadhaarNo = currentLoan.aadhaar || borrowerData?.aadhaar_number || '—';
  const panNo = currentLoan.pan || borrowerData?.pan_number || '—';
  const guarantorName = currentLoan.guarantor || borrowerData?.guarantor_name || '—';

  const dailyEmi = currentLoan.installment_amount || 0;
  const pendingBal = currentLoan.pending_amount || 0;
  const principalAmt = currentLoan.principal_amount || 0;
  const collectedAmt = currentLoan.collected_amount || 0;

  const receivedVal = parseFloat(amountPaid) || 0;

  // Dispatches to the loan's configured Repayment Method (EMI / Interest Only) x
  // Interest Calculation (Constant / Flexible) strategy. Within whatever period or
  // day-window is being settled, interest always comes out first and only the
  // remainder reduces principal — extra amount paid accelerates payoff.
  const allocation = calculatePaymentAllocation({
    loan: currentLoan,
    paymentAmount: receivedVal,
    paymentDate
  });
  const updatedCollectedAmt = collectedAmt + receivedVal;
  const updatedPendingBal = allocation.newPendingPrincipal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (receivedVal <= 0) return;

    setLoading(true);
    setSubmitError('');
    try {
      const modeDetails = paymentMode === 'UPI' ? ` (UPI UTR: ${upiTxnId})`
        : paymentMode === 'CHEQUE' ? ` (Cheque No: ${chequeNo}, Bank: ${chequeBank})`
        : paymentMode === 'BANK_TRANSFER' ? ` (NEFT UTR: ${bankRefNo})`
        : '';

      const res = await onSubmit({
        loan_id: currentLoan.id,
        amount: receivedVal,
        principal_portion: allocation.principalPortion,
        interest_portion: allocation.interestPortion,
        penalty: 0,
        new_principal_balance: updatedPendingBal,
        payment_mode: paymentMode,
        payment_date: paymentDate,
        collection_type: 'DAILY_EMI',
        updated_schedule: allocation.updatedSchedule,
        notes: `${remarks}${modeDetails}`,
        collector_name: collectorName,
        reference_no: upiTxnId || chequeNo || bankRefNo || '',
        branch: branchLoc,
        phone: phoneNo,
        payment_details: {
          upiTxnId,
          chequeNo,
          chequeBank,
          bankRefNo
        }
      });

      setReceipt(res?.data || {
        voucher_no: `JE-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        amount: receivedVal,
        updatedCollectedAmt,
        updatedPendingBal,
        payment_mode: paymentMode,
        mode_ref: upiTxnId || chequeNo || bankRefNo || '',
        collection_date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      });
    } catch (err) {
      console.error(err);
      setSubmitError(err?.response?.data?.message || err?.message || 'Failed to record this payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  const mainModal = (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999999,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: 16,
        boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.25), 0 0 0 1px #E2E8F0',
        width: '100%',
        maxWidth: 840,
        maxHeight: '92vh',
        minHeight: 540,
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif'
      }}>

        {/* ── LEFT PANEL: Borrower Image & Full Profile Details ─────────── */}
        <div style={{
          background: '#F8FAFC',
          borderRight: '1px solid #E2E8F0',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflowY: 'auto'
        }}>
          <div>
            {/* Centered Profile Picture / Initials Avatar */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={borrowerName}
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid var(--brand-primary-border, #A3F5C1)',
                    margin: '0 auto 10px auto',
                    boxShadow: '0 4px 14px rgba(var(--brand-primary-rgb), 0.2)'
                  }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div style={{
                  width: 68,
                  height: 68,
                  borderRadius: '50%',
                  background: 'var(--brand-primary-light, #F0FEF5)',
                  border: '2px solid var(--brand-primary-border, #A3F5C1)',
                  color: 'var(--brand-primary, #15803D)',
                  fontSize: '1.4rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px auto',
                  boxShadow: '0 4px 14px rgba(var(--brand-primary-rgb), 0.15)'
                }}>
                  {(borrowerName || 'C').slice(0, 2).toUpperCase()}
                </div>
              )}

              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#0F172A' }}>
                {borrowerName}
              </h4>

              <span style={{
                display: 'inline-block',
                marginTop: 4,
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: 'var(--brand-primary, #15803D)',
                padding: '2px 10px',
                borderRadius: 20,
                fontSize: '0.72rem',
                fontWeight: 500
              }}>
                {currentLoan.loan_account_no}
              </span>
            </div>

            {/* Borrower Identity & Contact Grid */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 14, marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block', fontWeight: 400 }}>{t('cd.phone')}</span>
                <span style={{ fontSize: '0.82rem', color: '#0F172A', fontWeight: 500, marginTop: 2, display: 'block' }}>{phoneNo}</span>
              </div>

              <div>
                <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block', fontWeight: 400 }}>{t('cd.branch')}</span>
                <span style={{ fontSize: '0.82rem', color: '#0F172A', fontWeight: 500, marginTop: 2, display: 'block' }}>{branchLoc}</span>
              </div>

              <div style={{ gridColumn: 'span 2', height: 1, background: '#F1F5F9' }} />

              <div>
                <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block', fontWeight: 400 }}>{t('cd.aadhaar_uid')}</span>
                <span style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 500, fontFamily: 'monospace', marginTop: 2, display: 'block' }}>{aadhaarNo}</span>
              </div>

              <div>
                <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block', fontWeight: 400 }}>{t('cd.pan_card')}</span>
                <span style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 500, fontFamily: 'monospace', marginTop: 2, display: 'block' }}>{panNo}</span>
              </div>

              {guarantorName !== '—' && (
                <div style={{ gridColumn: 'span 2', paddingTop: 4 }}>
                  <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block', fontWeight: 400 }}>{t('cd.guarantor')}</span>
                  <span style={{ fontSize: '0.8rem', color: '#0F172A', fontWeight: 500, marginTop: 2, display: 'block' }}>{guarantorName}</span>
                </div>
              )}
            </div>

            {/* Account Balance Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('cd.account_balance_details')}
              </span>

              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block', fontWeight: 400 }}>{t('cd.loan_principal')}</span>
                  <span style={{ fontSize: '0.92rem', color: '#0F172A', fontWeight: 600, marginTop: 2, display: 'block' }}>₹{fmt(principalAmt)}</span>
                </div>

                <div>
                  <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block', fontWeight: 400 }}>{t('cd.daily_emi')}</span>
                  <span style={{ fontSize: '0.92rem', color: 'var(--color-info, #2563EB)', fontWeight: 600, marginTop: 2, display: 'block' }}>₹{fmt(dailyEmi)}</span>
                </div>

                <div style={{ gridColumn: 'span 2', height: 1, background: '#F1F5F9' }} />

                <div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--brand-primary-hover, #0E5327)', display: 'block', fontWeight: 500 }}>{t('cd.total_paid')}</span>
                  <span style={{ fontSize: '0.95rem', color: 'var(--brand-primary, #15803D)', fontWeight: 600, marginTop: 2, display: 'block' }}>₹{fmt(collectedAmt)}</span>
                </div>

                <div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-danger-text, #991B1B)', display: 'block', fontWeight: 500 }}>{t('cd.pending_amount')}</span>
                  <span style={{ fontSize: '0.95rem', color: pendingBal > 0 ? 'var(--color-danger, #DC2626)' : 'var(--brand-primary, #15803D)', fontWeight: 600, marginTop: 2, display: 'block' }}>₹{fmt(pendingBal)}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ paddingTop: 14, borderTop: '1px solid #E2E8F0', fontSize: '0.72rem', color: 'var(--brand-primary-hover, #0E5327)', textAlign: 'center', fontWeight: 500 }}>
            {t('cd.active_loan_account')}
          </div>
        </div>

        {/* ── RIGHT PANEL: Collection Entry Form / Success Screen ─────────── */}
        <div style={{
          background: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}>

          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            background: '#FFFFFF',
            zIndex: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Receipt style={{ width: 20, height: 20, color: 'var(--brand-primary, #15803D)' }} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 500, color: '#0F172A' }}>
                {t('cd.record_loan_collection')}
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#F1F5F9',
                border: 'none',
                color: '#64748B',
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* Success Screen with Preview Button */}
          {receipt ? (
            <div style={{ padding: '40px 28px', textAlign: 'center' }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--brand-primary-light, #F0FEF5)',
                border: '1px solid var(--brand-primary-border, #A3F5C1)',
                color: 'var(--brand-primary, #15803D)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto'
              }}>
                <CheckCircle2 style={{ width: 30, height: 30 }} />
              </div>

              <h3 style={{ fontSize: '1.2rem', fontWeight: 500, color: '#0F172A', margin: 0 }}>
                {t('cd.recorded_successfully')}
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748B', marginTop: 6, fontWeight: 400 }}>
                {t('cd.voucher_number')} <span style={{ color: 'var(--brand-primary, #15803D)', fontFamily: 'monospace', fontWeight: 500 }}>{receipt.voucher_no}</span>
              </p>

              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                padding: 20,
                margin: '24px 0',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--brand-primary-hover, #0E5327)', fontWeight: 500 }}>{t('cd.today_paid_amount')}</span>
                  <span style={{ fontSize: '1.1rem', color: 'var(--brand-primary, #15803D)', fontWeight: 500 }}>₹{fmt(receipt.amount || receivedVal)} ✓</span>
                </div>
                <div style={{ height: 1, background: '#E2E8F0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: '#64748B' }}>{t('cd.updated_paid_amount')}</span>
                  <span style={{ color: 'var(--brand-primary, #15803D)', fontWeight: 500 }}>₹{fmt(updatedCollectedAmt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: '#64748B' }}>{t('cd.updated_pending_outstanding')}</span>
                  <span style={{ color: updatedPendingBal > 0 ? 'var(--color-danger, #DC2626)' : 'var(--brand-primary, #15803D)', fontWeight: 500 }}>₹{fmt(updatedPendingBal)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(true)}
                  style={{
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    padding: '11px 22px',
                    borderRadius: 9,
                    fontSize: '0.88rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
                  }}
                >
                  <FileText style={{ width: 17, height: 17, color: '#0F172A' }} />
                  <span>{t('cd.preview_print_voucher')}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    border: 'none',
                    background: 'var(--brand-primary, #15803D)',
                    color: '#FFFFFF',
                    padding: '11px 26px',
                    borderRadius: 9,
                    fontSize: '0.88rem',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  {t('cd.done_close')}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              
              {/* Collection Amount */}
              <div>
                <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 6 }}>
                  {t('cd.collection_amount_rs')}
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: 11, fontSize: '0.98rem', color: 'var(--brand-primary, #15803D)', fontWeight: 500 }}>₹</span>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      height: 44,
                      padding: '0 14px 0 32px',
                      borderRadius: 9,
                      border: '1px solid #CBD5E1',
                      fontSize: '1rem',
                      fontWeight: 500,
                      color: 'var(--brand-primary, #15803D)',
                      background: '#FFFFFF',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Interest / Principal Allocation Breakdown (interest-first, day-based accrual) */}
              {receivedVal > 0 && (
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 9, padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <span style={{ fontSize: '0.62rem', color: '#64748B', display: 'block' }}>{t('nce.principal_portion')}</span>
                    <strong style={{ fontSize: '0.85rem', color: '#0F172A' }}>₹{fmt(allocation.principalPortion)}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.62rem', color: '#64748B', display: 'block' }}>{t('nce.interest_component')}{allocation.daysSinceLastPayment !== null ? ` (${allocation.daysSinceLastPayment}d)` : ''}</span>
                    <strong style={{ fontSize: '0.85rem', color: '#7C3AED' }}>₹{fmt(allocation.interestPortion)}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.62rem', color: 'var(--brand-primary-hover, #0E5327)', display: 'block' }}>{t('nce.updated_pending_balance')}</span>
                    <strong style={{ fontSize: '0.85rem', color: updatedPendingBal > 0 ? 'var(--color-danger, #DC2626)' : 'var(--brand-primary, #15803D)' }}>₹{fmt(updatedPendingBal)}</strong>
                  </div>
                </div>
              )}

              {/* Payment Method Selector */}
              <div>
                <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 6 }}>
                  {t('cd.payment_method')}
                </label>
                <SharedDropdown
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  buttonStyle={{ height: 44, fontSize: '0.88rem' }}
                  options={[
                    { value: 'CASH', label: t('cd.mode_cash') },
                    { value: 'UPI', label: t('cd.mode_upi') },
                    { value: 'BANK_TRANSFER', label: t('cd.mode_bank_transfer') },
                    { value: 'CHEQUE', label: t('cd.mode_cheque') }
                  ]}
                />
              </div>

              {/* Dynamic Payment Fields */}
              {paymentMode === 'UPI' && (
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 9, padding: 14 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-info-hover, #0284C7)', fontWeight: 500, display: 'block', marginBottom: 6 }}>
                    {t('cd.upi_txn_id')}
                  </label>
                  <input
                    type="text"
                    value={upiTxnId}
                    onChange={(e) => setUpiTxnId(e.target.value)}
                    placeholder="e.g. 320491823901 or PhonePe Txn Ref"
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: '1px solid var(--color-info-border, #BAE6FD)',
                      fontSize: '0.85rem',
                      color: '#0F172A',
                      background: '#FFFFFF',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              {paymentMode === 'BANK_TRANSFER' && (
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 9, padding: 14 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-info-hover, #0284C7)', fontWeight: 500, display: 'block', marginBottom: 6 }}>
                    {t('cd.bank_ref_no')}
                  </label>
                  <input
                    type="text"
                    value={bankRefNo}
                    onChange={(e) => setBankRefNo(e.target.value)}
                    placeholder="e.g. HDFCN2608500123"
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: '1px solid var(--color-info-border, #BAE6FD)',
                      fontSize: '0.85rem',
                      color: '#0F172A',
                      background: '#FFFFFF',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              {paymentMode === 'CHEQUE' && (
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 9, padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--color-info-hover, #0284C7)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                      {t('cd.cheque_number')}
                    </label>
                    <input
                      type="text"
                      value={chequeNo}
                      onChange={(e) => setChequeNo(e.target.value)}
                      placeholder="e.g. 000124"
                      style={{
                        width: '100%',
                        height: 40,
                        padding: '0 12px',
                        borderRadius: 8,
                        border: '1px solid var(--color-info-border, #BAE6FD)',
                        fontSize: '0.85rem',
                        color: '#0F172A',
                        background: '#FFFFFF',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--color-info-hover, #0284C7)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                      {t('cd.issuing_bank_name')}
                    </label>
                    <input
                      type="text"
                      value={chequeBank}
                      onChange={(e) => setChequeBank(e.target.value)}
                      placeholder="e.g. SBI / HDFC Bank"
                      style={{
                        width: '100%',
                        height: 40,
                        padding: '0 12px',
                        borderRadius: 8,
                        border: '1px solid var(--color-info-border, #BAE6FD)',
                        fontSize: '0.85rem',
                        color: '#0F172A',
                        background: '#FFFFFF',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Date & Collector Name */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 6 }}>
                    {t('cd.collection_date')}
                  </label>
                  <SharedDatePicker
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    buttonStyle={{ height: 44 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 6 }}>
                    {t('cd.collector_agent_name')}
                  </label>
                  {collectorEntryMode === 'MANUAL' ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        autoFocus
                        value={collectorName}
                        onChange={(e) => setCollectorName(e.target.value)}
                        placeholder="Enter staff name"
                        style={{
                          flex: 1, height: 44, padding: '0 14px', borderRadius: 9,
                          border: '1px solid #CBD5E1', fontSize: '0.88rem', fontWeight: 400,
                          color: '#0F172A', background: '#FFFFFF', boxSizing: 'border-box'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => { setCollectorEntryMode('SELECT'); setCollectorName(''); }}
                        title="Pick from staff list instead"
                        style={{ height: 44, padding: '0 12px', borderRadius: 9, border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#475569', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        List
                      </button>
                    </div>
                  ) : (
                    <SharedDropdown
                      value={collectorName}
                      onChange={(e) => {
                        if (e.target.value === '__MANUAL__') {
                          setCollectorEntryMode('MANUAL');
                          setCollectorName('');
                        } else {
                          setCollectorName(e.target.value);
                        }
                      }}
                      placeholder="Select staff..."
                      searchable
                      buttonStyle={{ height: 44 }}
                      options={[
                        ...employees.map(emp => ({ value: emp.name, label: emp.name })),
                        { value: '__MANUAL__', label: '+ Enter name manually...' }
                      ]}
                    />
                  )}
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 6 }}>
                  {t('cd.collection_remarks')}
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter transaction notes..."
                  style={{
                    width: '100%',
                    height: 44,
                    padding: '0 14px',
                    borderRadius: 9,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    fontWeight: 400,
                    color: '#0F172A',
                    background: '#FFFFFF',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {submitError && (
                <div style={{
                  background: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FECACA)', color: 'var(--color-danger-text, #991B1B)',
                  padding: '10px 14px', borderRadius: 9, fontSize: '0.8rem', fontWeight: 500
                }}>
                  {submitError}
                </div>
              )}

              {/* Footer Actions */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 14 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#334155',
                    padding: '11px 22px',
                    borderRadius: 9,
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  {t('btn.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading || receivedVal <= 0}
                  style={{
                    border: 'none',
                    background: 'var(--brand-primary, #15803D)',
                    color: '#FFFFFF',
                    padding: '11px 28px',
                    borderRadius: 9,
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: receivedVal > 0 ? 'pointer' : 'not-allowed',
                    opacity: receivedVal > 0 ? 1 : 0.5,
                    boxShadow: '0 4px 14px rgba(var(--brand-primary-rgb), 0.25)'
                  }}
                >
                  {loading ? t('cd.recording') : t('cd.confirm_record')}
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );

  const paperReceiptModal = showReceiptModal && receipt && (
    <ThermalVoucherModal
      company={tenant}
      receipt={{
        voucher_no: receipt.voucher_no,
        date: receipt.collection_date,
        loan_account_no: currentLoan.loan_account_no,
        branch: branchLoc,
        borrower_name: borrowerName,
        phone: phoneNo,
        payment_mode: paymentMode,
        reference_no: receipt.mode_ref,
        amount: receipt.amount || receivedVal,
        pending_balance: updatedPendingBal,
        collector_name: collectorName
      }}
      onClose={() => setShowReceiptModal(false)}
    />
  );

  return (
    <>
      {createPortal(mainModal, document.body)}
      {paperReceiptModal}
    </>
  );
}
