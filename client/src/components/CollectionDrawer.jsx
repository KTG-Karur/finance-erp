import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Receipt, CheckCircle2, FileText, Calendar, Phone } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  resolveInterestPaidUpto,
  calculateInterestForDateRange,
  daysBetween
} from '../utils/loanCalculations';
import ThermalVoucherModal from './ThermalVoucherModal';
import SharedDropdown from './common/SharedDropdown';
import SharedDatePicker from './common/SharedDatePicker';
import api from '../api/client';

export default function CollectionDrawer({ isOpen, onClose, loan, borrowers = [], employees = [], tenant, onSubmit }) {
  const { t } = useLanguage();

  const isInterestOnly = loan?.repayment_method === 'INTEREST_ONLY';

  const [paymentMode, setPaymentMode] = useState('CASH');
  const [bankAccountId, setBankAccountId] = useState('');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState('');
  const [collectorName, setCollectorName] = useState('');
  const [collectorEntryMode, setCollectorEntryMode] = useState('SELECT'); // 'SELECT' | 'MANUAL'

  // Fetch company bank accounts
  useEffect(() => {
    api.get('/finance/bank-accounts')
      .then(res => {
        if (res.data?.success && Array.isArray(res.data?.data)) {
          const activeBanks = res.data.data.filter(b => b.is_active !== false);
          setBankAccounts(activeBanks);
          if (activeBanks.length > 0) {
            setBankAccountId(String(activeBanks[0].id));
          }
        }
      })
      .catch(err => console.warn('Could not load bank accounts:', err));
  }, []);

  // Dynamic Payment Method Fields
  const [upiTxnId, setUpiTxnId] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeBank, setChequeBank] = useState('');
  const [bankRefNo, setBankRefNo] = useState('');

  // Interest Paid Upto & Manual Component States
  const [interestUptoDate, setInterestUptoDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualPrincipal, setManualPrincipal] = useState('');
  const [manualInterest, setManualInterest] = useState('');
  const [additionalCharges, setAdditionalCharges] = useState('');
  const [shortfallAction, setShortfallAction] = useState('CARRY_FORWARD'); // 'CARRY_FORWARD' | 'WAIVE'

  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const curInterestPaidUpto = resolveInterestPaidUpto(loan);
  const minInterestUptoDate = (() => {
    if (!curInterestPaidUpto) return null;
    const d = new Date(curInterestPaidUpto);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  useEffect(() => {
    if (loan) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const curUpto = resolveInterestPaidUpto(loan);
      const minDate = (() => {
        if (!curUpto) return null;
        const d = new Date(curUpto);
        d.setDate(d.getDate() + 1);
        return d.toISOString().slice(0, 10);
      })();

      let initialDate = todayStr;
      if (minDate && todayStr < minDate) {
        initialDate = minDate;
      }
      setInterestUptoDate(initialDate);

      const suggInterest = calculateInterestForDateRange({
        loan,
        fromDate: curUpto,
        toDate: initialDate
      });

      const isEmi = loan.repayment_method === 'EMI';
      const curPending = parseFloat(loan.pending_amount) || 0;
      if (isEmi) {
        const emiAmt = parseFloat(loan.installment_amount) || 0;
        const suggPrin = Math.max(0, Math.min(curPending, emiAmt - suggInterest));
        setManualInterest(String(suggInterest));
        setManualPrincipal(String(suggPrin));
      } else {
        setManualInterest(String(suggInterest));
        setManualPrincipal('0');
      }
      setAdditionalCharges('');
      setShortfallAction('CARRY_FORWARD');
      setPaymentDate(new Date().toISOString().slice(0, 10));
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
  const rawGuarantor = typeof currentLoan.guarantor === 'string'
    ? (() => { try { return JSON.parse(currentLoan.guarantor); } catch { return { name: currentLoan.guarantor }; } })()
    : (currentLoan.guarantor || null);
  const guarantorName = rawGuarantor?.name || (typeof currentLoan.guarantor === 'string' && !currentLoan.guarantor.startsWith('{') ? currentLoan.guarantor : '') || borrowerData?.guarantor_name || '—';

  const dailyEmi = currentLoan.installment_amount || 0;
  const pendingBal = currentLoan.pending_amount || 0;
  const principalAmt = currentLoan.principal_amount || 0;
  const collectedAmt = currentLoan.collected_amount || 0;

  const handleInterestUptoDateChange = (newDate) => {
    setInterestUptoDate(newDate);
    if (!currentLoan) return;
    const suggInterest = calculateInterestForDateRange({
      loan: currentLoan,
      fromDate: curInterestPaidUpto,
      toDate: newDate
    });
    setManualInterest(String(suggInterest));
  };

  const interestBreakdown = calculateInterestForDateRange({
    loan: currentLoan,
    fromDate: curInterestPaidUpto,
    toDate: interestUptoDate,
    includeArrears: true
  });

  const numericPrincipal = Math.max(0, parseFloat(manualPrincipal) || 0);
  const numericInterest = Math.max(0, parseFloat(manualInterest) || 0);
  const numericAdditional = Math.max(0, parseFloat(additionalCharges) || 0);
  const totalAmountToCollect = Math.round((numericPrincipal + numericInterest + numericAdditional) * 100) / 100;
  const updatedCollectedAmt = collectedAmt + totalAmountToCollect;
  const updatedPendingBal = Math.max(0, pendingBal - numericPrincipal);
  const interestDays = daysBetween(curInterestPaidUpto, interestUptoDate);
  const suggestedInterestDue = interestBreakdown.totalSuggestedInterest;

  // Shortfall & Arrears
  const interestShortfallAmount = Math.max(0, Math.round((interestBreakdown.totalSuggestedInterest - numericInterest) * 100) / 100);
  const hasShortfall = interestShortfallAmount > 0;
  const newPendingArrears = shortfallAction === 'CARRY_FORWARD' ? interestShortfallAmount : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (totalAmountToCollect <= 0) return;

    if (numericPrincipal > pendingBal + 0.01) {
      setSubmitError(`Principal amount (₹${fmt(numericPrincipal)}) cannot exceed outstanding balance (₹${fmt(pendingBal)}).`);
      return;
    }

    const minDate = currentLoan?.last_payment_date || currentLoan?.loan_date || null;
    const maxDate = new Date().toISOString().slice(0, 10);
    if (minDate && paymentDate < minDate) {
      setSubmitError(`Collection date cannot be earlier than ${currentLoan?.last_payment_date ? 'the last payment date' : 'the loan disbursal date'} (${minDate}).`);
      return;
    }
    if (paymentDate > maxDate) {
      setSubmitError('Collection date cannot be in the future.');
      return;
    }

    setLoading(true);
    setSubmitError('');
    try {
      const modeDetails = paymentMode === 'UPI' ? ` (UPI UTR: ${upiTxnId})`
        : paymentMode === 'CHEQUE' ? ` (Cheque No: ${chequeNo}, Bank: ${chequeBank})`
        : paymentMode === 'BANK_TRANSFER' ? ` (NEFT UTR: ${bankRefNo})`
        : '';

      const isNonCash = paymentMode !== 'CASH';
      const selectedBank = bankAccounts.find(b => String(b.id) === String(bankAccountId)) || (isNonCash ? bankAccounts[0] : null);

      const res = await onSubmit({
        loan_id: currentLoan.id,
        amount: totalAmountToCollect,
        principal_portion: numericPrincipal,
        principal_paid: numericPrincipal,
        interest_portion: numericInterest,
        interest_paid: numericInterest,
        penalty: numericAdditional,
        penalty_portion: numericAdditional,
        interest_from_date: curInterestPaidUpto,
        interest_paid_upto: interestUptoDate,
        interest_days: interestDays,
        interest_shortfall_action: shortfallAction,
        interest_shortfall: shortfallAction === 'CARRY_FORWARD' ? interestShortfallAmount : 0,
        interest_waiver: shortfallAction === 'WAIVE' ? interestShortfallAmount : 0,
        new_pending_interest_arrears: newPendingArrears,
        new_principal_balance: updatedPendingBal,
        payment_mode: paymentMode,
        bank_account_id: isNonCash && selectedBank ? selectedBank.id : null,
        settlement_account_code: isNonCash && selectedBank ? (selectedBank.ledger_account_code || '1002') : null,
        payment_date: paymentDate,
        collection_type: 'DAILY_EMI',
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
        amount: totalAmountToCollect,
        principal_paid: numericPrincipal,
        interest_paid: numericInterest,
        penalty: numericAdditional,
        interest_paid_upto: interestUptoDate,
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
    <div className="collection-modal-overlay">
      <div className="collection-modal-card">

        {/* ── LEFT PANEL: Borrower Image & Full Profile Details ─────────── */}
        <div className="collection-left-panel">
          <div>
            {/* Centered Profile Picture / Initials Avatar */}
            <div className="borrower-profile-header">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={borrowerName}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid var(--brand-primary-border, #A3F5C1)',
                    margin: '0 auto 8px auto',
                    boxShadow: '0 4px 14px rgba(var(--brand-primary-rgb), 0.2)',
                    display: 'block'
                  }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: 'var(--brand-primary-light, #F0FEF5)',
                  border: '2px solid var(--brand-primary-border, #A3F5C1)',
                  color: 'var(--brand-primary, #15803D)',
                  fontSize: '1.3rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 8px auto',
                  boxShadow: '0 4px 14px rgba(var(--brand-primary-rgb), 0.15)'
                }}>
                  {(borrowerName || 'C').slice(0, 2).toUpperCase()}
                </div>
              )}

              <h4 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 600, color: '#0F172A' }}>
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

            {/* Mobile-only compact identity: photo + name on one row,
                mobile number + customer id on the next (≤768px). */}
            <div className="cd-mobile-identity">
              <div className="cd-mi-top">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={borrowerName}
                    className="cd-mi-avatar"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="cd-mi-avatar cd-mi-avatar--initials">
                    {(borrowerName || 'C').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <h4 className="cd-mi-name">{borrowerName}</h4>
              </div>
              <div className="cd-mi-meta">
                <span className="cd-mi-chip">
                  <Phone style={{ width: 12, height: 12 }} />
                  {phoneNo}
                </span>
                <span className="cd-mi-chip cd-mi-chip--id">{currentLoan.loan_account_no}</span>
              </div>
            </div>

            {/* Borrower Identity & Contact Grid */}
            <div className="identity-grid-card">
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
                <div style={{ gridColumn: 'span 2', paddingTop: 2 }}>
                  <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block', fontWeight: 400 }}>{t('cd.guarantor')}</span>
                  <span style={{ fontSize: '0.8rem', color: '#0F172A', fontWeight: 500, marginTop: 2, display: 'block' }}>{guarantorName}</span>
                </div>
              )}
            </div>

            {/* Account Balance Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('cd.account_balance_details')}
              </span>

              <div className="balance-details-card">
                <div>
                  <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block', fontWeight: 400 }}>{t('cd.loan_principal')}</span>
                  <span style={{ fontSize: '0.92rem', color: '#0F172A', fontWeight: 600, marginTop: 2, display: 'block' }}>₹{fmt(principalAmt)}</span>
                </div>

                <div>
                  <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block', fontWeight: 400 }}>
                    {isInterestOnly ? 'Interest Due' : (currentLoan?.repayment_frequency === 'WEEKLY' ? 'Weekly Installment' : (currentLoan?.repayment_frequency === 'MONTHLY' ? 'Monthly EMI' : t('cd.daily_emi')))}
                  </span>
                  <span style={{ fontSize: '0.92rem', color: 'var(--color-info, #2563EB)', fontWeight: 600, marginTop: 2, display: 'block' }}>
                    ₹{fmt(isInterestOnly ? suggestedInterestDue : dailyEmi)}
                  </span>
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

                <div style={{ gridColumn: 'span 2', height: 1, background: '#F1F5F9' }} />

                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 500 }}>Last Paid Date</span>
                  <strong style={{ fontSize: '0.78rem', color: currentLoan.last_payment_date ? '#0F172A' : '#94A3B8' }}>
                    {currentLoan.last_payment_date
                      ? new Date(currentLoan.last_payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'No payments yet'}
                  </strong>
                </div>

                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 500 }}>Total Elapsed Days</span>
                  <strong style={{ fontSize: '0.78rem', color: '#0F172A' }}>
                    {(() => {
                      const todayCal = new Date().toISOString().slice(0, 10);
                      const fromD = currentLoan.last_payment_date || currentLoan.loan_date;
                      if (!fromD) return '0 Days';
                      const diffMs = new Date(todayCal).getTime() - new Date(fromD).getTime();
                      const days = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
                      return `${days} ${days === 1 ? 'Day' : 'Days'}${days === 0 ? ' (Today)' : ''}`;
                    })()}
                  </strong>
                </div>

                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F0FDF4', padding: '6px 10px', borderRadius: 8, border: '1px solid #BBF7D0' }}>
                  <span style={{ fontSize: '0.68rem', color: '#166534', fontWeight: 600 }}>Interest Up to Today</span>
                  <strong style={{ fontSize: '0.78rem', color: (() => {
                    const todayCal = new Date().toISOString().slice(0, 10);
                    const todayInt = calculateInterestForDateRange({
                      loan: currentLoan,
                      fromDate: curInterestPaidUpto,
                      toDate: todayCal
                    });
                    return todayInt > 0 ? '#15803D' : '#64748B';
                  })() }}>
                    {(() => {
                      const todayCal = new Date().toISOString().slice(0, 10);
                      const isPaidToday = curInterestPaidUpto && curInterestPaidUpto >= todayCal;
                      if (isPaidToday) return '₹0 (Settled ✓)';

                      const todayInt = calculateInterestForDateRange({
                        loan: currentLoan,
                        fromDate: curInterestPaidUpto,
                        toDate: todayCal
                      });

                      if (todayInt <= 0) return '₹0 (Settled ✓)';
                      return `₹${fmt(todayInt)}`;
                    })()}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <div className="cd-panel-footer" style={{ paddingTop: 12, borderTop: '1px solid #E2E8F0', fontSize: '0.72rem', color: 'var(--brand-primary-hover, #0E5327)', textAlign: 'center', fontWeight: 500 }}>
            {t('cd.active_loan_account')}
          </div>
        </div>

        {/* ── RIGHT PANEL: Collection Entry Form / Success Screen ─────────── */}
        <div className="collection-right-panel">

          <div className="collection-header-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Receipt style={{ width: 20, height: 20, color: 'var(--brand-primary, #15803D)' }} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#0F172A' }}>
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
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
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
                padding: 16,
                margin: '20px 0',
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

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(true)}
                  style={{
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    padding: '10px 20px',
                    borderRadius: 9,
                    fontSize: '0.85rem',
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
                    padding: '10px 24px',
                    borderRadius: 9,
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  {t('cd.done_close')}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="collection-form-body">
              
              {/* Interest Period & Date Selection */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar style={{ width: 15, height: 15, color: 'var(--brand-primary, #15803D)' }} />
                    <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#0F172A' }}>
                      Interest Paid Up To Date
                    </span>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '2px 8px', borderRadius: 10 }}>
                    Last settled: <strong>{curInterestPaidUpto ? new Date(curInterestPaidUpto).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Disbursal'}</strong>
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
                  <div>
                    <SharedDatePicker
                      value={interestUptoDate}
                      min={minInterestUptoDate}
                      onChange={(e, val) => handleInterestUptoDateChange(val || e.target.value)}
                      buttonStyle={{ height: 40, background: '#FFFFFF', border: '1px solid #CBD5E1' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--brand-primary, #15803D)', background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', padding: '3px 8px', borderRadius: 6 }}>
                      {interestDays} Day{interestDays === 1 ? '' : 's'}
                    </span>
                    <span style={{ fontSize: '0.6rem', color: '#94A3B8', marginTop: 2 }}>
                      {currentLoan.monthly_interest_rate || 0}% / mo
                    </span>
                  </div>
                </div>
              </div>

              {/* 3-Column Manual Entry */}
              <div>
                <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Collection Breakdown (Manual Entry)
                </label>

                {/* Past Arrears Notification Banner */}
                {interestBreakdown.pastArrears > 0 && (
                  <div style={{ background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: 8, padding: '6px 10px', marginBottom: 8, fontSize: '0.7rem', color: '#6B21A8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                    <span>Past Arrears: <strong>₹{fmt(interestBreakdown.pastArrears)}</strong></span>
                    <span>Accrued ({interestDays}d): <strong>₹{fmt(interestBreakdown.periodInterest)}</strong></span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  <div>
                    <span style={{ fontSize: '0.66rem', color: '#334155', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                      Principal (₹)
                    </span>
                    <input
                      type="number"
                      value={manualPrincipal}
                      onChange={(e) => setManualPrincipal(e.target.value)}
                      min={0}
                      max={pendingBal}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        height: 40,
                        padding: '0 8px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.92rem',
                        fontWeight: 600,
                        color: '#0F172A',
                        background: '#FFFFFF',
                        boxSizing: 'border-box'
                      }}
                    />
                    <span style={{ fontSize: '0.6rem', color: '#64748B', display: 'block', marginTop: 2 }}>
                      Bal: ₹{fmt(pendingBal)}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.66rem', color: '#6B21A8', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                      Interest (₹)
                    </span>
                    <input
                      type="number"
                      value={manualInterest}
                      onChange={(e) => setManualInterest(e.target.value)}
                      min={0}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        height: 40,
                        padding: '0 8px',
                        borderRadius: 8,
                        border: '1px solid #DDD6FE',
                        fontSize: '0.92rem',
                        fontWeight: 600,
                        color: '#7C3AED',
                        background: '#FAF5FF',
                        boxSizing: 'border-box'
                      }}
                    />
                    <span style={{ fontSize: '0.6rem', color: '#7C3AED', display: 'block', marginTop: 2 }}>
                      Sugg: ₹{fmt(interestBreakdown.totalSuggestedInterest)}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.66rem', color: '#C2410C', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                      Addnl / Fees (₹)
                    </span>
                    <input
                      type="number"
                      value={additionalCharges}
                      onChange={(e) => setAdditionalCharges(e.target.value)}
                      min={0}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        height: 40,
                        padding: '0 8px',
                        borderRadius: 8,
                        border: '1px solid #FED7AA',
                        fontSize: '0.92rem',
                        fontWeight: 600,
                        color: '#C2410C',
                        background: '#FFF7ED',
                        boxSizing: 'border-box'
                      }}
                    />
                    <span style={{ fontSize: '0.6rem', color: '#9A3412', display: 'block', marginTop: 2 }}>
                      Late/Other
                    </span>
                  </div>
                </div>

                {/* Shortfall Resolution Card (Option 4 with Option 1 as default) */}
                {hasShortfall && (
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 9, padding: '8px 10px', marginTop: 8, fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 4 }}>
                      <span style={{ fontWeight: 700, color: '#92400E' }}>
                        Difference: ₹{fmt(interestShortfallAmount)}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: '#B45309' }}>
                        Due ₹{fmt(interestBreakdown.totalSuggestedInterest)} vs Entered ₹{fmt(numericInterest)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#78350F', fontWeight: shortfallAction === 'CARRY_FORWARD' ? 600 : 400 }}>
                        <input
                          type="radio"
                          name="shortfall_action_cd"
                          checked={shortfallAction === 'CARRY_FORWARD'}
                          onChange={() => setShortfallAction('CARRY_FORWARD')}
                        />
                        <span>Carry forward ₹{fmt(interestShortfallAmount)} as pending interest arrears (Default)</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#78350F', fontWeight: shortfallAction === 'WAIVE' ? 600 : 400 }}>
                        <input
                          type="radio"
                          name="shortfall_action_cd"
                          checked={shortfallAction === 'WAIVE'}
                          onChange={() => setShortfallAction('WAIVE')}
                        />
                        <span>Waive / discount ₹{fmt(interestShortfallAmount)} as concession (Submit for Manager Waiver Approval)</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Summary Banner */}
              <div style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)', border: '1px solid var(--brand-primary-border, #A3F5C1)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.62rem', color: 'var(--brand-primary-hover, #0E5327)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                    Total Collection
                  </span>
                  <span style={{ fontSize: '1.15rem', color: 'var(--brand-primary, #15803D)', fontWeight: 700, marginTop: 1, display: 'block' }}>
                    ₹{fmt(totalAmountToCollect)}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.62rem', color: '#64748B', display: 'block' }}>
                    New Principal Bal
                  </span>
                  <span style={{ fontSize: '0.98rem', color: updatedPendingBal > 0 ? 'var(--color-danger, #DC2626)' : 'var(--brand-primary, #15803D)', fontWeight: 700 }}>
                    ₹{fmt(updatedPendingBal)}
                  </span>
                </div>
              </div>

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

              {/* Receiving Bank Account for Non-Cash Collections */}
              {paymentMode !== 'CASH' && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 6 }}>
                    Receiving Bank Account *
                  </label>
                  <SharedDropdown
                    value={bankAccountId ? String(bankAccountId) : (bankAccounts[0]?.id ? String(bankAccounts[0].id) : '')}
                    onChange={(e) => setBankAccountId(e.target.value)}
                    buttonStyle={{ height: 44, fontSize: '0.88rem' }}
                    options={bankAccounts.map(b => ({
                      value: String(b.id),
                      label: `${b.bank_name} (${b.account_number ? '...' + String(b.account_number).slice(-4) : b.account_name})`
                    }))}
                  />
                </div>
              )}

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
              <div className="date-collector-row">
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 6 }}>
                    {t('cd.collection_date')}
                  </label>
                  <SharedDatePicker
                    value={paymentDate}
                    min={currentLoan?.last_payment_date || currentLoan?.loan_date || null}
                    max={new Date().toISOString().slice(0, 10)}
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
              <div className="collection-actions-bar">
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
                  disabled={loading || totalAmountToCollect <= 0}
                  style={{
                    border: 'none',
                    background: 'var(--brand-primary, #15803D)',
                    color: '#FFFFFF',
                    padding: '11px 28px',
                    borderRadius: 9,
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: totalAmountToCollect > 0 ? 'pointer' : 'not-allowed',
                    opacity: totalAmountToCollect > 0 ? 1 : 0.5,
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
        amount: receipt.amount || totalAmountToCollect,
        principal_paid: receipt.principal_paid ?? numericPrincipal,
        interest_paid: receipt.interest_paid ?? numericInterest,
        penalty: receipt.penalty ?? numericAdditional,
        interest_paid_upto: receipt.interest_paid_upto ?? interestUptoDate,
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
