import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Receipt, CheckCircle2, Printer, FileText, Phone, MapPin, ShieldCheck, User } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { calculatePaymentAllocation } from '../utils/loanCalculations';

export default function CollectionDrawer({ isOpen, onClose, loan, borrowers = [], onSubmit }) {
  const { t } = useLanguage();
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
  const branchLoc = currentLoan.branch || borrowerData?.branch || 'Main Branch';
  const aadhaarNo = currentLoan.aadhaar || borrowerData?.aadhaar_number || '—';
  const panNo = currentLoan.pan || borrowerData?.pan_number || '—';
  const guarantorName = currentLoan.guarantor || borrowerData?.guarantor_name || '—';

  const dailyEmi = currentLoan.installment_amount || 500;
  const pendingBal = currentLoan.pending_amount || 0;
  const principalAmt = currentLoan.principal_amount || 0;
  const collectedAmt = currentLoan.collected_amount || 0;

  const [amountPaid, setAmountPaid] = useState(dailyEmi);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState('');
  const [collectorName, setCollectorName] = useState('Staff Collector');

  // Dynamic Payment Method Fields
  const [upiTxnId, setUpiTxnId] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeBank, setChequeBank] = useState('');
  const [bankRefNo, setBankRefNo] = useState('');

  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    if (loan) {
      setAmountPaid(loan.installment_amount || 500);
      setReceipt(null);
      setShowReceiptModal(false);
      setUpiTxnId('');
      setChequeNo('');
      setChequeBank('');
      setBankRefNo('');
    }
  }, [loan]);

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
        payment_details: {
          upiTxnId,
          chequeNo,
          chequeBank,
          bankRefNo
        }
      });

      setReceipt(res?.data || {
        receipt_no: `REC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000 + Math.random() * 9000)}`,
        amount: receivedVal,
        updatedCollectedAmt,
        updatedPendingBal,
        payment_mode: paymentMode,
        mode_ref: upiTxnId || chequeNo || bankRefNo || '',
        collection_date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      });
    } catch (err) {
      console.error(err);
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
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
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
                    border: '2px solid #A7F3D0',
                    margin: '0 auto 10px auto',
                    boxShadow: '0 4px 14px rgba(5, 150, 105, 0.2)'
                  }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div style={{
                  width: 68,
                  height: 68,
                  borderRadius: '50%',
                  background: '#ECFDF5',
                  border: '2px solid #A7F3D0',
                  color: '#059669',
                  fontSize: '1.4rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px auto',
                  boxShadow: '0 4px 14px rgba(5, 150, 105, 0.15)'
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
                color: '#059669',
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
                  <span style={{ fontSize: '0.92rem', color: '#2563EB', fontWeight: 600, marginTop: 2, display: 'block' }}>₹{fmt(dailyEmi)}</span>
                </div>

                <div style={{ gridColumn: 'span 2', height: 1, background: '#F1F5F9' }} />

                <div>
                  <span style={{ fontSize: '0.65rem', color: '#047857', display: 'block', fontWeight: 500 }}>{t('cd.total_paid')}</span>
                  <span style={{ fontSize: '0.95rem', color: '#059669', fontWeight: 600, marginTop: 2, display: 'block' }}>₹{fmt(collectedAmt)}</span>
                </div>

                <div>
                  <span style={{ fontSize: '0.65rem', color: '#991B1B', display: 'block', fontWeight: 500 }}>{t('cd.pending_amount')}</span>
                  <span style={{ fontSize: '0.95rem', color: pendingBal > 0 ? '#DC2626' : '#059669', fontWeight: 600, marginTop: 2, display: 'block' }}>₹{fmt(pendingBal)}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ paddingTop: 14, borderTop: '1px solid #E2E8F0', fontSize: '0.72rem', color: '#047857', textAlign: 'center', fontWeight: 500 }}>
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
              <Receipt style={{ width: 20, height: 20, color: '#059669' }} />
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
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                color: '#059669',
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
                {t('cd.receipt_number')} <span style={{ color: '#059669', fontFamily: 'monospace', fontWeight: 500 }}>{receipt.receipt_no}</span>
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
                  <span style={{ fontSize: '0.82rem', color: '#047857', fontWeight: 500 }}>{t('cd.today_paid_amount')}</span>
                  <span style={{ fontSize: '1.1rem', color: '#059669', fontWeight: 500 }}>₹{fmt(receipt.amount || receivedVal)} ✓</span>
                </div>
                <div style={{ height: 1, background: '#E2E8F0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: '#64748B' }}>{t('cd.updated_paid_amount')}</span>
                  <span style={{ color: '#059669', fontWeight: 500 }}>₹{fmt(updatedCollectedAmt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: '#64748B' }}>{t('cd.updated_pending_outstanding')}</span>
                  <span style={{ color: updatedPendingBal > 0 ? '#DC2626' : '#059669', fontWeight: 500 }}>₹{fmt(updatedPendingBal)}</span>
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
                  <span>{t('cd.preview_print_receipt')}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    border: 'none',
                    background: '#059669',
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
                  <span style={{ position: 'absolute', left: 14, top: 11, fontSize: '0.98rem', color: '#059669', fontWeight: 500 }}>₹</span>
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
                      color: '#059669',
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
                    <span style={{ fontSize: '0.62rem', color: '#047857', display: 'block' }}>{t('nce.updated_pending_balance')}</span>
                    <strong style={{ fontSize: '0.85rem', color: updatedPendingBal > 0 ? '#DC2626' : '#059669' }}>₹{fmt(updatedPendingBal)}</strong>
                  </div>
                </div>
              )}

              {/* Payment Method Selector */}
              <div>
                <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 6 }}>
                  {t('cd.payment_method')}
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
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
                >
                  <option value="CASH">{t('cd.mode_cash')}</option>
                  <option value="UPI">{t('cd.mode_upi')}</option>
                  <option value="BANK_TRANSFER">{t('cd.mode_bank_transfer')}</option>
                  <option value="CHEQUE">{t('cd.mode_cheque')}</option>
                </select>
              </div>

              {/* Dynamic Payment Fields */}
              {paymentMode === 'UPI' && (
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 9, padding: 14 }}>
                  <label style={{ fontSize: '0.75rem', color: '#0284C7', fontWeight: 500, display: 'block', marginBottom: 6 }}>
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
                      border: '1px solid #BAE6FD',
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
                  <label style={{ fontSize: '0.75rem', color: '#0284C7', fontWeight: 500, display: 'block', marginBottom: 6 }}>
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
                      border: '1px solid #BAE6FD',
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
                    <label style={{ fontSize: '0.72rem', color: '#0284C7', fontWeight: 500, display: 'block', marginBottom: 4 }}>
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
                        border: '1px solid #BAE6FD',
                        fontSize: '0.85rem',
                        color: '#0F172A',
                        background: '#FFFFFF',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#0284C7', fontWeight: 500, display: 'block', marginBottom: 4 }}>
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
                        border: '1px solid #BAE6FD',
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
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
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

                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 6 }}>
                    {t('cd.collector_agent_name')}
                  </label>
                  <input
                    type="text"
                    value={collectorName}
                    onChange={(e) => setCollectorName(e.target.value)}
                    placeholder="Staff Collector"
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
                    background: '#059669',
                    color: '#FFFFFF',
                    padding: '11px 28px',
                    borderRadius: 9,
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: receivedVal > 0 ? 'pointer' : 'not-allowed',
                    opacity: receivedVal > 0 ? 1 : 0.5,
                    boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)'
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

  {/* ── DEDICATED POS THERMAL RECEIPT MACHINE PRINT SHEET MODAL ────────── */}
  const paperReceiptModal = showReceiptModal && receipt && (
    <div className="paper-receipt-printable-overlay" style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999999,
      background: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20
    }}>
      <div className="paper-receipt-document" style={{
        background: '#FFFFFF',
        color: '#000000',
        borderRadius: 2,
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
        width: 320,
        maxWidth: '100%',
        maxHeight: '94vh',
        overflowY: 'auto',
        border: '1px solid #000000',
        fontFamily: '"Courier New", Courier, monospace, monospace',
        padding: '20px 16px',
        boxSizing: 'border-box',
        position: 'relative',
        fontSize: '0.78rem',
        lineHeight: 1.45
      }}>
        {/* Close Button Top Right (hidden in print) */}
        <button
          type="button"
          className="no-print"
          onClick={() => setShowReceiptModal(false)}
          style={{
            position: 'absolute',
            right: 12,
            top: 12,
            background: '#FFFFFF',
            border: '1px solid #000000',
            color: '#000000',
            width: 24,
            height: 24,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X style={{ width: 12, height: 12 }} />
        </button>

        {/* POS Thermal Header */}
        <div style={{ textAlign: 'center', borderBottom: '1px dashed #000000', paddingBottom: 10, marginBottom: 10 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            KARUR THANGAMAYIL FINANCE
          </div>
          <div style={{ fontSize: '0.68rem', marginTop: 2 }}>
            No. 123, Kovai Main Road, Karur
          </div>
          <div style={{ fontSize: '0.65rem' }}>
            RBI Regd NBFC | Lic: B-07.01234
          </div>
          <div style={{ marginTop: 6, fontWeight: 700, border: '1px solid #000000', display: 'inline-block', padding: '2px 8px', fontSize: '0.7rem' }}>
            PAYMENT COLLECTION RECEIPT
          </div>
        </div>

        {/* Receipt Key Fields */}
        <div style={{ borderBottom: '1px dashed #000000', paddingBottom: 8, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Receipt No:</span>
            <strong>{receipt.receipt_no}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Date:</span>
            <span>{receipt.collection_date}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Account No:</span>
            <strong>{currentLoan.loan_account_no}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Branch:</span>
            <span>{branchLoc}</span>
          </div>
        </div>

        {/* Customer Information */}
        <div style={{ borderBottom: '1px dashed #000000', paddingBottom: 8, marginBottom: 8 }}>
          <div>Borrower: <strong>{borrowerName}</strong></div>
          <div>Mobile  : <span>{phoneNo}</span></div>
          <div>Mode    : <span>{paymentMode} {receipt.mode_ref ? `(${receipt.mode_ref})` : ''}</span></div>
        </div>

        {/* Financial Collection Itemization */}
        <div style={{ borderBottom: '1px dashed #000000', paddingBottom: 10, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 700, padding: '4px 0', borderBottom: '1px solid #000000' }}>
            <span>TODAY RECEIVED:</span>
            <span>Rs. {fmt(receipt.amount || receivedVal)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span>Principal Sanctioned:</span>
            <span>Rs. {fmt(principalAmt)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span>Total Paid Amount:</span>
            <strong>Rs. {fmt(updatedCollectedAmt)}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontWeight: 700 }}>
            <span>Pending Balance:</span>
            <span>Rs. {fmt(updatedPendingBal)}</span>
          </div>
        </div>

        {/* Staff & Computer Generated Note */}
        <div style={{ textAlign: 'center', fontSize: '0.68rem' }}>
          <div>Collector Agent: <strong>{collectorName}</strong></div>
          <div style={{ margin: '8px 0 4px 0', borderTop: '1px dashed #000000', paddingTop: 6 }}>
            *** THANK YOU - PAID SUCCESSFULLY ***
          </div>
          <div style={{ fontSize: '0.6rem', color: '#444444' }}>Computer Generated Receipt</div>
        </div>

        {/* Action Controls (hidden in print) */}
        <div className="no-print" style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid #000000', fontFamily: '-apple-system, sans-serif' }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              border: '1.5px solid #000000',
              background: '#000000',
              color: '#FFFFFF',
              padding: '8px 16px',
              borderRadius: 4,
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Printer style={{ width: 14, height: 14 }} />
            <span>Print Thermal Receipt</span>
          </button>

          <button
            type="button"
            onClick={() => setShowReceiptModal(false)}
            style={{
              border: '1px solid #000000',
              background: '#FFFFFF',
              color: '#000000',
              padding: '8px 14px',
              borderRadius: 4,
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );

  return (
    <>
      {createPortal(mainModal, document.body)}
      {paperReceiptModal && createPortal(paperReceiptModal, document.body)}
    </>
  );
}
