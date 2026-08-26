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
  MapPin,
  Calendar,
  Sparkles,
  Receipt
} from 'lucide-react';
import CustomerProfileModal from '../borrowers/CustomerProfileModal';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  resolveInterestPaidUpto,
  calculateInterestForDateRange,
  daysBetween
} from '../../utils/loanCalculations';
import SharedDropdown from '../../components/common/SharedDropdown';
import SharedDatePicker from '../../components/common/SharedDatePicker';
import { uploadFile } from '../../api/upload';
import api from '../../api/client';
import VoucherReceiptModal from '../../components/VoucherReceiptModal';

export default function NewCollectionEntryPage({
  loans = [],
  borrowers = [],
  collections = [],
  loanSchemes = [],
  tenant,
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

  // Interest Paid Upto & Date Range Setup
  const curInterestPaidUpto = resolveInterestPaidUpto(targetLoan);
  // Next day after last paid date is the minimum selectable date
  const minInterestUptoDate = (() => {
    if (!curInterestPaidUpto) return null;
    const d = new Date(curInterestPaidUpto);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  const [interestUptoDate, setInterestUptoDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Manual Breakdown Entry States
  const [manualPrincipal, setManualPrincipal] = useState('');
  const [manualInterest, setManualInterest] = useState('');
  const [additionalCharges, setAdditionalCharges] = useState('');
  const [shortfallAction, setShortfallAction] = useState('CARRY_FORWARD'); // 'CARRY_FORWARD' | 'WAIVE'

  // General Collection Form State
  const [paymentMode, setPaymentMode] = useState('CASH'); // 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE'
  const [bankAccountId, setBankAccountId] = useState('');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [txnRef, setTxnRef] = useState('');

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
  const [collectorName, setCollectorName] = useState('K. Ramesh (Field Officer)');
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState('');
  const [posting, setPosting] = useState(false);
  const [selectedCustomerForProfile, setSelectedCustomerForProfile] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [lastReceipt, setLastReceipt] = useState(null);
  const [showReceiptPrint, setShowReceiptPrint] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showTickAnimation, setShowTickAnimation] = useState(false);

  // Proof-of-payment photo
  const [proofImage, setProofImage] = useState(null);

  // GPS stamp for doorstep collections
  const [geoLocation, setGeoLocation] = useState(null); // { lat, lng, accuracy }
  const [geoStatus, setGeoStatus] = useState('idle');

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
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );
  };

  useEffect(() => { requestLocation(); }, []);

  const handleProofChange = async (e) => {
    const file = e.target.files && e.target.files[0];
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
    try {
      const res = await uploadFile(file, { subfolder: 'collections', category: 'receipt_proof', prefix: 'receipt_proof' });
      if (res?.url) {
        setProofImage(res.url);
      }
    } catch {
      setSubmitError('Failed to upload proof image.');
    }
  };

  const isEmiLoan = targetLoan?.formula_type === 'CUSTOM'
    ? targetLoan?.accrual_mode === 'SCHEDULED'
    : targetLoan?.repayment_method === 'EMI';

  // Fill in suggested amounts once a loan is selected
  useEffect(() => {
    if (!targetLoan || isLoanCompleted) {
      setManualPrincipal('');
      setManualInterest('');
      setAdditionalCharges('');
      setShortfallAction('CARRY_FORWARD');
      setSubmitError('');
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const resolvedMin = minInterestUptoDate;
    let initialDate = todayStr;
    if (resolvedMin && todayStr < resolvedMin) {
      initialDate = resolvedMin;
    }
    setInterestUptoDate(initialDate);

    const suggInterest = calculateInterestForDateRange({
      loan: targetLoan,
      fromDate: curInterestPaidUpto,
      toDate: initialDate
    });

    if (isEmiLoan) {
      const emiAmt = parseFloat(targetLoan.installment_amount) || 0;
      const suggPrin = Math.max(0, Math.min(pendingBal, emiAmt - suggInterest));
      setManualInterest(String(suggInterest));
      setManualPrincipal(String(suggPrin));
    } else {
      setManualInterest(String(suggInterest));
      setManualPrincipal('0');
    }
    setAdditionalCharges('');
    setShortfallAction('CARRY_FORWARD');
    setSubmitError('');
  }, [selectedLoanId]);

  // When staff changes interestUptoDate, recompute suggested interest
  const handleInterestUptoDateChange = (newDate) => {
    setInterestUptoDate(newDate);
    if (!targetLoan) return;
    const suggInterest = calculateInterestForDateRange({
      loan: targetLoan,
      fromDate: curInterestPaidUpto,
      toDate: newDate
    });
    setManualInterest(String(suggInterest));
  };

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

  const interestBreakdown = calculateInterestForDateRange({
    loan: targetLoan,
    fromDate: curInterestPaidUpto,
    toDate: interestUptoDate,
    includeArrears: true
  });

  const numericPrincipal = Math.max(0, parseFloat(manualPrincipal) || 0);
  const numericInterest = Math.max(0, parseFloat(manualInterest) || 0);
  const numericAdditional = Math.max(0, parseFloat(additionalCharges) || 0);
  const totalAmountToCollect = Math.round((numericPrincipal + numericInterest + numericAdditional) * 100) / 100;
  const updatedPendingBal = Math.max(0, pendingBal - numericPrincipal);
  const interestDays = daysBetween(curInterestPaidUpto, interestUptoDate);
  const progressPercent = Math.min(100, Math.max(0, Math.round(((collectedAmt + numericPrincipal) / (principalAmt || 1)) * 100)));
  const paidToday = targetLoan ? loanHistory.some(h => h.collection_date === collectionDate) : false;
  const willCloseLoan = targetLoan && !isLoanCompleted && pendingBal > 0 && updatedPendingBal <= 0;

  // Shortfall & Arrears
  const interestShortfallAmount = Math.max(0, Math.round((interestBreakdown.totalSuggestedInterest - numericInterest) * 100) / 100);
  const hasShortfall = interestShortfallAmount > 0;
  const newPendingArrears = shortfallAction === 'CARRY_FORWARD' ? interestShortfallAmount : 0;

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
    if (!targetLoan || isLoanCompleted || totalAmountToCollect <= 0) return;
    if (numericPrincipal > pendingBal + 0.01) {
      setSubmitError(`Principal amount (₹${fmt(numericPrincipal)}) cannot exceed outstanding principal balance (₹${fmt(pendingBal)}).`);
      return;
    }
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
        bank_account_id: paymentMode !== 'CASH' && bankAccountId ? Number(bankAccountId) : (paymentMode !== 'CASH' && bankAccounts[0]?.id ? Number(bankAccounts[0].id) : null),
        settlement_account_code: paymentMode !== 'CASH' ? (bankAccounts.find(b => String(b.id) === String(bankAccountId))?.ledger_account_code || bankAccounts[0]?.ledger_account_code || '1002') : null,
        reference_no: txnRef.trim(),
        collector_name: collectorName,
        collection_date: collectionDate,
        payment_date: collectionDate,
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 20, alignItems: 'start' }}>

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

              {/* ── 1. Interest Period & Date Selection ── */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar style={{ width: 15, height: 15, color: 'var(--brand-primary, #15803D)' }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0F172A' }}>
                      Interest Paid Up To Date
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#64748B', background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '2px 8px', borderRadius: 12 }}>
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
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-primary, #15803D)', background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', padding: '4px 10px', borderRadius: 8 }}>
                      {interestDays} Day{interestDays === 1 ? '' : 's'}
                    </span>
                    <span style={{ fontSize: '0.62rem', color: '#94A3B8', marginTop: 2 }}>
                      {targetLoan.monthly_interest_rate || 0}% / mo
                    </span>
                  </div>
                </div>
              </div>

              {/* ── 2. Component Breakdown (Manual Entry) ── */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                  Collection Breakdown (Manual Entry)
                </label>

                {/* Past Arrears Notification Banner */}
                {interestBreakdown.pastArrears > 0 && (
                  <div style={{ background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: '0.74rem', color: '#6B21A8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <span>Past Unpaid Interest Arrears: <strong>₹{fmt(interestBreakdown.pastArrears)}</strong></span>
                    <span>Current Accrued ({interestDays}d): <strong>₹{fmt(interestBreakdown.periodInterest)}</strong></span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  
                  {/* Principal Input */}
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#334155', fontWeight: 500, display: 'block', marginBottom: 4 }}>
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
                        height: 42,
                        padding: '0 10px',
                        borderRadius: 9,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: '#0F172A',
                        background: '#FFFFFF',
                        boxSizing: 'border-box'
                      }}
                    />
                    <span style={{ fontSize: '0.62rem', color: '#64748B', display: 'block', marginTop: 3 }}>
                      Bal: ₹{fmt(pendingBal)}
                    </span>
                  </div>

                  {/* Interest Input */}
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#6B21A8', fontWeight: 500, display: 'block', marginBottom: 4 }}>
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
                        height: 42,
                        padding: '0 10px',
                        borderRadius: 9,
                        border: '1px solid #DDD6FE',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: '#7C3AED',
                        background: '#FAF5FF',
                        boxSizing: 'border-box'
                      }}
                    />
                    <span style={{ fontSize: '0.62rem', color: '#7C3AED', display: 'block', marginTop: 3 }}>
                      Sugg: ₹{fmt(interestBreakdown.totalSuggestedInterest)}
                    </span>
                  </div>

                  {/* Additional Charges / Penalty Input */}
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#C2410C', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                      Additional / Fees (₹)
                    </span>
                    <input
                      type="number"
                      value={additionalCharges}
                      onChange={(e) => setAdditionalCharges(e.target.value)}
                      min={0}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        height: 42,
                        padding: '0 10px',
                        borderRadius: 9,
                        border: '1px solid #FED7AA',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: '#C2410C',
                        background: '#FFF7ED',
                        boxSizing: 'border-box'
                      }}
                    />
                    <span style={{ fontSize: '0.62rem', color: '#9A3412', display: 'block', marginTop: 3 }}>
                      Late/Other fees
                    </span>
                  </div>
                </div>

                {/* Shortfall Resolution Card (Option 4 with Option 1 as default) */}
                {hasShortfall && (
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 12px', marginTop: 10, fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 4 }}>
                      <span style={{ fontWeight: 700, color: '#92400E' }}>
                        Interest Difference: ₹{fmt(interestShortfallAmount)}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#B45309' }}>
                        Suggested ₹{fmt(interestBreakdown.totalSuggestedInterest)} vs Entered ₹{fmt(numericInterest)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#78350F', fontWeight: shortfallAction === 'CARRY_FORWARD' ? 600 : 400 }}>
                        <input
                          type="radio"
                          name="shortfall_action_nce"
                          checked={shortfallAction === 'CARRY_FORWARD'}
                          onChange={() => setShortfallAction('CARRY_FORWARD')}
                        />
                        <span>Carry forward ₹{fmt(interestShortfallAmount)} as pending interest arrears (Default)</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#78350F', fontWeight: shortfallAction === 'WAIVE' ? 600 : 400 }}>
                        <input
                          type="radio"
                          name="shortfall_action_nce"
                          checked={shortfallAction === 'WAIVE'}
                          onChange={() => setShortfallAction('WAIVE')}
                        />
                        <span>Waive / discount ₹{fmt(interestShortfallAmount)} as concession (Submit for Manager Waiver Approval)</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* ── 3. Total Received Banner ── */}
              <div style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)', border: '1px solid var(--brand-primary-border, #A3F5C1)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--brand-primary-hover, #0E5327)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                    Total Collection Amount
                  </span>
                  <span style={{ fontSize: '1.25rem', color: 'var(--brand-primary, #15803D)', fontWeight: 700, marginTop: 1, display: 'block' }}>
                    ₹{fmt(totalAmountToCollect)}
                  </span>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.64rem', color: '#64748B', display: 'block' }}>
                    New Principal Balance
                  </span>
                  <span style={{ fontSize: '1.05rem', color: updatedPendingBal > 0 ? 'var(--color-danger, #DC2626)' : 'var(--brand-primary, #15803D)', fontWeight: 700 }}>
                    ₹{fmt(updatedPendingBal)}
                  </span>
                </div>
              </div>

              {willCloseLoan && (
                <div style={{ fontSize: '0.74rem', marginBottom: 16, color: 'var(--brand-primary-hover, #0E5327)', background: '#F0FEF5', border: '1px solid #A3F5C1', borderRadius: 8, padding: '8px 12px' }}>
                  ✓ This collection clears the principal in full — the loan will be submitted for closure review.
                </div>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 5 }}>
                      Receiving Bank Account *
                    </label>
                    <SharedDropdown
                      value={bankAccountId ? String(bankAccountId) : (bankAccounts[0]?.id ? String(bankAccounts[0].id) : '')}
                      onChange={(e) => setBankAccountId(e.target.value)}
                      options={bankAccounts.map(b => ({
                        value: String(b.id),
                        label: `${b.bank_name} (${b.account_number ? '...' + String(b.account_number).slice(-4) : b.account_name})`
                      }))}
                      buttonStyle={{ height: 40, fontSize: '0.82rem', borderRadius: 9 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 500, display: 'block', marginBottom: 5 }}>
                      {paymentMode === 'UPI' ? t('nce.ref_upi') : paymentMode === 'CHEQUE' ? t('nce.ref_cheque') : t('nce.ref_bank_transfer')} *
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
                  disabled={posting || totalAmountToCollect <= 0}
                  style={{ background: (posting || totalAmountToCollect <= 0) ? '#94A3B8' : 'var(--brand-primary, #15803D)', border: 'none', borderRadius: 10, padding: '10px 28px', fontSize: '0.86rem', fontWeight: 500, color: '#FFFFFF', cursor: (posting || totalAmountToCollect <= 0) ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
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
                      <td style={{ padding: '7px 8px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setLastReceipt({
                              voucher_no: rec.voucher_no,
                              date: rec.collection_date,
                              branch: rec.branch || targetLoan.branch,
                              borrower_name: targetLoan.borrower_name,
                              phone: targetLoan.phone,
                              loan_account_no: targetLoan.loan_account_no,
                              payment_mode: rec.payment_mode,
                              reference_no: rec.reference_no,
                              amount: rec.amount,
                              principal_paid: rec.principal_paid ?? rec.principal_portion ?? rec.principalPaid ?? 0,
                              interest_paid: rec.interest_paid ?? rec.interest_portion ?? rec.interestPaid ?? 0,
                              penalty: rec.penalty ?? rec.penalty_portion ?? 0,
                              interest_from_date: rec.interest_from_date,
                              interest_paid_upto: rec.interest_paid_upto,
                              interest_days: rec.interest_days,
                              interest_shortfall: rec.interest_shortfall,
                              interest_waiver: rec.interest_waiver,
                              pending_balance: rec.new_principal_balance,
                              collector_name: rec.collector_name
                            });
                            setShowReceiptPrint(true);
                          }}
                          style={{
                            background: '#F1F5F9',
                            border: '1px solid #CBD5E1',
                            borderRadius: 6,
                            padding: '3px 8px',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            color: 'var(--color-info, #2563EB)',
                            fontFamily: 'monospace',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                          title="Click to view and print official voucher"
                        >
                          <Receipt style={{ width: 12, height: 12 }} />
                          <span>{rec.voucher_no}</span>
                        </button>
                      </td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600, color: '#0F172A' }}>₹{fmt(rec.amount)}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', color: '#0F172A' }}>₹{fmt(rec.principal_paid ?? rec.principal_portion ?? rec.principalPaid ?? 0)}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'right' }}>
                        <div style={{ color: '#7C3AED', fontWeight: 600 }}>₹{fmt(rec.interest_paid ?? rec.interest_portion ?? rec.interestPaid ?? 0)}</div>
                        {(rec.interest_paid_upto || rec.interest_from_date) && (
                          <div style={{ fontSize: '0.65rem', color: '#64748B', whiteSpace: 'nowrap' }}>
                            {rec.interest_from_date ? `${rec.interest_from_date} → ${rec.interest_paid_upto}` : `Up to ${rec.interest_paid_upto}`}
                            {rec.interest_days !== null && rec.interest_days !== undefined ? ` (${rec.interest_days}d)` : ''}
                          </div>
                        )}
                      </td>
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
                <span style={{ color: 'var(--brand-primary-hover, #0E5327)', fontWeight: 600 }}>{t('nce.collection_amount_label')}</span>
                <span style={{ color: 'var(--brand-primary, #15803D)', fontWeight: 700 }}>₹{fmt(totalAmountToCollect)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748B' }}>
                <span>Principal ₹{fmt(numericPrincipal)} • Interest ₹{fmt(numericInterest)}</span>
                <span>New Bal ₹{fmt(updatedPendingBal)}</span>
              </div>
              {numericAdditional > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#C2410C' }}>
                  <span>Additional / Fees:</span>
                  <span>₹{fmt(numericAdditional)}</span>
                </div>
              )}
              {hasShortfall && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#92400E', background: '#FFFBEB', padding: '4px 8px', borderRadius: 6 }}>
                  <span>Shortfall Resolution:</span>
                  <strong>{shortfallAction === 'CARRY_FORWARD' ? `Carry Forward ₹${fmt(interestShortfallAmount)}` : `Waived ₹${fmt(interestShortfallAmount)}`}</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#7C3AED', paddingTop: 4, borderTop: '1px dashed #E2E8F0' }}>
                <span>Interest Covered Up To:</span>
                <strong>{interestUptoDate} ({interestDays}d)</strong>
              </div>
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

      {showReceiptPrint && lastReceipt && (
        <VoucherReceiptModal
          company={tenant}
          voucher={{
            ...lastReceipt,
            borrower_name: lastReceipt.borrower_name || borrowerName,
            phone: lastReceipt.phone || phoneNo,
            loan_account_no: lastReceipt.loan_account_no || targetLoan?.loan_account_no,
            branch: lastReceipt.branch || targetLoan?.branch
          }}
          typeLabel="COLLECTION RECEIPT"
          onClose={() => setShowReceiptPrint(false)}
        />
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
