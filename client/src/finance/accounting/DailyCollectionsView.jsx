import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Plus,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  Undo2,
  Pencil,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Smartphone,
  Banknote,
  Building2,
  FileSpreadsheet,
  StickyNote,
  Printer
} from 'lucide-react';
import CustomerProfileModal from '../borrowers/CustomerProfileModal';
import DedicatedThermalPrintModal from '../../components/DedicatedThermalPrintModal';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { calculatePaymentAllocation } from '../../utils/loanCalculations';

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function Avatar({ name, photo, size = 30 }) {
  if (photo) {
    return <img src={photo} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '1px solid #E2E8F0', flexShrink: 0 }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700
    }}>
      {getInitials(name) || '—'}
    </div>
  );
}

// Labeled action pill instead of a bare icon button.
function ActionPill({ icon, label, onClick, tone = 'neutral', disabled = false }) {
  const tones = {
    neutral: { bg: '#FFFFFF', border: '#E2E8F0', color: '#334155' },
    good: { bg: '#ECFDF5', border: '#A7F3D0', color: '#059669' },
    bad: { bg: '#FEF2F2', border: '#FECACA', color: '#DC2626' }
  };
  const c = tones[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
        border: `1px solid ${c.border}`, background: c.bg, color: c.color,
        borderRadius: 6, padding: '4px 9px', fontSize: '0.7rem', fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function formatDateDDMMYYYY(dateStr) {
  if (!dateStr) return '';
  const cleanStr = String(dateStr).slice(0, 10);
  const parts = cleanStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    // Format YYYY-MM-DD to DD/MM/YYYY
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

const PAYMENT_MODES = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'];

export default function DailyCollectionsView({
  collections = [],
  loans = [],
  borrowers = [],
  loanSchemes = [],
  user,
  tenant,
  branchesList = [],
  selectedBranch = 'ALL',
  onRecordCollection,
  onQuickAction,
  onRevertCollection,
  onUpdateCollection,
  onMarkChequeCleared,
  onMarkChequeBounced
}) {
  const { t } = useLanguage();

  // Branch filter — locked/forced by the sidebar's global branch control when active.
  const [branchFilter, setBranchFilter] = useState('ALL');
  useEffect(() => {
    if (selectedBranch && selectedBranch !== 'ALL') setBranchFilter(selectedBranch);
  }, [selectedBranch]);
  const getTodayISO = () => new Date().toISOString().slice(0, 10);
  const getDaysAgoISO = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  };

  // Table filter, date filter & modal state
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState('ALL');
  const [datePreset, setDatePreset] = useState('TODAY'); // Default to 'TODAY'
  const [fromDate, setFromDate] = useState(getTodayISO());
  const [toDate, setToDate] = useState(getTodayISO());
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [printThermalReceipt, setPrintThermalReceipt] = useState(null);
  const [selectedCustomerForProfile, setSelectedCustomerForProfile] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Sorting state: field name & direction ('asc' | 'desc')
  const [sortColumn, setSortColumn] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [revertTarget, setRevertTarget] = useState(null);
  const [revertReason, setRevertReason] = useState('');
  const [revertError, setRevertError] = useState('');
  const [revertBusy, setRevertBusy] = useState(false);
  const [showSuccessTick, setShowSuccessTick] = useState(false);
  const [showRevertedAnim, setShowRevertedAnim] = useState(false);
  const [bounceTarget, setBounceTarget] = useState(null);
  const [bounceReason, setBounceReason] = useState('');
  const [bounceError, setBounceError] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState('');
  const pageSize = 10;

  const canControl = user?.role !== 'COLLECTOR';
  const [confirmCollectionModal, setConfirmCollectionModal] = useState(null);

  // Inline Quick Collection Header Form State
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [collectorName, setCollectorName] = useState(user?.name || 'Sarah Collector');
  const [collectionDate, setCollectionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [entryError, setEntryError] = useState('');
  const [posting, setPosting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [editingCollectionId, setEditingCollectionId] = useState(null);

  const activeLoans = (loans || []).filter(l => l.status === 'ACTIVE' || l.status === 'OVERDUE');

  const filteredCustomerLoans = activeLoans.filter(l => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (l.borrower_name && l.borrower_name.toLowerCase().includes(q)) ||
      (l.loan_account_no && l.loan_account_no.toLowerCase().includes(q)) ||
      (l.phone && l.phone.includes(q))
    );
  });

  const targetLoan = selectedLoanId ? activeLoans.find(l => String(l.id) === String(selectedLoanId)) : null;

  const selectLoanItem = (loan) => {
    setSelectedLoanId(loan.id);
    setCustomerSearch(`${loan.loan_account_no} - ${loan.borrower_name}`);
    setIsDropdownOpen(false);
    setEntryError('');
    setAmountPaid(loan.installment_amount || '');
  };

  const clearCustomerSelection = () => {
    setSelectedLoanId('');
    setCustomerSearch('');
    setAmountPaid('');
    setEntryError('');
    setIsDropdownOpen(false);
    setEditingCollectionId(null);
  };

  const prefillCollectionForEdit = (collection) => {
    setEditingCollectionId(collection.id);
    setSelectedLoanId(collection.loan_id);
    setCustomerSearch(`${collection.loan_account_no} - ${collection.borrower_name}`);
    setAmountPaid(String(collection.amount || ''));
    setPaymentMode(collection.payment_mode || 'CASH');
    setCollectorName(collection.collector_name || user?.name || '');
    setCollectionDate(collection.collection_date || new Date().toISOString().slice(0, 10));
    setReferenceNo(collection.reference_no || '');
    setNotes(collection.notes || '');
    setEntryError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const liveAllocation = targetLoan && parseFloat(amountPaid) > 0 ? calculatePaymentAllocation({
    loan: targetLoan,
    paymentAmount: parseFloat(amountPaid) || 0,
    paymentDate: collectionDate
  }) : null;

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    if (!targetLoan) {
      setEntryError('Please select a customer / loan account.');
      return;
    }
    const numAmt = parseFloat(amountPaid);
    if (!numAmt || numAmt <= 0) {
      setEntryError('Please enter a valid collection amount.');
      return;
    }

    if (numAmt > targetLoan.pending_amount) {
      setEntryError(`Collection amount (₹${fmt(numAmt)}) cannot exceed pending balance (₹${fmt(targetLoan.pending_amount)}).`);
      return;
    }

    setEntryError('');
    const allocation = calculatePaymentAllocation({
      loan: targetLoan,
      paymentAmount: numAmt,
      paymentDate: collectionDate
    });

    const payload = {
      is_edit: Boolean(editingCollectionId),
      collection_id: editingCollectionId,
      loan_id: targetLoan.id,
      loan_account_no: targetLoan.loan_account_no,
      borrower_name: targetLoan.borrower_name,
      phone: targetLoan.phone,
      branch: targetLoan.branch || tenant?.city || 'Main Branch',
      amount: numAmt,
      principal_portion: allocation.principalPortion,
      interest_portion: allocation.interestPortion,
      new_principal_balance: allocation.newPendingPrincipal,
      updated_schedule: allocation.updatedSchedule,
      payment_mode: paymentMode,
      reference_no: referenceNo,
      collector_name: collectorName,
      collection_date: collectionDate,
      notes: notes,
      allocation
    };

    setConfirmCollectionModal(payload);
  };

  const executeConfirmedCollection = () => {
    if (!confirmCollectionModal) return;
    setPosting(true);
    try {
      if (confirmCollectionModal.is_edit) {
        onUpdateCollection(confirmCollectionModal.collection_id, confirmCollectionModal);
      } else {
        onRecordCollection(confirmCollectionModal);
      }

      // Show animated tick confirmation badge for 0.3s
      setShowSuccessTick(true);
      setTimeout(() => setShowSuccessTick(false), 300);

      // Reset form
      clearCustomerSelection();
      setConfirmCollectionModal(null);
    } catch (err) {
      setEntryError(err?.message || 'Failed to record collection entry.');
    } finally {
      setPosting(false);
    }
  };

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  const getLinkedBorrower = (c) => {
    return (borrowers || []).find(b => b.full_name === c.borrower_name || b.phone === c.phone || b.id === c.borrower_id) || {
      full_name: c.borrower_name || 'Customer',
      phone: c.phone || 'Not provided',
      branch: c.branch || 'Karur Main',
      borrower_code: 'KTG-CUST',
      kyc_status: 'VERIFIED'
    };
  };

  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    setCurrentPage(1);
    if (preset === 'TODAY') {
      setFromDate(getTodayISO());
      setToDate(getTodayISO());
    } else if (preset === '7D') {
      setFromDate(getDaysAgoISO(6));
      setToDate(getTodayISO());
    } else if (preset === '30D') {
      setFromDate(getDaysAgoISO(29));
      setToDate(getTodayISO());
    } else if (preset === 'ALL') {
      setFromDate('');
      setToDate('');
    }
  };

  const branchScopedCollections = branchFilter === 'ALL' ? collections : collections.filter(c => c.branch === branchFilter);

  const searchFiltered = branchScopedCollections.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const amount = parseFloat(c.amount) || 0;
      const interestPortion = c.interest_portion !== undefined ? Number(c.interest_portion) : Math.round(amount * 0.15);
      const principalPortion = c.principal_portion !== undefined ? Number(c.principal_portion) : (amount - interestPortion);
      const remainingBal = c.new_principal_balance !== undefined ? Number(c.new_principal_balance) : 0;
      const recordDate = c.collection_date || c.date || '';

      const matchesSearch = (
        (c.voucher_no && String(c.voucher_no).toLowerCase().includes(q)) ||
        (c.borrower_name && String(c.borrower_name).toLowerCase().includes(q)) ||
        (c.collector_name && String(c.collector_name).toLowerCase().includes(q)) ||
        (c.loan_account_no && String(c.loan_account_no).toLowerCase().includes(q)) ||
        (c.loan_id && String(c.loan_id).toLowerCase().includes(q)) ||
        (c.phone && String(c.phone).toLowerCase().includes(q)) ||
        (c.payment_mode && String(c.payment_mode).toLowerCase().includes(q)) ||
        (c.reference_no && String(c.reference_no).toLowerCase().includes(q)) ||
        (c.notes && String(c.notes).toLowerCase().includes(q)) ||
        (recordDate && String(recordDate).toLowerCase().includes(q)) ||
        String(amount).includes(q) ||
        String(principalPortion).includes(q) ||
        String(interestPortion).includes(q) ||
        String(remainingBal).includes(q)
      );

      if (!matchesSearch) return false;
    }

    const recordDate = c.collection_date || c.date || '';
    if (fromDate && recordDate < fromDate) return false;
    if (toDate && recordDate > toDate) return false;

    return true;
  });

  const isChequeOrBank = (c) => c.payment_mode === 'CHEQUE' || c.payment_mode === 'BANK_TRANSFER';
  const countAll = searchFiltered.length;
  const countCash = searchFiltered.filter(c => c.payment_mode === 'CASH').length;
  const countUpi = searchFiltered.filter(c => c.payment_mode === 'UPI').length;
  const countCheque = searchFiltered.filter(isChequeOrBank).length;

  const filteredCollections = searchFiltered.filter(c => {
    if (modeFilter === 'ALL') return true;
    if (modeFilter === 'CHEQUE') return isChequeOrBank(c);
    return c.payment_mode === modeFilter;
  });

  // Calculate Metrics for Summary Bar (Valid Non-Reverted Collections)
  const activeFiltered = filteredCollections.filter(c => !c.reverted);
  const totalCashCollected = activeFiltered
    .filter(c => c.payment_mode === 'CASH')
    .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  const totalDigitalCollected = activeFiltered
    .filter(c => c.payment_mode !== 'CASH')
    .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  const totalEntriesCount = filteredCollections.length;

  // Multi-Column Sorting Logic
  const sortedCollections = [...filteredCollections].sort((a, b) => {
    const dir = sortDirection === 'asc' ? 1 : -1;
    if (sortColumn === 'date') {
      const dateA = a.collection_date || a.date || '';
      const dateB = b.collection_date || b.date || '';
      return dateA.localeCompare(dateB) * dir;
    }
    if (sortColumn === 'customer') {
      const nameA = (a.borrower_name || '').toLowerCase();
      const nameB = (b.borrower_name || '').toLowerCase();
      return nameA.localeCompare(nameB) * dir;
    }
    if (sortColumn === 'amount') {
      const amtA = parseFloat(a.amount) || 0;
      const amtB = parseFloat(b.amount) || 0;
      return (amtA - amtB) * dir;
    }
    if (sortColumn === 'balance') {
      const loanA = loans.find(l => String(l.id) === String(a.loan_id) || l.loan_account_no === a.loan_account_no);
      const loanB = loans.find(l => String(l.id) === String(b.loan_id) || l.loan_account_no === b.loan_account_no);
      const balA = a.new_principal_balance !== undefined ? Number(a.new_principal_balance) : (loanA?.pending_amount || 0);
      const balB = b.new_principal_balance !== undefined ? Number(b.new_principal_balance) : (loanB?.pending_amount || 0);
      return (balA - balB) * dir;
    }
    return 0;
  });

  const handleSortClick = (colKey) => {
    if (sortColumn === colKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(colKey);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // Calculate Pagination
  const totalPages = Math.ceil(sortedCollections.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedCollections = sortedCollections.slice(startIndex, startIndex + pageSize);

  const closeReceiptModal = () => {
    setSelectedReceipt(null);
    setBounceTarget(null);
    setBounceReason('');
  };

  const openEdit = (c) => {
    setEditTarget(c);
    setEditError('');
    setEditForm({
      payment_mode: c.payment_mode || 'CASH',
      reference_no: c.reference_no || '',
      collector_name: c.collector_name || '',
      collection_date: c.collection_date || '',
      branch: c.branch || '',
      notes: c.notes || ''
    });
  };

  const closeEdit = () => {
    setEditTarget(null);
    setEditForm(null);
    setEditError('');
  };

  const submitEdit = (e) => {
    e.preventDefault();
    try {
      onUpdateCollection(editTarget.id, editForm);
      closeEdit();
      closeReceiptModal();
    } catch (err) {
      setEditError(err?.message || 'Could not save these changes.');
    }
  };

  const confirmRevert = () => {
    setRevertBusy(true);
    setRevertError('');
    try {
      onRevertCollection(revertTarget.id, revertReason);
      setRevertTarget(null);
      setRevertReason('');
      closeReceiptModal();
      setShowRevertedAnim(true);
      setTimeout(() => setShowRevertedAnim(false), 1700);
    } catch (err) {
      setRevertError(err?.message || 'Could not revert this collection.');
    } finally {
      setRevertBusy(false);
    }
  };

  const confirmBounce = () => {
    setBounceError('');
    try {
      onMarkChequeBounced(bounceTarget.id, bounceReason);
      setBounceTarget(null);
      setBounceReason('');
      closeReceiptModal();
    } catch (err) {
      setBounceError(err?.message || 'Could not mark this cheque as bounced.');
    }
  };

  const modeIcon = (mode) => {
    if (mode === 'UPI') return <Smartphone style={{ width: 12, height: 12 }} />;
    if (mode === 'CHEQUE') return <FileSpreadsheet style={{ width: 12, height: 12 }} />;
    if (mode === 'BANK_TRANSFER') return <Building2 style={{ width: 12, height: 12 }} />;
    return <Banknote style={{ width: 12, height: 12 }} />;
  };

  return (
    <div className="fin-page">
      {/* ── Collection Entry Form Card with integrated Page Header ── */}
      <div className="fin-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: 18, marginBottom: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: editingCollectionId ? '#EFF6FF' : '#ECFDF5', border: `1px solid ${editingCollectionId ? '#BFDBFE' : '#A7F3D0'}`, color: editingCollectionId ? '#2563EB' : '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {editingCollectionId ? <Pencil style={{ width: 18, height: 18 }} /> : <Receipt style={{ width: 18, height: 18 }} />}
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                  {editingCollectionId ? 'Edit Collection Entry' : t('coll.title')}
                </h1>
                <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748B' }}>
                  {editingCollectionId ? 'Modify collection details and update record' : t('coll.subtitle')}
                </p>
              </div>
            </div>
          {targetLoan && (
            <div style={{ fontSize: '0.76rem', color: '#64748B', background: '#F8FAFC', padding: '6px 12px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
              Pending Bal: <strong style={{ color: '#DC2626' }}>₹{fmt(targetLoan.pending_amount)}</strong> | EMI: <strong style={{ color: '#059669' }}>₹{fmt(targetLoan.installment_amount)}</strong>
            </div>
          )}
        </div>

        {entryError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: '0.76rem', color: '#991B1B' }}>
            <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />
            <span>{entryError}</span>
          </div>
        )}

        <form onSubmit={handleQuickSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'end' }}>
            {/* Searchable Customer / Loan Select */}
            <div className="form-group" style={{ margin: 0, position: 'relative' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }}>
                Select Customer / Loan *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setSelectedLoanId('');
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="Type name, loan # or phone..."
                  className="input-control"
                  style={{ height: 34, fontSize: '0.78rem', borderRadius: 6, paddingRight: customerSearch ? 28 : 24 }}
                  required={!selectedLoanId}
                />
                {customerSearch ? (
                  <button
                    type="button"
                    onClick={clearCustomerSelection}
                    title="Clear selection"
                    style={{
                      position: 'absolute', right: 7, top: 8, background: 'none',
                      border: 'none', padding: 2, cursor: 'pointer', color: '#94A3B8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#94A3B8'}
                  >
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                ) : (
                  <Search style={{ position: 'absolute', right: 8, top: 9, width: 14, height: 14, color: '#94A3B8', pointerEvents: 'none' }} />
                )}
              </div>

              {isDropdownOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: 4,
                    background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 6,
                    maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}>
                    {filteredCustomerLoans.length === 0 ? (
                      <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: '#94A3B8', textAlign: 'center' }}>
                        No matching active loans found
                      </div>
                    ) : (
                      filteredCustomerLoans.map(l => (
                        <div
                          key={l.id}
                          onClick={() => selectLoanItem(l)}
                          style={{
                            padding: '8px 12px', fontSize: '0.75rem', cursor: 'pointer',
                            borderBottom: '1px solid #F1F5F9',
                            background: String(selectedLoanId) === String(l.id) ? '#ECFDF5' : '#FFFFFF'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                          onMouseLeave={(e) => e.currentTarget.style.background = String(selectedLoanId) === String(l.id) ? '#ECFDF5' : '#FFFFFF'}
                        >
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>{l.borrower_name}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', fontSize: '0.7rem' }}>
                            <span>{l.loan_account_no} ({l.phone || 'No phone'})</span>
                            <span style={{ color: '#DC2626', fontWeight: 600 }}>Bal: ₹{fmt(l.pending_amount)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Collection Amount */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }}>
                Amount Paid (₹) *
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                max={targetLoan ? targetLoan.pending_amount : undefined}
                value={amountPaid}
                onChange={(e) => {
                  const val = e.target.value;
                  if (targetLoan && parseFloat(val) > targetLoan.pending_amount) {
                    setEntryError(`Amount cannot exceed pending balance (₹${fmt(targetLoan.pending_amount)}).`);
                  } else {
                    setEntryError('');
                  }
                  setAmountPaid(val);
                }}
                placeholder="0.00"
                className="input-control mono"
                style={{ height: 34, fontSize: '0.85rem', fontWeight: 700, color: '#059669', borderRadius: 6 }}
                required
              />
            </div>

            {/* Payment Mode */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }}>
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="input-control"
                style={{ height: 34, fontSize: '0.78rem', borderRadius: 6 }}
              >
                {PAYMENT_MODES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Collection Date */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }}>
                Collection Date *
              </label>
              <input
                type="date"
                max={getTodayISO()}
                value={collectionDate}
                onChange={(e) => setCollectionDate(e.target.value)}
                className="input-control"
                style={{ height: 34, fontSize: '0.78rem', borderRadius: 6 }}
                required
              />
            </div>

            {/* Submit / Update & Cancel Buttons */}
            <div style={{ margin: 0, display: 'flex', gap: 6 }}>
              {editingCollectionId ? (
                <>
                  <button
                    type="submit"
                    disabled={posting}
                    className="fin-btn-primary"
                    style={{
                      height: 34,
                      flex: 1,
                      justifyContent: 'center',
                      background: '#2563EB',
                      borderColor: '#2563EB',
                      borderRadius: 6,
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: posting ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Pencil style={{ width: 14, height: 14 }} />
                    <span>{posting ? 'Updating...' : 'Update Collection'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={clearCustomerSelection}
                    className="btn-cancel"
                    style={{
                      height: 34,
                      padding: '0 12px',
                      borderRadius: 6,
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      background: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      color: '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="submit"
                  disabled={posting}
                  className="fin-btn-primary"
                  style={{
                    height: 34,
                    width: '100%',
                    justifyContent: 'center',
                    background: '#059669',
                    borderColor: '#059669',
                    borderRadius: 6,
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: posting ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Plus style={{ width: 14, height: 14 }} />
                  <span>{posting ? 'Saving...' : 'Record Collection'}</span>
                </button>
              )}
            </div>
            {/* Live Allocation Preview Box */}
            {liveAllocation && (
              <div style={{
                gridColumn: '1 / -1', background: '#F8FAFC', border: '1px solid #E2E8F0',
                borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center',
                justify: 'space-between', gap: 16, fontSize: '0.76rem'
              }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div>
                    <span style={{ color: '#64748B' }}>Principal: </span>
                    <strong style={{ color: '#0F172A' }}>₹{fmt(liveAllocation.principalPortion)}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Interest: </span>
                    <strong style={{ color: '#0E7490' }}>₹{fmt(liveAllocation.interestPortion)}</strong>
                  </div>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>New Pending Bal: </span>
                  <strong style={{ color: liveAllocation.newPendingPrincipal > 0 ? '#DC2626' : '#059669' }}>
                    ₹{fmt(liveAllocation.newPendingPrincipal)}
                  </strong>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* ── Modern Enterprise Table Design ── */}
      <style>{`
        .coll-card-container {
          border-radius: 10px;
          border: 1px solid #CBD5E1;
          background: #FFFFFF;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
        }
        .coll-scroll-area {
          max-height: calc(100vh - 380px);
          overflow-y: auto;
          overflow-x: auto;
        }
        .coll-scroll-area table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        .coll-scroll-area th {
          position: sticky;
          top: 0;
          z-index: 10;
          background: #F8FAFC !important;
          border-bottom: 1px solid #CBD5E1 !important;
          color: #475569;
          font-weight: 600;
          font-size: 0.73rem;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          padding: 9px 12px;
          user-select: none;
        }
        .coll-scroll-area th.sortable {
          cursor: pointer;
        }
        .coll-scroll-area th.sortable:hover {
          background-color: #F1F5F9 !important;
          color: #0F172A;
        }
        .coll-scroll-area td {
          border-bottom: 1px solid #E2E8F0;
          padding: 8px 12px;
        }
        .coll-scroll-area tr:hover td {
          background-color: #F8FAFC !important;
        }
      `}</style>
      <div className="coll-card-container">
        {/* Toolbar Header - Fixed Top */}
        <div style={{
          padding: '8px 12px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, flexWrap: 'nowrap'
        }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: 170, flexShrink: 0 }}>
            <Search style={{ position: 'absolute', left: 8, top: 7, width: 12, height: 12, color: '#94A3B8' }} />
            <input
              style={{ paddingLeft: 25, width: '100%', height: 28, borderRadius: 5, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.74rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>

          {/* Branch Filter */}
          <select
            value={branchFilter}
            onChange={(e) => { setBranchFilter(e.target.value); setCurrentPage(1); }}
            disabled={Boolean(selectedBranch && selectedBranch !== 'ALL')}
            style={{
              height: 28, padding: '0 6px', borderRadius: 5, border: '1px solid #CBD5E1',
              background: '#FFFFFF', fontSize: '0.74rem', color: '#0F172A',
              fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0, width: 120
            }}
          >
            <option value="ALL">All Branches</option>
            {branchesList.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
          </select>

          {/* Payment Mode Filter */}
          <select
            value={modeFilter}
            onChange={(e) => { setModeFilter(e.target.value); setCurrentPage(1); }}
            style={{
              height: 28, padding: '0 6px', borderRadius: 5, border: '1px solid #CBD5E1',
              background: '#FFFFFF', fontSize: '0.74rem', color: '#0F172A',
              fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0, width: 120
            }}
          >
            <option value="ALL">All Modes ({countAll})</option>
            <option value="CASH">Cash ({countCash})</option>
            <option value="UPI">UPI ({countUpi})</option>
            <option value="CHEQUE">Cheque ({countCheque})</option>
          </select>

          {/* Date Preset Filter */}
          <select
            value={datePreset}
            onChange={(e) => handleDatePresetChange(e.target.value)}
            style={{
              height: 28, padding: '0 6px', borderRadius: 5, border: '1px solid #CBD5E1',
              background: '#FFFFFF', fontSize: '0.74rem', color: '#0F172A',
              fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0, width: 110
            }}
          >
            <option value="ALL">All Dates</option>
            <option value="TODAY">Today</option>
            <option value="7D">7 Days</option>
            <option value="30D">30 Days</option>
            <option value="CUSTOM">Custom</option>
          </select>

          {/* Custom Date Pickers */}
          {datePreset === 'CUSTOM' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
                style={{ height: 28, padding: '0 4px', borderRadius: 5, border: '1px solid #CBD5E1', fontSize: '0.7rem', background: '#FFFFFF' }}
              />
              <span style={{ fontSize: '0.7rem', color: '#64748B' }}>-</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
                style={{ height: 28, padding: '0 4px', borderRadius: 5, border: '1px solid #CBD5E1', fontSize: '0.7rem', background: '#FFFFFF' }}
              />
            </div>
          )}
        </div>

        {/* Scrollable Table Area */}
        <div className="coll-scroll-area">
          <table className="fin-grid-table" style={{ minWidth: 960 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'center', width: 45 }}>{t('col.sno')}</th>
                <th className="sortable" style={{ width: 115 }} onClick={() => handleSortClick('date')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>{t('col.date_time')}</span>
                    {sortColumn === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th className="sortable" onClick={() => handleSortClick('customer')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>{t('col.customer')}</span>
                    {sortColumn === 'customer' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th>{t('col.loan_acc')}</th>
                <th className="num sortable" onClick={() => handleSortClick('amount')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    <span>{t('col.paid_rs')}</span>
                    {sortColumn === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th className="num">{t('col.principal')}</th>
                <th className="num">{t('col.interest')}</th>
                <th className="num sortable" onClick={() => handleSortClick('balance')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    <span>{t('col.balance')}</span>
                    {sortColumn === 'balance' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th style={{ textAlign: 'center', width: 90 }}>{t('col.mode')}</th>
                <th style={{ textAlign: 'right', width: 130 }}>{t('col.action')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCollections.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
                    {t('coll.no_records')}
                  </td>
                </tr>
              ) : (
                paginatedCollections.map((c, idx) => {
                  const amount = parseFloat(c.amount) || 0;
                  const interestPortion = c.interest_portion !== undefined ? Number(c.interest_portion) : Math.round(amount * 0.15);
                  const principalPortion = c.principal_portion !== undefined ? Number(c.principal_portion) : (amount - interestPortion);
                  const timestamp = c.collection_date || c.date || new Date().toISOString().slice(0, 10);
                  const timeStr = c.time || '10:30 AM';

                  const matchedLoan = loans.find(l => String(l.id) === String(c.loan_id) || l.loan_account_no === c.loan_account_no) || null;
                  const loanAccNo = c.loan_account_no || matchedLoan?.loan_account_no || `STL-Y26-${String(c.id || idx + 1).padStart(3, '0')}`;
                  const remainingBal = c.new_principal_balance !== undefined ? Number(c.new_principal_balance) : (matchedLoan?.pending_amount || 0);
                  const linkedBorrower = getLinkedBorrower(c);
                  const rowBg = c.reverted ? '#F8FAFC' : 'transparent';
                  const rowStyle = {
                    background: rowBg,
                    opacity: c.reverted ? 0.55 : 1
                  };
                  const textDecor = c.reverted ? { textDecoration: 'line-through' } : {};

                  return (
                    <tr key={c.id || idx} style={rowStyle}>
                      <td style={{ textAlign: 'center', color: '#94A3B8', fontWeight: 400 }}>{startIndex + idx + 1}</td>

                      <td style={{ fontSize: '0.74rem', fontWeight: 400 }}>
                        <span style={{ color: '#0F172A' }}>{formatDateDDMMYYYY(timestamp)}</span><br />
                        <span style={{ color: '#94A3B8', fontSize: '0.68rem' }}>{timeStr}</span>
                      </td>

                      <td style={{ fontWeight: 400 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={c.borrower_name} photo={linkedBorrower.profile_image || linkedBorrower.photo} size={24} />
                          <span
                            onClick={() => setSelectedCustomerForProfile(linkedBorrower)}
                            title="Click to view Customer Profile"
                            style={{ color: '#0F172A', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', ...textDecor }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#059669'; e.currentTarget.style.textDecoration = 'underline'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#0F172A'; e.currentTarget.style.textDecoration = c.reverted ? 'line-through' : 'none'; }}
                          >
                            {c.borrower_name || `Loan #${c.loan_id}`}
                          </span>
                        </div>
                      </td>

                      <td className="code" style={{ fontWeight: 400 }}>
                        <span
                          style={{ color: '#059669', fontWeight: 600, cursor: 'pointer', ...textDecor }}
                          onClick={() => setSelectedReceipt(c)}
                          title="Click to view Official Collection Voucher"
                        >
                          {loanAccNo}
                        </span>
                      </td>

                      <td className="num" style={{ color: '#059669', fontWeight: 600, ...textDecor }}>₹{fmt(amount)}</td>
                      <td className="num" style={{ fontWeight: 400, ...textDecor }}>₹{fmt(principalPortion)}</td>
                      <td className="num" style={{ color: '#0E7490', fontWeight: 400, ...textDecor }}>₹{fmt(interestPortion)}</td>
                      <td className="num" style={{ color: remainingBal > 0 ? '#DC2626' : '#059669', fontWeight: 400 }}>₹{fmt(remainingBal)}</td>

                      <td style={{ textAlign: 'center', fontWeight: 400 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                          <span style={{ fontSize: '0.74rem', color: '#334155' }}>
                            {c.payment_mode || 'CASH'}
                          </span>
                          {c.reverted && (
                            <span style={{ fontSize: '0.62rem', color: '#DC2626' }}>{t('coll.reverted_badge')}</span>
                          )}
                          {!c.reverted && c.clearance_status === 'PENDING_CLEARANCE' && (
                            <span style={{ fontSize: '0.62rem', color: '#B45309' }}>{t('coll.pending_clearance_badge')}</span>
                          )}
                          {!c.reverted && c.clearance_status === 'BOUNCED' && (
                            <span style={{ fontSize: '0.62rem', color: '#DC2626' }}>{t('coll.bounced_badge')}</span>
                          )}
                        </div>
                      </td>

                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => setSelectedReceipt(c)}
                            title="View Voucher"
                            style={{
                              background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 6,
                              padding: '6px 9px', color: '#334155', cursor: 'pointer', display: 'inline-flex',
                              alignItems: 'center', justifyContent: 'center'
                            }}
                          >
                            <Eye style={{ width: 16, height: 16, strokeWidth: 2, color: '#334155' }} />
                          </button>
                          {!c.reverted && canControl && (
                            <>
                              <button
                                type="button"
                                onClick={() => prefillCollectionForEdit(c)}
                                title="Edit Collection (Prefills Form)"
                                style={{
                                  background: '#EFF6FF', border: '1px solid #93C5FD', borderRadius: 6,
                                  padding: '6px 9px', color: '#2563EB', cursor: 'pointer', display: 'inline-flex',
                                  alignItems: 'center', justifyContent: 'center'
                                }}
                              >
                                <Pencil style={{ width: 16, height: 16, strokeWidth: 2, color: '#2563EB' }} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setRevertTarget(c)}
                                title="Revert Collection"
                                style={{
                                  background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 6,
                                  padding: '6px 9px', color: '#DC2626', cursor: 'pointer', display: 'inline-flex',
                                  alignItems: 'center', justifyContent: 'center'
                                }}
                              >
                                <Undo2 style={{ width: 16, height: 16, strokeWidth: 2, color: '#DC2626' }} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer - Fixed Bottom */}
        <div className="table-pagination" style={{ borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}>
          <div className="table-pagination__info">
            Showing <span>{filteredCollections.length === 0 ? 0 : startIndex + 1}</span> to <span>{Math.min(startIndex + pageSize, filteredCollections.length)}</span> of <span>{filteredCollections.length}</span> entries
          </div>
          <div className="table-pagination__controls">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
            >
              <ChevronLeft style={{ width: 14, height: 14 }} />
              <span>Previous</span>
            </button>
            <span className="page-indicator">
              Page {safePage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
            >
              <span>Next</span>
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Clean Modern Collection Details View Modal ────────────────────── */}
      {selectedReceipt && (() => {
        const linkedBorrower = getLinkedBorrower(selectedReceipt);
        const isReverted = selectedReceipt.reverted;
        const isBounced = selectedReceipt.clearance_status === 'BOUNCED';

        return (
          <>
            {/* Screen View Modal */}
            <div className="saas-modal-backdrop no-print" style={{ zIndex: 1000000 }}>
              <div className="saas-modal-card" style={{ maxWidth: 480, borderRadius: 12, overflow: 'hidden' }}>
                {/* Modal Header */}
                <div className="saas-modal-header" style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '16px 20px' }}>
                  <div className="head-left">
                    <div className="head-icon-badge" style={{ background: '#ECFDF5', borderColor: '#A7F3D0', color: '#059669' }}>
                      <Receipt style={{ width: 18, height: 18 }} />
                    </div>
                    <div className="head-titles">
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>Collection Receipt</h3>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B' }}>
                        {selectedReceipt.voucher_no || `REC-${selectedReceipt.id}`} • {formatDateDDMMYYYY(selectedReceipt.collection_date)}
                      </p>
                    </div>
                  </div>
                  <button onClick={closeReceiptModal} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
                </div>

                {/* Modal Body */}
                <div className="saas-modal-body" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Reverted / Bounced alert banner */}
                  {(isReverted || isBounced) && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: '0.78rem', color: '#991B1B', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0, color: '#DC2626' }} />
                      <div>
                        <strong>{isReverted ? 'Collection Reverted' : 'Cheque Bounced'}</strong>
                        {selectedReceipt.revert_reason && <div>Reason: {selectedReceipt.revert_reason}</div>}
                      </div>
                    </div>
                  )}

                  {/* Customer & Loan Summary */}
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar name={selectedReceipt.borrower_name} photo={linkedBorrower.profile_image || linkedBorrower.photo} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>{selectedReceipt.borrower_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>{selectedReceipt.loan_account_no || selectedReceipt.loan_code}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Phone: {linkedBorrower.phone}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.66rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Total Paid</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#059669' }}>₹{fmt(selectedReceipt.amount)}</div>
                    </div>
                  </div>

                  {/* Payment Breakdown Card */}
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ background: '#F1F5F9', padding: '8px 12px', fontSize: '0.75rem', fontWeight: 700, color: '#334155', borderBottom: '1px solid #E2E8F0' }}>
                      Payment Details
                    </div>
                    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748B' }}>Payment Mode:</span>
                        <strong style={{ color: '#0F172A' }}>{selectedReceipt.payment_mode || 'CASH'}</strong>
                      </div>
                      {selectedReceipt.reference_no && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748B' }}>Txn / Ref No:</span>
                          <span style={{ color: '#0F172A', fontFamily: 'monospace' }}>{selectedReceipt.reference_no}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748B' }}>Principal Portion:</span>
                        <strong style={{ color: '#0F172A' }}>₹{fmt(selectedReceipt.principal_portion || selectedReceipt.principalPaid || 0)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748B' }}>Interest Portion:</span>
                        <strong style={{ color: '#0E7490' }}>₹{fmt(selectedReceipt.interest_portion || selectedReceipt.interestPaid || 0)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: 6 }}>
                        <span style={{ color: '#64748B' }}>Remaining Balance:</span>
                        {(() => {
                          const linkedLoan = (loans || []).find(l => String(l.id) === String(selectedReceipt.loan_id) || l.loan_account_no === selectedReceipt.loan_account_no);
                          const remainingBal = selectedReceipt.new_principal_balance ?? selectedReceipt.newPrincipalBalance ?? (linkedLoan ? linkedLoan.pending_amount : 0);
                          return (
                            <strong style={{ color: Number(remainingBal) > 0 ? '#DC2626' : '#059669' }}>
                              ₹{fmt(remainingBal)}
                            </strong>
                          );
                        })()}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: 6 }}>
                        <span style={{ color: '#64748B' }}>Collector Name:</span>
                        <span style={{ color: '#334155', fontWeight: 600 }}>{selectedReceipt.collector_name || user?.name || 'Main Branch'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="saas-modal-footer" style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setPrintThermalReceipt(selectedReceipt)}
                    style={{
                      background: '#059669', border: '1px solid #059669', color: '#FFFFFF',
                      padding: '7px 14px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600,
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                      boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)'
                    }}
                  >
                    <Printer style={{ width: 14, height: 14, color: '#FFFFFF' }} />
                    <span>Print Receipt</span>
                  </button>

                  {!selectedReceipt.reverted && selectedReceipt.payment_mode === 'CHEQUE' && selectedReceipt.clearance_status === 'PENDING_CLEARANCE' && canControl && (
                    <>
                      <button
                        type="button"
                        onClick={() => { onMarkChequeCleared(selectedReceipt.id); closeReceiptModal(); }}
                        style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#059669', padding: '7px 14px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      >
                        <CheckCircle2 style={{ width: 14, height: 14 }} />
                        <span>Mark Cleared</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setBounceTarget(selectedReceipt); setSelectedReceipt(null); }}
                        style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '7px 14px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      >
                        <XCircle style={{ width: 14, height: 14 }} />
                        <span>Mark Bounced</span>
                      </button>
                    </>
                  )}
                  <button type="button" onClick={closeReceiptModal} className="btn-cancel" style={{ padding: '7px 16px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600 }}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {printThermalReceipt && (() => {
        const linkedBorrower = getLinkedBorrower(printThermalReceipt);
        const linkedLoan = (loans || []).find(l => String(l.id) === String(printThermalReceipt.loan_id) || l.loan_account_no === printThermalReceipt.loan_account_no);
        return (
          <DedicatedThermalPrintModal
            company={tenant}
            receipt={{
              voucher_no: printThermalReceipt.voucher_no || `REC-${printThermalReceipt.id}`,
              date: formatDateDDMMYYYY(printThermalReceipt.collection_date),
              loan_account_no: printThermalReceipt.loan_account_no,
              branch: printThermalReceipt.branch || linkedBorrower.branch,
              borrower_name: printThermalReceipt.borrower_name,
              phone: linkedBorrower.phone,
              payment_mode: printThermalReceipt.payment_mode,
              reference_no: printThermalReceipt.reference_no,
              amount: printThermalReceipt.amount,
              principal_paid: printThermalReceipt.principal_portion || printThermalReceipt.principalPaid,
              interest_paid: printThermalReceipt.interest_portion || printThermalReceipt.interestPaid,
              pending_balance: printThermalReceipt.new_principal_balance ?? printThermalReceipt.newPrincipalBalance ?? (linkedLoan ? linkedLoan.pending_amount : 0),
              collector_name: printThermalReceipt.collector_name || user?.name
            }}
            onClose={() => setPrintThermalReceipt(null)}
          />
        );
      })()}



      {/* ── Record Collection Confirmation Popup Modal ────────────────────── */}
      {confirmCollectionModal && (
        <div className="saas-modal-backdrop" style={{ zIndex: 1000000 }}>
          <div className="saas-modal-card" style={{ maxWidth: 460 }}>
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: '#ECFDF5', borderColor: '#A7F3D0', color: '#059669' }}>
                  <Receipt style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3>{confirmCollectionModal.is_edit ? 'Confirm Collection Update' : 'Confirm Collection Entry'}</h3>
                  <p>{confirmCollectionModal.loan_account_no} — {confirmCollectionModal.borrower_name}</p>
                </div>
              </div>
              <button onClick={() => setConfirmCollectionModal(null)} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <div className="saas-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#64748B' }}>Customer:</span>
                  <strong style={{ color: '#0F172A' }}>{confirmCollectionModal.borrower_name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#64748B' }}>Loan Account:</span>
                  <span style={{ color: '#059669', fontWeight: 600 }}>{confirmCollectionModal.loan_account_no}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#64748B' }}>Collection Date:</span>
                  <span style={{ color: '#0F172A' }}>{formatDateDDMMYYYY(confirmCollectionModal.collection_date)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#64748B' }}>Payment Mode:</span>
                  <span style={{ color: '#334155', fontWeight: 600 }}>{confirmCollectionModal.payment_mode}</span>
                </div>
                {confirmCollectionModal.reference_no && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: '#64748B' }}>Ref / Txn No:</span>
                    <span style={{ color: '#0F172A', fontFamily: 'monospace' }}>{confirmCollectionModal.reference_no}</span>
                  </div>
                )}
                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 8, marginTop: 2, display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
                  <span style={{ color: '#0F172A', fontWeight: 600 }}>Total Paid Amount:</span>
                  <strong style={{ color: '#059669', fontSize: '1rem' }}>₹{fmt(confirmCollectionModal.amount)}</strong>
                </div>
              </div>

              {/* Breakdown details */}
              {confirmCollectionModal.allocation && (
                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, padding: '10px 12px', fontSize: '0.76rem', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ color: '#047857' }}>Principal: </span>
                    <strong style={{ color: '#0F172A' }}>₹{fmt(confirmCollectionModal.allocation.principalPortion)}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#047857' }}>Interest: </span>
                    <strong style={{ color: '#0E7490' }}>₹{fmt(confirmCollectionModal.allocation.interestPortion)}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#047857' }}>New Balance: </span>
                    <strong style={{ color: confirmCollectionModal.allocation.newPendingPrincipal > 0 ? '#DC2626' : '#059669' }}>₹{fmt(confirmCollectionModal.allocation.newPendingPrincipal)}</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="saas-modal-footer">
              <button type="button" onClick={() => setConfirmCollectionModal(null)} className="btn-cancel">{t('btn.cancel')}</button>
              <button
                type="button"
                onClick={executeConfirmedCollection}
                disabled={posting}
                className="btn-submit"
                style={{ background: '#059669', boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)', opacity: posting ? 0.7 : 1, cursor: posting ? 'not-allowed' : 'pointer' }}
              >
                {posting ? 'Processing...' : (confirmCollectionModal.is_edit ? 'Confirm Update' : 'Confirm Collection')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Collection Success Animated Tick Toast Modal Overlay ── */}
      {showSuccessTick && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000000,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: 16, padding: '24px 32px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <style>{`
              @keyframes scaleIn {
                0% { transform: scale(0.85); opacity: 0; }
                100% { transform: scale(1); opacity: 1; }
              }
              @keyframes checkDraw {
                0% { stroke-dashoffset: 48; }
                100% { stroke-dashoffset: 0; }
              }
            `}</style>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: '#ECFDF5',
              border: '2px solid #A7F3D0', color: '#059669', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}>
              <CheckCircle2 style={{ width: 36, height: 36 }} />
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', textAlign: 'center' }}>
              Collection Recorded Successfully!
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', textAlign: 'center' }}>
              General Ledger updated & receipt generated
            </div>
          </div>
        </div>
      )}

      {/* ── Revert Confirmation ───────────────────────────────── */}
      {revertTarget && (
        <div className="saas-modal-backdrop" style={{ zIndex: 1000000 }}>
          <div className="saas-modal-card" style={{ maxWidth: 440 }}>
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                  <Undo2 style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3>{t('coll.revert_confirm_title')}</h3>
                  <p>{revertTarget.voucher_no} — {revertTarget.borrower_name}</p>
                </div>
              </div>
              <button onClick={() => { setRevertTarget(null); setRevertError(''); }} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <div className="saas-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: '0.8rem', color: '#334155', margin: 0, lineHeight: 1.5 }}>{t('coll.revert_confirm_desc')}</p>
              {revertError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 9, padding: '9px 12px', fontSize: '0.76rem', color: '#991B1B' }}>
                  <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />
                  <span>{revertError}</span>
                </div>
              )}
              <div className="form-group">
                <label>{t('coll.revert_reason_label')}</label>
                <textarea rows={2} value={revertReason} onChange={e => setRevertReason(e.target.value)} className="input-control" style={{ height: 'auto', padding: '10px 12px' }} placeholder={t('coll.revert_reason_placeholder')} />
              </div>
            </div>
            <div className="saas-modal-footer">
              <button type="button" onClick={() => { setRevertTarget(null); setRevertError(''); }} className="btn-cancel">{t('btn.cancel')}</button>
              <button
                type="button"
                onClick={confirmRevert}
                disabled={revertBusy}
                className="btn-submit"
                style={{ background: '#DC2626', boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)', opacity: revertBusy ? 0.7 : 1, cursor: revertBusy ? 'not-allowed' : 'pointer' }}
              >
                {revertBusy ? '...' : t('coll.revert_collection')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bounce Confirmation ───────────────────────────────── */}
      {bounceTarget && (
        <div className="saas-modal-backdrop" style={{ zIndex: 1000000 }}>
          <div className="saas-modal-card" style={{ maxWidth: 440 }}>
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                  <XCircle style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3>{t('coll.bounce_confirm_title')}</h3>
                  <p>{bounceTarget.voucher_no} — {bounceTarget.borrower_name}</p>
                </div>
              </div>
              <button onClick={() => { setBounceTarget(null); setBounceError(''); }} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <div className="saas-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: '0.8rem', color: '#334155', margin: 0, lineHeight: 1.5 }}>{t('coll.bounce_confirm_desc')}</p>
              {bounceError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 9, padding: '9px 12px', fontSize: '0.76rem', color: '#991B1B' }}>
                  <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />
                  <span>{bounceError}</span>
                </div>
              )}
              <div className="form-group">
                <label>{t('coll.bounce_reason_label')}</label>
                <textarea rows={2} value={bounceReason} onChange={e => setBounceReason(e.target.value)} className="input-control" style={{ height: 'auto', padding: '10px 12px' }} placeholder={t('coll.bounce_reason_placeholder')} />
              </div>
            </div>
            <div className="saas-modal-footer">
              <button type="button" onClick={() => { setBounceTarget(null); setBounceError(''); }} className="btn-cancel">{t('btn.cancel')}</button>
              <button
                type="button"
                onClick={confirmBounce}
                className="btn-submit"
                style={{ background: '#DC2626', boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)' }}
              >
                {t('coll.mark_bounced')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Proof Image Preview ──────────────────────────────── */}
      {previewImage && (
        <div className="saas-modal-backdrop" style={{ zIndex: 1000001 }} onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="Proof of payment" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 10, border: '3px solid #FFFFFF' }} />
        </div>
      )}

      {/* ── Reverted Success Animation ────────────────────────── */}
      {showRevertedAnim && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000002, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <style>{`
            @keyframes collRevertPop { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
            @keyframes collRevertPulse { 0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); } 70% { box-shadow: 0 0 0 24px rgba(220, 38, 38, 0); } 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); } }
          `}</style>
          <div style={{ background: '#FFFFFF', borderRadius: 22, padding: '32px 44px', textAlign: 'center', animation: 'collRevertPop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#DC2626', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto', animation: 'collRevertPulse 1.6s infinite' }}>
              <Undo2 style={{ width: 32, height: 32, strokeWidth: 2.5 }} />
            </div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>{t('coll.reverted_badge')}</h3>
            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>{t('coll.revert_confirm_desc')}</span>
          </div>
        </div>
      )}

      {/* ── Customer Profile Modal ────────────────────────────── */}
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
