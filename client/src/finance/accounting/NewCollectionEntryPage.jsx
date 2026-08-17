import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  Printer,
  Send,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  FileSpreadsheet,
  Clock,
  ShieldCheck,
  Check,
  X,
  AlertTriangle,
  Filter,
  Lock,
  Camera,
  MapPin
} from 'lucide-react';
import CustomerProfileModal from '../borrowers/CustomerProfileModal';
import { useLanguage } from '../../i18n/LanguageContext';
import { calculatePaymentAllocation } from '../../utils/loanCalculations';
import SharedDropdown from '../../components/common/SharedDropdown';
import SharedDatePicker from '../../components/common/SharedDatePicker';

export default function NewCollectionEntryPage({
  loans = [],
  borrowers = [],
  collections = [],
  loanSchemes = [],
  onBack,
  onRecordCollection,
  selectedBranch = 'ALL'
}) {
  const { t } = useLanguage();
  const activeLoans = loans.filter(l => l.status === 'ACTIVE' || l.status === 'OVERDUE');

  // Search & Selection State — nothing is pre-selected; the page opens blank until
  // staff explicitly picks a customer/loan.
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');
  useEffect(() => {
    if (selectedBranch && selectedBranch !== 'ALL') setBranchFilter(selectedBranch);
  }, [selectedBranch]);

  // Target Loan & Borrower — null until a loan is actually selected.
  const targetLoan = selectedLoanId
    ? (loans.find(l => String(l.id) === String(selectedLoanId)) || null)
    : null;
  const targetBorrower = targetLoan
    ? (borrowers.find(b => b.id === targetLoan.borrower_id || b.phone === targetLoan.phone || b.full_name === targetLoan.borrower_name) || null)
    : null;

  const profilePhoto = targetLoan?.profile_image || targetBorrower?.profile_image || targetBorrower?.photo || null;
  const borrowerName = targetLoan?.borrower_name || targetBorrower?.full_name || '';
  const phoneNo = targetLoan?.phone || targetBorrower?.phone || '';
  const branchLoc = targetLoan?.branch || targetBorrower?.branch || '';
  const dailyEmi = targetLoan?.installment_amount || 0;
  const pendingBal = targetLoan?.pending_amount || 0;
  const principalAmt = targetLoan?.principal_amount || 0;
  const collectedAmt = targetLoan?.collected_amount || 0;

  // A loan stops accepting payments once it's fully paid — it moves to
  // PENDING_CLOSURE (awaiting Admin approval) or CLOSED, and the form below
  // switches to a read-only "Completed" state instead of accepting more money.
  const isLoanCompleted = targetLoan
    ? (pendingBal <= 0 || targetLoan.status === 'CLOSED' || targetLoan.status === 'PENDING_CLOSURE')
    : false;

  // Prior payments already recorded for this loan.
  const loanHistory = targetLoan
    ? collections
        .filter(c => String(c.loan_id) === String(targetLoan.id))
        .sort((a, b) => new Date(b.collection_date) - new Date(a.collection_date))
    : [];

  // Collection Entry Form State — amount stays blank until a loan is selected.
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH'); // 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE'
  const [txnRef, setTxnRef] = useState('');
  const [collectorName, setCollectorName] = useState('K. Ramesh (Field Officer)');
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState('');
  const [posting, setPosting] = useState(false);
  const [selectedCustomerForProfile, setSelectedCustomerForProfile] = useState(null);
  const [penaltyWaived, setPenaltyWaived] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [lastReceipt, setLastReceipt] = useState(null);
  const [showReceiptPrint, setShowReceiptPrint] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showTickAnimation, setShowTickAnimation] = useState(false);

  // Proof-of-payment photo (cash handover / UPI / cheque screenshot) — optional,
  // stored as a data URI on the receipt for the field-collection audit trail.
  const [proofImage, setProofImage] = useState(null);

  // GPS stamp for doorstep collections — captured once per page visit; never
  // blocks posting if the browser denies it or geolocation isn't available.
  const [geoLocation, setGeoLocation] = useState(null); // { lat, lng, accuracy }
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | locating | granted | denied | unavailable | insecure | timeout

  // The browser's own getCurrentPosition callback only ever fires ONE of these
  // three error codes — PERMISSION_DENIED(1) / POSITION_UNAVAILABLE(2) /
  // TIMEOUT(3) — and mapping every one of them to "denied" (the earlier bug
  // here) is exactly what made an allowed-but-GPS-less desktop browser show
  // "Location denied" when it had actually just failed to get a fix in time.
  const requestLocation = () => {
    if (!navigator.geolocation) { setGeoStatus('unavailable'); return; }
    if (!window.isSecureContext) { setGeoStatus('insecure'); return; }
    setGeoStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setGeoStatus('granted');
      },
      (err) => {
        console.warn('Geolocation failed:', err.code, err.message);
        if (err.code === err.PERMISSION_DENIED) setGeoStatus('denied');
        else if (err.code === err.TIMEOUT) setGeoStatus('timeout');
        else setGeoStatus('unavailable');
      },
      // Network/Wi-Fi based location (enableHighAccuracy: false) resolves far
      // more reliably than GPS on a desktop/laptop with no GPS hardware.
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );
  };

  useEffect(() => { requestLocation(); }, []);

  const handleProofChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setSubmitError('Please upload an image file (JPG or PNG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError('Proof image is too large — please upload an image under 5MB.');
      return;
    }
    setSubmitError('');
    const reader = new FileReader();
    reader.onload = () => setProofImage(reader.result);
    reader.readAsDataURL(file);
  };

  // Fill in the default EMI amount only once a loan is actually selected.
  useEffect(() => {
    setAmountPaid(targetLoan && !isLoanCompleted ? (targetLoan.installment_amount || '') : '');
    setPenaltyWaived(false);
    setSubmitError('');
  }, [selectedLoanId]);

  // Every branch that appears on at least one loan.
  const branchOptions = Array.from(new Set(activeLoans.map(l => l.branch).filter(Boolean))).sort();

  const filteredLoans = activeLoans.filter(l => {
    const q = searchQuery.toLowerCase().trim();
    const matchesBranch = branchFilter === 'ALL' || l.branch === branchFilter;
    if (!matchesBranch) return false;
    if (!q) return true;
    return (
      (l.loan_account_no && l.loan_account_no.toLowerCase().includes(q)) ||
      (l.borrower_name && l.borrower_name.toLowerCase().includes(q)) ||
      (l.phone && l.phone.includes(q))
    );
  });

  useEffect(() => {
    if (searchQuery.trim() && filteredLoans.length > 0) {
      const isAlreadyIncluded = filteredLoans.some(l => String(l.id) === String(selectedLoanId));
      if (!isAlreadyIncluded) {
        setSelectedLoanId(filteredLoans[0].id);
      }
    }
  }, [searchQuery]);

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  const numericAmt = parseFloat(amountPaid) || 0;
  // A custom-formula loan doesn't carry a meaningful repayment_method (custom schemes
  // have no EMI/Interest-Only value to derive from) — whether it's schedule-based is
  // its own accrual_mode instead. Every non-custom loan keeps the original check.
  const isEmiLoan = targetLoan?.formula_type === 'CUSTOM'
    ? targetLoan?.accrual_mode === 'SCHEDULED'
    : targetLoan?.repayment_method === 'EMI';

  // Dispatches to the loan's configured Repayment Method (EMI / Interest Only) x
  // Interest Calculation (Constant / Flexible) strategy. Interest always comes out
  // first and only the remainder reduces principal.
  const allocation = calculatePaymentAllocation({
    loan: targetLoan,
    paymentAmount: numericAmt,
    paymentDate: collectionDate
  });
  const interestPortion = allocation.interestPortion;
  const principalPortion = allocation.principalPortion;
  const updatedPendingBal = Math.max(0, allocation.newPendingPrincipal);
  const daysSinceLastPayment = allocation.daysSinceLastPayment;
  const progressPercent = Math.min(100, Math.max(0, Math.round(((collectedAmt + principalPortion) / (principalAmt || 1)) * 100)));
  const lastPaymentDate = targetLoan?.last_payment_date || targetLoan?.loan_date || null;

  // The full amount that would completely settle this loan right now — interest
  // due plus outstanding principal (Interest-Only), or every remaining unpaid
  // rupee across the schedule (EMI). The amount field is capped here so an
  // overpayment simply isn't possible to enter.
  const maxPayableAmount = targetLoan
    ? (isEmiLoan
        ? (targetLoan.repayment_schedule || []).reduce((s, r) => s + Math.max(0, r.emi - (r.principal_paid || 0) - (r.interest_paid || 0)), 0)
        : Math.max(0, pendingBal + (allocation.interestDue || 0)))
    : 0;

  const handleAmountChange = (e) => {
    const raw = e.target.value;
    if (raw === '') { setAmountPaid(''); return; }
    const val = Math.max(0, parseFloat(raw) || 0);
    setAmountPaid(maxPayableAmount > 0 ? Math.min(val, maxPayableAmount) : 0);
  };

  // Interest-Only loans: full interest owed for the missed days vs. what today's
  // amount actually covers.
  const interestShortfall = Math.max(0, (allocation.interestDue || 0) - interestPortion);

  // EMI loans: any schedule period whose due date has passed and isn't fully paid.
  const overdueEmiPeriods = (targetLoan?.repayment_schedule || []).filter(row =>
    row.due_date < collectionDate && (row.principal_paid < row.principal || row.interest_paid < row.interest)
  );
  const overdueEmiPrincipal = overdueEmiPeriods.reduce((s, r) => s + (r.principal - (r.principal_paid || 0)), 0);
  const overdueEmiInterest = overdueEmiPeriods.reduce((s, r) => s + (r.interest - (r.interest_paid || 0)), 0);

  const repaymentMethodLabel = targetLoan ? (isEmiLoan ? 'EMI' : 'Interest Only') : '';
  const interestCalcLabel = targetLoan
    ? (targetLoan.formula_type === 'CUSTOM' ? 'Custom' : (targetLoan.interest_calculation === 'CONSTANT_FLAT' ? 'Flat' : 'Flexible'))
    : '';
  const repaymentTypeLabel = targetLoan ? `${repaymentMethodLabel} · ${interestCalcLabel}` : '';
  const installmentFieldLabel = isEmiLoan ? 'Fixed EMI' : 'Suggested Collection';

  // Late fee: 2-day grace period, then a small suggested charge (waivable).
  const gracePeriodDays = 2;
  const overdueDaysForPenalty = Math.max(0, (daysSinceLastPayment || 0) - gracePeriodDays);
  const suggestedPenalty = (targetLoan && !isLoanCompleted && overdueDaysForPenalty > 0 && dailyEmi > 0)
    ? Math.min(Math.round(dailyEmi * 0.1 * overdueDaysForPenalty), dailyEmi * 5)
    : 0;
  const penaltyAmount = penaltyWaived ? 0 : suggestedPenalty;
  const totalToCollect = numericAmt + penaltyAmount;

  const paidToday = targetLoan ? loanHistory.some(h => h.collection_date === collectionDate) : false;
  const willCloseLoan = targetLoan && !isLoanCompleted && pendingBal > 0 && updatedPendingBal <= 0;

  const getModeLabel = (mode) => {
    switch (mode) {
      case 'CASH': return t('nce.mode_cash');
      case 'UPI': return t('nce.mode_upi');
      case 'BANK_TRANSFER': return t('nce.mode_bank_transfer');
      case 'CHEQUE': return t('nce.mode_cheque');
      default: return mode;
    }
  };

  const handleInitiatePayment = () => {
    if (!targetLoan || isLoanCompleted || numericAmt <= 0) return;
    setSubmitError('');
    setShowConfirmModal(true);
  };

  const executePostPayment = async () => {
    setShowConfirmModal(false);
    setPosting(true);
    setSubmitError('');
    try {
      const modeNote = txnRef.trim() ? ` [Ref: ${txnRef.trim()}]` : '';

      const payload = {
        loan_id: targetLoan.id,
        loan_account_no: targetLoan.loan_account_no,
        borrower_name: targetLoan.borrower_name,
        branch: targetLoan.branch,
        amount: numericAmt,
        principal_portion: principalPortion,
        interest_portion: interestPortion,
        new_principal_balance: updatedPendingBal,
        payment_mode: paymentMode,
        reference_no: txnRef.trim(),
        collector_name: collectorName,
        collection_date: collectionDate,
        payment_date: collectionDate,
        updated_schedule: allocation.updatedSchedule,
        penalty: penaltyAmount,
        notes: `${remarks}${modeNote}`,
        proof_image: proofImage,
        latitude: geoLocation?.lat ?? null,
        longitude: geoLocation?.lng ?? null
      };

      const res = await onRecordCollection?.(payload);
      setLastReceipt(res?.data || { ...payload, voucher_no: `JE-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` });
      setShowTickAnimation(true);

      setTxnRef('');
      setRemarks('');
      setPenaltyWaived(false);
      setProofImage(null);
    } catch (err) {
      console.error('Failed to post collection:', err);
      setSubmitError(err?.response?.data?.message || err?.message || 'Failed to record this payment. Please check your connection and try again.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="active-loans-page" style={{ fontFamily: 'InterVariable, Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif', paddingBottom: 60 }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button"
            onClick={onBack}
            title={t('nce.back_to_register')}
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: 10,
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
            }}
          >
            <ArrowLeft style={{ width: 16, height: 16, color: '#334155' }} />
          </button>

          <h1 style={{ margin: 0, fontSize: '1.22rem', fontWeight: 500, color: '#0F172A' }}>
            {t('nce.title')}
          </h1>
        </div>

        <span style={{
          background: 'var(--brand-primary-light, #F0FEF5)',
          border: '1px solid var(--brand-primary-border, #A3F5C1)',
          color: 'var(--brand-primary-hover, #0E5327)',
          padding: '5px 14px',
          borderRadius: 20,
          fontSize: '0.74rem',
          fontWeight: 500,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6
        }}>
          <ShieldCheck style={{ width: 14, height: 14, color: 'var(--brand-primary, #15803D)' }} />
          <span>{t('nce.branch_terminal_active')}</span>
        </span>
      </div>

      {/* ── Two-Column Layout ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── LEFT: Search + Profile ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 16,
            padding: 16,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 500 }}>
                {t('nce.search_label')}
              </label>
              {branchOptions.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Filter style={{ width: 11, height: 11, color: '#94A3B8' }} />
                  <SharedDropdown
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    disabled={Boolean(selectedBranch && selectedBranch !== 'ALL')}
                    size="sm"
                    buttonStyle={{ height: 28, fontSize: '0.72rem', minWidth: 120, padding: '0 8px' }}
                    options={[
                      { value: 'ALL', label: 'All Branches' },
                      ...branchOptions.map(b => ({ value: b, label: b }))
                    ]}
                  />
                </div>
              )}
            </div>

            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Search style={{ position: 'absolute', left: 12, top: 11, width: 15, height: 15, color: '#94A3B8' }} />
              <input
                type="text"
                placeholder={t('nce.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', height: 38, padding: '0 12px 0 34px', borderRadius: 9, border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A', boxSizing: 'border-box' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: 9, top: 9, background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
                >
                  <X style={{ width: 12, height: 12 }} />
                </button>
              )}

              {searchQuery.trim() && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 99999, background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 10, boxShadow: '0 14px 35px -5px rgba(15, 23, 42, 0.25)', maxHeight: 240, overflowY: 'auto', padding: 6 }}>
                  {filteredLoans.length === 0 ? (
                    <div style={{ padding: '12px 8px', fontSize: '0.78rem', color: '#94A3B8', textAlign: 'center' }}>
                      {t('nce.no_matching_customer_prefix')} "{searchQuery}"
                    </div>
                  ) : (
                    filteredLoans.map(item => {
                      const isSelected = String(item.id) === String(selectedLoanId);
                      return (
                        <div
                          key={item.id}
                          onClick={() => { setSelectedLoanId(item.id); setSearchQuery(''); }}
                          style={{ padding: '8px 10px', borderRadius: 8, background: isSelected ? 'var(--brand-primary-light, #F0FEF5)' : '#FFFFFF', cursor: 'pointer' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 500, color: isSelected ? 'var(--brand-primary, #15803D)' : '#0F172A' }}>{item.borrower_name}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-info, #2563EB)', fontFamily: 'monospace' }}>{item.loan_account_no}</span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                            <span>{item.phone || '—'}</span>
                            <span style={{ color: item.pending_amount > 0 ? 'var(--color-danger, #DC2626)' : 'var(--brand-primary, #15803D)', fontWeight: 500 }}>₹{fmt(item.pending_amount)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <SharedDropdown
              value={selectedLoanId}
              placeholder="-- Select Customer --"
              onChange={(e) => setSelectedLoanId(e.target.value)}
              searchable
              options={(branchFilter === 'ALL' ? activeLoans : activeLoans.filter(l => l.branch === branchFilter)).map(l => ({
                value: l.id,
                label: `${l.loan_account_no} • ${l.borrower_name}`
              }))}
            />
          </div>

          {/* Profile card — always rendered; empty placeholders until selected. */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 20, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)', opacity: targetLoan ? 1 : 0.6 }}>

            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              {profilePhoto ? (
                <img src={profilePhoto} alt={borrowerName} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--brand-primary-border, #A3F5C1)', margin: '0 auto 10px auto' }} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: targetLoan ? 'linear-gradient(135deg, var(--brand-primary-light, #F0FEF5) 0%, #D1FAE5 100%)' : '#F1F5F9', border: `2px solid ${targetLoan ? 'var(--brand-primary-border, #A3F5C1)' : '#E2E8F0'}`, color: targetLoan ? 'var(--brand-primary, #15803D)' : '#CBD5E1', fontSize: '1.25rem', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto' }}>
                  {targetLoan ? (borrowerName || 'C').slice(0, 2).toUpperCase() : <User style={{ width: 24, height: 24 }} />}
                </div>
              )}

              <h3
                onClick={() => targetLoan && setSelectedCustomerForProfile(targetBorrower || { full_name: borrowerName, phone: phoneNo, branch: branchLoc })}
                style={{ margin: 0, fontSize: '1.02rem', fontWeight: 500, color: targetLoan ? '#0F172A' : '#94A3B8', cursor: targetLoan ? 'pointer' : 'default' }}
              >
                {targetLoan ? borrowerName : t('nce.no_customer_selected')}
              </h3>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {targetLoan && (
                  <span style={{ background: 'var(--color-info-light, #EFF6FF)', border: '1px solid var(--color-info-border, #BFDBFE)', color: 'var(--color-info, #2563EB)', padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 500, fontFamily: 'monospace' }}>
                    {targetLoan.loan_account_no}
                  </span>
                )}
                {targetLoan && (
                  <span style={{ background: '#FEF3C7', border: '1px solid var(--color-warning-border, #FDE68A)', color: 'var(--color-warning-text, #92400E)', padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 500 }}>
                    {repaymentTypeLabel}
                  </span>
                )}
                {isLoanCompleted && (
                  <span style={{ background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary-hover, #0E5327)', padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 style={{ width: 11, height: 11 }} /> Completed
                  </span>
                )}
                {!isLoanCompleted && paidToday && (
                  <span style={{ background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary-hover, #0E5327)', padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600 }}>
                    Today Paid
                  </span>
                )}
              </div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: '0.62rem', color: '#64748B', display: 'block' }}>{t('nce.phone')}</span>
                <span style={{ fontSize: '0.8rem', color: targetLoan ? '#0F172A' : '#CBD5E1', fontWeight: 500 }}>{phoneNo || '—'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.62rem', color: '#64748B', display: 'block' }}>{t('nce.branch_location')}</span>
                <span style={{ fontSize: '0.8rem', color: targetLoan ? '#0F172A' : '#CBD5E1', fontWeight: 500 }}>{branchLoc || '—'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.62rem', color: '#64748B', display: 'block' }}>{t('nce.sanctioned_principal')}</span>
                <span style={{ fontSize: '0.8rem', color: targetLoan ? '#0F172A' : '#CBD5E1', fontWeight: 500 }}>{targetLoan ? `₹${fmt(principalAmt)}` : '—'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.62rem', color: '#64748B', display: 'block' }}>{targetLoan ? installmentFieldLabel : t('nce.daily_emi')}</span>
                <span style={{ fontSize: '0.8rem', color: targetLoan ? 'var(--color-info, #2563EB)' : '#CBD5E1', fontWeight: 500 }}>{targetLoan ? `₹${fmt(dailyEmi)}` : '—'}</span>
              </div>
              {!isLoanCompleted && (
                <>
                  <div>
                    <span style={{ fontSize: '0.62rem', color: '#64748B', display: 'block' }}>Last Paid</span>
                    <span style={{ fontSize: '0.8rem', color: targetLoan ? '#0F172A' : '#CBD5E1', fontWeight: 500 }}>{targetLoan ? (lastPaymentDate || 'Never') : '—'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.62rem', color: '#64748B', display: 'block' }}>Missed Days</span>
                    <span style={{ fontSize: '0.8rem', color: targetLoan ? (daysSinceLastPayment > 2 ? 'var(--color-danger, #DC2626)' : '#0F172A') : '#CBD5E1', fontWeight: 600 }}>
                      {targetLoan ? (daysSinceLastPayment === null ? '—' : `${daysSinceLastPayment}d`) : '—'}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div style={{ background: targetLoan ? 'linear-gradient(135deg, var(--brand-primary-light, #F0FEF5) 0%, var(--brand-primary-light, #F0FDF4) 100%)' : '#F8FAFC', border: `1px solid ${targetLoan ? 'var(--brand-primary-border, #A3F5C1)' : '#E2E8F0'}`, borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--brand-primary-hover, #0E5327)', fontWeight: 500 }}>{t('nce.total_collected_prefix')} ₹{fmt(collectedAmt)}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-danger-text, #991B1B)', fontWeight: 500 }}>{t('nce.pending_prefix')} ₹{fmt(pendingBal)}</span>
              </div>
              <div style={{ height: 7, background: '#CBD5E1', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--brand-primary, #15803D)', borderRadius: 10, transition: 'width 0.4s ease' }} />
              </div>
              <span style={{ fontSize: '0.66rem', color: 'var(--brand-primary-hover, #0E5327)', display: 'block', textAlign: 'right', marginTop: 5 }}>
                {progressPercent}% {t('nce.principal_repaid_suffix')}
              </span>
            </div>
          </div>

        </div>

        {/* ── RIGHT: Collection Form (or Completed / Empty state) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {!targetLoan ? (
            <div style={{ background: '#FFFFFF', border: '1px dashed #E2E8F0', borderRadius: 16, padding: 60, textAlign: 'center', color: '#94A3B8' }}>
              <Search style={{ width: 28, height: 28, margin: '0 auto 10px auto', opacity: 0.5 }} />
              <div style={{ fontSize: '0.88rem' }}>Select a customer to begin recording a collection.</div>
            </div>
          ) : isLoanCompleted ? (
            <div style={{ background: '#FFFFFF', border: '1px solid var(--brand-primary-border, #A3F5C1)', borderRadius: 16, padding: 48, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto' }}>
                <Lock style={{ width: 26, height: 26 }} />
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', color: '#0F172A' }}>This loan is fully paid</h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B' }}>
                {targetLoan.status === 'PENDING_CLOSURE'
                  ? 'A closure request is with Admin for approval — no further collections can be recorded.'
                  : 'This account is closed — no further collections can be recorded.'}
              </p>
            </div>
          ) : (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, padding: 24, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)' }}>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 6 }}>
                  {t('nce.collection_amount_rs')}
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: 10, fontSize: '1.05rem', color: 'var(--brand-primary, #15803D)', fontWeight: 500 }}>₹</span>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={handleAmountChange}
                    max={maxPayableAmount}
                    min={0}
                    placeholder="0.00"
                    style={{ width: '100%', height: 44, padding: '0 14px 0 32px', borderRadius: 10, border: '1px solid var(--brand-primary-border, #A3F5C1)', background: 'var(--brand-primary-light, #F0FDF4)', fontSize: '1.1rem', fontWeight: 500, color: 'var(--brand-primary, #15803D)', boxSizing: 'border-box' }}
                    required
                  />
                </div>
                <span style={{ fontSize: '0.68rem', color: '#94A3B8', display: 'block', marginTop: 4 }}>
                  Max ₹{fmt(maxPayableAmount)} clears this loan in full
                </span>
              </div>

              {/* Compact allocation summary */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 14, marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 10 }}>
                <div>
                  <span style={{ fontSize: '0.64rem', color: '#64748B', display: 'block' }}>{t('nce.principal_portion')}</span>
                  <span style={{ fontSize: '0.95rem', color: '#0F172A', fontWeight: 500 }}>₹{fmt(principalPortion)}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.64rem', color: '#64748B', display: 'block' }}>{t('nce.interest_component')}{daysSinceLastPayment !== null ? ` (${daysSinceLastPayment}d)` : ''}</span>
                  <span style={{ fontSize: '0.95rem', color: '#7C3AED', fontWeight: 500 }}>₹{fmt(interestPortion)}</span>
                </div>
                <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: 10 }}>
                  <span style={{ fontSize: '0.64rem', color: 'var(--brand-primary-hover, #0E5327)', display: 'block' }}>{t('nce.updated_pending_balance')}</span>
                  <span style={{ fontSize: '1rem', color: updatedPendingBal > 0 ? 'var(--color-danger, #DC2626)' : 'var(--brand-primary, #15803D)', fontWeight: 500 }}>₹{fmt(updatedPendingBal)}</span>
                </div>
              </div>

              {(interestShortfall > 0 || overdueEmiPeriods.length > 0 || willCloseLoan) && (
                <div style={{ fontSize: '0.74rem', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {interestShortfall > 0 && (
                    <span style={{ color: 'var(--color-danger-text, #991B1B)' }}>⚠ ₹{fmt(interestShortfall)} interest still due after this payment</span>
                  )}
                  {overdueEmiPeriods.length > 0 && (
                    <span style={{ color: 'var(--color-danger-text, #991B1B)' }}>⚠ {overdueEmiPeriods.length} overdue installment{overdueEmiPeriods.length === 1 ? '' : 's'} (₹{fmt(overdueEmiPrincipal + overdueEmiInterest)} owed)</span>
                  )}
                  {willCloseLoan && (
                    <span style={{ color: 'var(--brand-primary-hover, #0E5327)' }}>✓ This clears the loan — it will be sent to Admin for closure approval</span>
                  )}
                </div>
              )}

              {suggestedPenalty > 0 && (
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#9A3412', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '8px 12px', marginBottom: 16, cursor: 'pointer' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="checkbox" checked={penaltyWaived} onChange={(e) => setPenaltyWaived(e.target.checked)} />
                    Waive suggested late fee
                  </span>
                  <strong style={{ textDecoration: penaltyWaived ? 'line-through' : 'none', color: penaltyWaived ? '#94A3B8' : '#C2410C' }}>₹{fmt(suggestedPenalty)}</strong>
                </label>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 6 }}>
                  {t('nce.payment_mode')}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[
                    { id: 'CASH', label: t('nce.mode_cash'), icon: Banknote },
                    { id: 'UPI', label: t('nce.mode_upi'), icon: Smartphone },
                    { id: 'BANK_TRANSFER', label: t('nce.mode_bank_transfer'), icon: CreditCard },
                    { id: 'CHEQUE', label: t('nce.mode_cheque'), icon: FileSpreadsheet }
                  ].map(item => {
                    const Icon = item.icon;
                    const isSelected = paymentMode === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setPaymentMode(item.id)}
                        style={{ height: 42, borderRadius: 10, border: `1px solid ${isSelected ? 'var(--brand-primary-border, #A3F5C1)' : '#E2E8F0'}`, background: isSelected ? 'var(--brand-primary-light, #F0FEF5)' : '#FFFFFF', color: isSelected ? 'var(--brand-primary-hover, #0E5327)' : '#475569', fontSize: '0.72rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        <Icon style={{ width: 14, height: 14 }} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {paymentMode !== 'CASH' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 5 }}>
                    {paymentMode === 'UPI' ? t('nce.ref_upi') : paymentMode === 'CHEQUE' ? t('nce.ref_cheque') : t('nce.ref_bank_transfer')}
                  </label>
                  <input
                    type="text"
                    value={txnRef}
                    onChange={(e) => setTxnRef(e.target.value)}
                    placeholder="Reference number"
                    style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 9, border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A', boxSizing: 'border-box' }}
                    required
                  />
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 6 }}>
                  {t('nce.proof_of_payment')}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {proofImage ? (
                    <div style={{ position: 'relative' }}>
                      <img src={proofImage} alt="Proof" style={{ width: 54, height: 54, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--brand-primary-border, #A3F5C1)' }} />
                      <button
                        type="button"
                        onClick={() => setProofImage(null)}
                        style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: 'var(--color-danger, #DC2626)', color: '#FFFFFF', border: '2px solid #FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <X style={{ width: 10, height: 10 }} />
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="proof-upload-input" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 38, padding: '0 14px', borderRadius: 9, border: '1px dashed #CBD5E1', background: '#F8FAFC', fontSize: '0.76rem', color: '#475569', fontWeight: 500, cursor: 'pointer' }}>
                      <Camera style={{ width: 14, height: 14 }} />
                      <span>{t('nce.upload_proof')}</span>
                    </label>
                  )}
                  <input id="proof-upload-input" type="file" accept="image/*" onChange={handleProofChange} style={{ display: 'none' }} />

                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', fontWeight: 500,
                    color: geoStatus === 'granted' ? 'var(--brand-primary-hover, #0E5327)' : '#94A3B8', marginLeft: 'auto'
                  }}>
                    <MapPin style={{ width: 12, height: 12 }} />
                    {geoStatus === 'locating' && t('nce.geo_locating')}
                    {geoStatus === 'granted' && t('nce.geo_captured')}
                    {geoStatus === 'denied' && t('nce.geo_denied')}
                    {geoStatus === 'unavailable' && t('nce.geo_unavailable')}
                    {geoStatus === 'insecure' && t('nce.geo_insecure')}
                    {geoStatus === 'timeout' && t('nce.geo_timeout')}
                    {(geoStatus === 'denied' || geoStatus === 'unavailable' || geoStatus === 'timeout') && (
                      <button type="button" onClick={requestLocation} style={{ border: 'none', background: 'none', color: 'var(--brand-primary, #15803D)', fontWeight: 600, cursor: 'pointer', fontSize: '0.7rem', textDecoration: 'underline', padding: 0 }}>
                        {t('nce.geo_retry')}
                      </button>
                    )}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                    {t('nce.collector_staff')}
                  </label>
                  <SharedDropdown
                    value={collectorName}
                    onChange={(e) => setCollectorName(e.target.value)}
                    options={[
                      { value: 'K. Ramesh (Field Officer)', label: 'K. Ramesh (Field Officer)' },
                      { value: 'S. Priya (Counter Staff)', label: 'S. Priya (Counter Staff)' },
                      { value: 'M. Vignesh (Collection Head)', label: 'M. Vignesh (Manager)' },
                      { value: 'Online Self-Pay', label: 'Online Self-Pay' }
                    ]}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                    {t('nce.transaction_date')}
                  </label>
                  <SharedDatePicker
                    value={collectionDate}
                    onChange={(e) => setCollectionDate(e.target.value)}
                    buttonStyle={{ height: 38 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                  {t('nce.payment_remarks')}
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional notes..."
                  style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.8rem', color: '#334155', boxSizing: 'border-box' }}
                />
              </div>

              {submitError && (
                <div style={{ background: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FECACA)', borderRadius: 9, padding: '9px 12px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle style={{ width: 13, height: 13, color: 'var(--color-danger, #DC2626)', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.76rem', color: 'var(--color-danger-text, #991B1B)' }}>{submitError}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
                <button
                  type="button"
                  onClick={onBack}
                  style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 10, padding: '10px 20px', fontSize: '0.82rem', fontWeight: 500, color: '#475569', cursor: 'pointer' }}
                >
                  {t('btn.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleInitiatePayment}
                  disabled={posting || numericAmt <= 0}
                  style={{ background: (posting || numericAmt <= 0) ? '#94A3B8' : 'var(--brand-primary, #15803D)', border: 'none', borderRadius: 10, padding: '10px 28px', fontSize: '0.86rem', fontWeight: 500, color: '#FFFFFF', cursor: (posting || numericAmt <= 0) ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <Send style={{ width: 15, height: 15 }} />
                  <span>{posting ? t('nce.posting_payment') : t('nce.post_collection_payment')}</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ── Payment History ─────────────────────────────────── */}
      {targetLoan && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, padding: 22, marginTop: 20, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 500, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock style={{ width: 16, height: 16, color: 'var(--brand-primary, #15803D)' }} />
              Payment History
            </h3>
            <span style={{ fontSize: '0.74rem', color: '#64748B' }}>{loanHistory.length} payment{loanHistory.length === 1 ? '' : 's'}</span>
          </div>

          {loanHistory.length === 0 ? (
            <div style={{ padding: '16px 0', textAlign: 'center', color: '#94A3B8', fontSize: '0.82rem' }}>
              No payments recorded yet for this loan.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748B', fontWeight: 500 }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748B', fontWeight: 500 }}>Voucher No</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: '#64748B', fontWeight: 500 }}>Amount</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: '#64748B', fontWeight: 500 }}>Principal</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: '#64748B', fontWeight: 500 }}>Interest</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748B', fontWeight: 500 }}>Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {loanHistory.map(rec => (
                    <tr key={rec.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '7px 8px', color: '#334155' }}>{rec.collection_date}</td>
                      <td style={{ padding: '7px 8px', color: 'var(--color-info, #2563EB)', fontFamily: 'monospace' }}>{rec.voucher_no}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600, color: '#0F172A' }}>₹{fmt(rec.amount)}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', color: '#0F172A' }}>₹{fmt(rec.principal_paid ?? rec.principal_portion ?? rec.principalPaid ?? 0)}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', color: '#7C3AED' }}>₹{fmt(rec.interest_paid ?? rec.interest_portion ?? rec.interestPaid ?? 0)}</td>
                      <td style={{ padding: '7px 8px', color: '#334155' }}>{getModeLabel(rec.payment_mode)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Confirmation Modal ──────────────────────────────── */}
      {showConfirmModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 18, width: '100%', maxWidth: 440, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 style={{ width: 20, height: 20 }} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 500, color: '#0F172A' }}>
                {t('nce.confirm_collection_payment')}
              </h3>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 14, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: '#64748B' }}>{borrowerName}</span>
                <span style={{ color: 'var(--color-info, #2563EB)', fontFamily: 'monospace' }}>{targetLoan?.loan_account_no}</span>
              </div>
              <div style={{ height: 1, background: '#E2E8F0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                <span style={{ color: 'var(--brand-primary-hover, #0E5327)', fontWeight: 500 }}>{t('nce.collection_amount_label')}</span>
                <span style={{ color: 'var(--brand-primary, #15803D)', fontWeight: 500 }}>₹{fmt(numericAmt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748B' }}>
                <span>Principal ₹{fmt(principalPortion)} • Interest ₹{fmt(interestPortion)}</span>
                <span>New Bal ₹{fmt(updatedPendingBal)}</span>
              </div>
              {penaltyAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', paddingTop: 6, borderTop: '1px dashed #E2E8F0' }}>
                  <span style={{ color: '#0F172A', fontWeight: 600 }}>Total (incl. ₹{fmt(penaltyAmount)} late fee)</span>
                  <span style={{ color: '#0F172A', fontWeight: 600 }}>₹{fmt(totalToCollect)}</span>
                </div>
              )}
            </div>

            {paidToday && (
              <div style={{ fontSize: '0.74rem', color: 'var(--color-warning-text, #92400E)', marginBottom: 12 }}>⚠ A payment was already recorded for this loan today.</div>
            )}
            {willCloseLoan && (
              <div style={{ fontSize: '0.74rem', color: 'var(--brand-primary-hover, #0E5327)', marginBottom: 12 }}>✓ This fully clears the loan — it will go to Admin for closure approval.</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setShowConfirmModal(false)} style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 9, padding: '9px 16px', fontSize: '0.8rem', color: '#475569', cursor: 'pointer' }}>
                {t('btn.cancel')}
              </button>
              <button type="button" onClick={executePostPayment} style={{ background: 'var(--brand-primary, #15803D)', border: 'none', borderRadius: 9, padding: '9px 22px', fontSize: '0.8rem', fontWeight: 500, color: '#FFFFFF', cursor: 'pointer' }}>
                {t('nce.confirm_post_payment')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success Overlay ─────────────────────────────────── */}
      {showTickAnimation && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <style>{`
            @keyframes tickPop { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
            @keyframes tickPulse { 0% { box-shadow: 0 0 0 0 rgba(var(--brand-primary-rgb), 0.4); } 70% { box-shadow: 0 0 0 24px rgba(var(--brand-primary-rgb), 0); } 100% { box-shadow: 0 0 0 0 rgba(var(--brand-primary-rgb), 0); } }
          `}</style>
          <div style={{ background: '#FFFFFF', borderRadius: 22, padding: '32px 40px', textAlign: 'center', animation: 'tickPop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
            <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'var(--brand-primary, #15803D)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto', animation: 'tickPulse 1.8s infinite' }}>
              <Check style={{ width: 38, height: 38, strokeWidth: 3 }} />
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 500, color: '#0F172A' }}>
              {t('nce.payment_recorded')}
            </h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--brand-primary, #15803D)', fontWeight: 500 }}>
              {t('nce.posted_to_ledger')}
            </span>
            {lastReceipt?.synced === false && (
              <div style={{ marginTop: 8, fontSize: '0.7rem', color: 'var(--color-warning-hover, #B45309)', background: 'var(--color-warning-light, #FFFBEB)', border: '1px solid var(--color-warning-border, #FDE68A)', borderRadius: 8, padding: '6px 10px' }}>
                Saved locally — will sync once the server is reachable.
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 18 }}>
              <button type="button" onClick={() => setShowReceiptPrint(true)} style={{ border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', padding: '9px 18px', borderRadius: 9, fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Printer style={{ width: 14, height: 14 }} />
                <span>Print Receipt</span>
              </button>
              <button type="button" onClick={() => setShowTickAnimation(false)} style={{ border: 'none', background: 'var(--brand-primary, #15803D)', color: '#FFFFFF', padding: '9px 22px', borderRadius: 9, fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Printable Receipt — portaled straight to <body> so the print
          stylesheet (which hides #root and shows only this overlay) can
          actually find it; nested inside #root it would print blank. ──── */}
      {showReceiptPrint && lastReceipt && createPortal(
        <div className="paper-receipt-printable-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999999, background: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="paper-receipt-document" style={{ background: '#FFFFFF', color: '#000000', borderRadius: 2, width: 320, maxWidth: '100%', maxHeight: '94vh', overflowY: 'auto', border: '1px solid #000000', fontFamily: '"Courier New", Courier, monospace', padding: '20px 16px', boxSizing: 'border-box', position: 'relative', fontSize: '0.78rem', lineHeight: 1.45 }}>
            <button type="button" className="no-print" onClick={() => setShowReceiptPrint(false)} style={{ position: 'absolute', right: 12, top: 12, background: '#FFFFFF', border: '1px solid #000000', color: '#000000', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X style={{ width: 12, height: 12 }} />
            </button>

            <div style={{ textAlign: 'center', borderBottom: '1px dashed #000000', paddingBottom: 10, marginBottom: 10 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase' }}>{targetLoan?.branch || 'Branch'} Finance Office</div>
              <div style={{ marginTop: 6, fontWeight: 700, border: '1px solid #000000', display: 'inline-block', padding: '2px 8px', fontSize: '0.7rem' }}>PAYMENT COLLECTION RECEIPT</div>
            </div>

            <div style={{ borderBottom: '1px dashed #000000', paddingBottom: 8, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Voucher No:</span><strong>{lastReceipt.voucher_no}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Date:</span><span>{lastReceipt.collection_date || collectionDate}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Account No:</span><strong>{targetLoan?.loan_account_no}</strong></div>
            </div>

            <div style={{ borderBottom: '1px dashed #000000', paddingBottom: 8, marginBottom: 8 }}>
              <div>Borrower: <strong>{borrowerName}</strong></div>
              <div>Mobile  : <span>{phoneNo}</span></div>
              <div>Mode    : <span>{getModeLabel(lastReceipt.payment_mode)} {lastReceipt.reference_no ? `(${lastReceipt.reference_no})` : ''}</span></div>
            </div>

            <div style={{ borderBottom: '1px dashed #000000', paddingBottom: 10, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 700, padding: '4px 0', borderBottom: '1px solid #000000' }}><span>RECEIVED:</span><span>Rs. {fmt(lastReceipt.amount)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}><span>Principal:</span><span>Rs. {fmt(lastReceipt.principal_paid ?? lastReceipt.principal_portion ?? lastReceipt.principalPaid ?? 0)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}><span>Interest:</span><span>Rs. {fmt(lastReceipt.interest_paid ?? lastReceipt.interest_portion ?? lastReceipt.interestPaid ?? 0)}</span></div>
              {lastReceipt.penalty > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}><span>Late Fee:</span><span>Rs. {fmt(lastReceipt.penalty)}</span></div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontWeight: 700 }}><span>Pending Balance:</span><span>Rs. {fmt(Math.max(0, lastReceipt.newPrincipalBalance ?? lastReceipt.new_principal_balance))}</span></div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '0.68rem' }}>
              <div>Collector: <strong>{lastReceipt.collector_name || collectorName}</strong></div>
              <div style={{ margin: '8px 0 4px 0', borderTop: '1px dashed #000000', paddingTop: 6 }}>*** THANK YOU - PAID SUCCESSFULLY ***</div>
            </div>

            <div className="no-print" style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid #000000', fontFamily: 'InterVariable, Inter, -apple-system, sans-serif' }}>
              <button type="button" onClick={() => window.print()} style={{ border: '1.5px solid #000000', background: '#000000', color: '#FFFFFF', padding: '8px 16px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Printer style={{ width: 14, height: 14 }} />
                <span>Print</span>
              </button>
              <button type="button" onClick={() => setShowReceiptPrint(false)} style={{ border: '1px solid #000000', background: '#FFFFFF', color: '#000000', padding: '8px 14px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Customer Profile Modal */}
      {selectedCustomerForProfile && (
        <CustomerProfileModal
          borrower={selectedCustomerForProfile}
          onClose={() => setSelectedCustomerForProfile(null)}
          onEdit={() => setSelectedCustomerForProfile(null)}
        />
      )}

    </div>
  );
}
