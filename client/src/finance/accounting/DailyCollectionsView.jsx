import React, { useState, useEffect, useMemo } from 'react';
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
  Printer,
  Clock,
  Calendar,
  ArrowRight,
  Wallet,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Check,
  Shield,
  List,
  LayoutGrid
} from 'lucide-react';
import CustomerProfileModal from '../borrowers/CustomerProfileModal';
import VoucherReceiptModal from '../../components/VoucherReceiptModal';
import api from '../../api/client';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { calculatePaymentAllocation, daysBetween, resolveLastPaymentDate } from '../../utils/loanCalculations';
import SharedDropdown from '../../components/common/SharedDropdown';
import SharedDatePicker from '../../components/common/SharedDatePicker';

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
      background: 'var(--brand-primary-light, #F0FEF5)', color: 'var(--brand-primary, #15803D)', border: '1px solid var(--brand-primary-border, #A3F5C1)',
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
    good: { bg: 'var(--brand-primary-light, #F0FEF5)', border: 'var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)' },
    bad: { bg: 'var(--color-danger-light, #FEF2F2)', border: 'var(--color-danger-border, #FECACA)', color: 'var(--color-danger, #DC2626)' }
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
  employees = [],
  user,
  tenant,
  branchesList = [],
  selectedBranch = 'ALL',
  onOpenCollectDrawer,
  onRecordCollection,
  onQuickAction,
  onRevertCollection,
  onUpdateCollection,
  onMarkChequeCleared,
  onMarkChequeBounced,
  onApproveWaiver,
  onRejectWaiver
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
  const [datePreset, setDatePreset] = useState('ALL'); // Default to 'ALL' so historical collections display immediately
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [printThermalReceipt, setPrintThermalReceipt] = useState(null);
  const [selectedCustomerForProfile, setSelectedCustomerForProfile] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  // Table is the default on every screen size; a compact toggle lets phone
  // users switch to the card list if they prefer it.
  const [dataView, setDataView] = useState('TABLE'); // 'TABLE' | 'CARDS'

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
  const [chequeClearBusy, setChequeClearBusy] = useState(false);
  const [chequeClearError, setChequeClearError] = useState('');
  const [bounceBusy, setBounceBusy] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const pageSize = 10;

  useEffect(() => {
    api.get('/finance/bank-accounts')
      .then(res => {
        if (res.data?.success && Array.isArray(res.data?.data)) {
          setBankAccounts(res.data.data.filter(b => b.is_active !== false));
        }
      })
      .catch(err => console.warn('Could not load bank accounts:', err));
  }, []);

  // ── Top-Level Tab State & Waiver Approvals State ──
  const [activeSection, setActiveSection] = useState('REGISTER'); // 'REGISTER' | 'WAIVERS'
  const [waiverStatusFilter, setWaiverStatusFilter] = useState('PENDING_APPROVAL'); // 'ALL' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'
  const [selectedWaiverForDetail, setSelectedWaiverForDetail] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [waiverBusy, setWaiverBusy] = useState(false);
  const [waiverActionSuccess, setWaiverActionSuccess] = useState('');

  const waiverCollections = useMemo(() => {
    return (collections || []).filter(c => (Number(c.interest_waiver || 0) > 0 || (c.waiver_status && c.waiver_status !== 'NONE')));
  }, [collections]);

  const pendingWaiversCount = useMemo(() => {
    return waiverCollections.filter(c => c.waiver_status === 'PENDING_APPROVAL' || (!c.waiver_status && Number(c.interest_waiver || 0) > 0)).length;
  }, [waiverCollections]);

  const filteredWaivers = useMemo(() => {
    let list = waiverCollections;
    if (branchFilter !== 'ALL') {
      list = list.filter(c => c.branch === branchFilter);
    }
    if (waiverStatusFilter !== 'ALL') {
      if (waiverStatusFilter === 'PENDING_APPROVAL') {
        list = list.filter(c => c.waiver_status === 'PENDING_APPROVAL' || (!c.waiver_status && Number(c.interest_waiver || 0) > 0));
      } else {
        list = list.filter(c => c.waiver_status === waiverStatusFilter);
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(c => 
        (c.borrower_name && c.borrower_name.toLowerCase().includes(q)) ||
        (c.loan_account_no && c.loan_account_no.toLowerCase().includes(q)) ||
        (c.voucher_no && c.voucher_no.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
      );
    }
    return list;
  }, [waiverCollections, branchFilter, waiverStatusFilter, searchQuery]);

  const handleApproveWaiverClick = async (c) => {
    if (typeof onApproveWaiver !== 'function') return;
    setWaiverBusy(true);
    try {
      await onApproveWaiver(c.id);
      setWaiverActionSuccess(`Waiver for ${c.voucher_no || 'loan receipt'} approved successfully.`);
      setTimeout(() => setWaiverActionSuccess(''), 4000);
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Failed to approve waiver');
    } finally {
      setWaiverBusy(false);
    }
  };

  const handleConfirmRejectWaiver = async () => {
    if (!rejectTarget || typeof onRejectWaiver !== 'function') return;
    setWaiverBusy(true);
    try {
      await onRejectWaiver(rejectTarget.id, rejectionReason || 'Waiver rejected by manager');
      setRejectTarget(null);
      setRejectionReason('');
      setWaiverActionSuccess(`Waiver request rejected.`);
      setTimeout(() => setWaiverActionSuccess(''), 4000);
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Failed to reject waiver');
    } finally {
      setWaiverBusy(false);
    }
  };

  const canControl = user?.role !== 'COLLECTOR';
  // Collection Modal State
  const [collectionModalData, setCollectionModalData] = useState(null);
  // The Interest Accrual card is dense (days elapsed, rate, both dates,
  // calculated interest) — most collectors just want the suggested amount,
  // not the derivation. Collapsed by default, expandable for anyone who
  // wants to verify the calculation.
  const [showAccrualDetails, setShowAccrualDetails] = useState(false);
  // The receipt view's branch/GPS/notes/proof section — optional, most
  // people just want the amount/mode breakdown, not every field.
  const [showMoreReceiptDetails, setShowMoreReceiptDetails] = useState(false);
  useEffect(() => { setShowMoreReceiptDetails(false); }, [selectedReceipt]);
  // "Received By" — pick from a real staff list, or type a name manually
  // when the collector isn't in that list (a field agent not yet added as
  // an employee record, a one-off substitute, etc).
  const [collectorEntryMode, setCollectorEntryMode] = useState('SELECT'); // 'SELECT' | 'MANUAL'

  // Header Loan Selection State
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [entryError, setEntryError] = useState('');
  const [posting, setPosting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

  const targetLoan = selectedLoanId
    ? activeLoans.find(l => String(l.id) === String(selectedLoanId))
    : null;

  const selectLoanItem = (loan) => {
    setSelectedLoanId(loan.id);
    setCustomerSearch(`${loan.loan_account_no} - ${loan.borrower_name}`);
    setIsDropdownOpen(false);
    setEntryError('');
  };

  const clearCustomerSelection = () => {
    setSelectedLoanId('');
    setCustomerSearch('');
    setEntryError('');
    setIsDropdownOpen(false);
  };

  const handleOpenCollectionModal = (loanToOpen = null) => {
    const loan = loanToOpen || targetLoan;
    if (!loan) {
      setEntryError('Please select a customer / loan account to record collection.');
      return;
    }
    if (onOpenCollectDrawer) {
      onOpenCollectDrawer(loan);
      return;
    }
    setEntryError('');
    setCollectorEntryMode('SELECT');
    setShowAccrualDetails(false);
    setCollectionModalData({
      is_edit: false,
      loan: loan,
      amountPaid: '',
      paymentMode: 'CASH',
      collectionDate: new Date().toISOString().slice(0, 10),
      collectorName: user?.name || '',
      referenceNo: '',
      notes: ''
    });
  };

  const prefillCollectionForEdit = (collection) => {
    const matchedLoan = (loans || []).find(l => String(l.id) === String(collection.loan_id) || l.loan_account_no === collection.loan_account_no);
    setCollectorEntryMode('SELECT');
    setShowAccrualDetails(false);
    setCollectionModalData({
      is_edit: true,
      collection_id: collection.id,
      loan: matchedLoan || {
        id: collection.loan_id,
        loan_account_no: collection.loan_account_no,
        borrower_name: collection.borrower_name,
        phone: collection.phone,
        branch: collection.branch,
        pending_amount: collection.new_principal_balance || collection.amount,
        principal_amount: collection.principal_paid || collection.amount,
        installment_amount: collection.amount
      },
      amountPaid: String(collection.amount || ''),
      paymentMode: collection.payment_mode || 'CASH',
      collectionDate: collection.collection_date || new Date().toISOString().slice(0, 10),
      collectorName: collection.collector_name || user?.name || '',
      referenceNo: collection.reference_no || '',
      notes: collection.notes || ''
    });
  };

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  const getLinkedBorrower = (c) => {
    return (borrowers || []).find(b => b.full_name === c.borrower_name || b.phone === c.phone || b.id === c.borrower_id) || {
      full_name: c.borrower_name || 'Customer',
      phone: c.phone || 'Not provided',
      branch: c.branch || '—',
      borrower_code: null
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
      const interestPortion = Number(c.interest_paid ?? c.interest_portion ?? c.interestPaid ?? 0);
      const principalPortion = Number(c.principal_paid ?? c.principal_portion ?? c.principalPaid ?? (amount - interestPortion));
      const remainingBal = Number(c.new_principal_balance ?? c.newPrincipalBalance ?? 0);
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

  const confirmRevert = async () => {
    setRevertBusy(true);
    setRevertError('');
    try {
      await onRevertCollection(revertTarget.id, revertReason);
      setRevertTarget(null);
      setRevertReason('');
      closeReceiptModal();
      setShowRevertedAnim(true);
      setTimeout(() => setShowRevertedAnim(false), 1700);
    } catch (err) {
      setRevertError(err?.response?.data?.message || err?.message || 'Could not revert this collection.');
    } finally {
      setRevertBusy(false);
    }
  };

  const confirmBounce = async () => {
    setBounceBusy(true);
    setBounceError('');
    try {
      await onMarkChequeBounced(bounceTarget.id, bounceReason);
      setBounceTarget(null);
      setBounceReason('');
      closeReceiptModal();
    } catch (err) {
      setBounceError(err?.response?.data?.message || err?.message || 'Could not mark this cheque as bounced.');
    } finally {
      setBounceBusy(false);
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
      {/* ── Modern Enterprise Responsive Table & Cards Design ── */}
      <style>{`
        .coll-card-container {
          border-radius: 10px;
          border: 1px solid #CBD5E1;
          background: #FFFFFF;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
        }
        .coll-scroll-area {
          max-height: calc(100vh - 360px);
          overflow-y: auto;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .coll-scroll-area table {
          width: 100%;
          min-width: 780px;
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
          white-space: nowrap;
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

        /* ── Toolbar Single-Row on Desktop, Stacked on Mobile ── */
        .coll-toolbar-row {
          padding: 10px 14px;
          background: #F8FAFC;
          border-bottom: 1px solid #E2E8F0;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: nowrap;
        }
        .coll-toolbar-search {
          position: relative;
          width: 220px;
          flex-shrink: 0;
        }

        /* ── Table vs Card view — user-controlled at every screen size,
              defaults to table (see .coll-view-switch) ── */
        .coll-view-table .coll-desktop-view { display: block; }
        .coll-view-table .coll-mobile-view { display: none !important; }
        .coll-view-cards .coll-desktop-view { display: none !important; }
        .coll-view-cards .coll-mobile-view {
          display: flex !important;
          flex-direction: column;
          gap: 10px;
          padding: 10px;
          max-height: calc(100vh - 280px);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        /* Compact view toggle */
        .coll-view-switch {
          display: inline-flex;
          align-items: center;
          background: #FFFFFF;
          border: 1px solid #CBD5E1;
          border-radius: 8px;
          padding: 2px;
          gap: 2px;
          flex: 0 0 auto;
          margin-left: auto;
          align-self: center;
        }
        .coll-view-switch button {
          width: 30px;
          height: 30px;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: #64748B;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .coll-view-switch button.active {
          background: var(--brand-primary-light, #F0FEF5);
          color: var(--brand-primary, #15803D);
        }

        @media (max-width: 768px) {
          .coll-view-switch button { width: 34px; height: 34px; }
          /* Compact, app-style filter bar: a full-width search on its own line,
             then the dropdowns as small chips two-per-row — not four stacked
             full-width bars. */
          .coll-toolbar-row {
            flex-wrap: wrap !important;
            align-items: stretch !important;
            gap: 6px !important;
            padding: 8px 10px !important;
          }
          .coll-toolbar-search {
            width: 100% !important;
            flex: 1 1 100% !important;
          }
          .coll-toolbar-search input {
            height: 34px !important;
          }
          .coll-toolbar-row-inner {
            flex-wrap: wrap !important;
            align-items: stretch !important;
            width: 100% !important;
            gap: 6px !important;
          }
          .coll-toolbar-row > div:not(.coll-toolbar-search):not(.shared-dropdown-root):not(.coll-view-switch) {
            flex: 1 1 100% !important;
          }
          .coll-view-switch { margin-left: 0 !important; }
          .coll-toolbar-row .shared-dropdown-root {
            flex: 1 1 calc(50% - 3px) !important;
            min-width: 0 !important;
            width: auto !important;
          }
          .coll-toolbar-row .shared-dropdown-root > button {
            width: 100% !important;
            min-width: 0 !important;
            height: 34px !important;
            font-size: 0.72rem !important;
          }
          .coll-toolbar-row > button {
            flex: 1 1 100% !important;
            width: 100% !important;
          }

          /* Slim page header + tabs */
          .coll-entry-card {
            padding: 12px !important;
            margin-bottom: 12px !important;
          }
          .coll-reg-header {
            margin-bottom: 10px !important;
            padding-bottom: 8px !important;
          }
          .coll-reg-title { font-size: 0.98rem !important; }
          .coll-reg-subtitle {
            font-size: 0.68rem !important;
            line-height: 1.35 !important;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .coll-tabs {
            gap: 2px !important;
            margin-bottom: 10px !important;
          }
          .coll-tab {
            font-size: 0.74rem !important;
            padding: 7px 9px !important;
            gap: 4px !important;
          }
          .coll-tab svg {
            width: 13px !important;
            height: 13px !important;
          }
        }
      `}</style>

      {/* ── Top Level Navigation Tabs: Collection Register vs Waiver Approvals ── */}
      <div className="coll-tabs" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
        borderBottom: '1px solid #E2E8F0',
        paddingBottom: 2
      }}>
        <button
          type="button"
          className="coll-tab"
          onClick={() => setActiveSection('REGISTER')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeSection === 'REGISTER' ? '2.5px solid var(--brand-primary, #15803D)' : '2.5px solid transparent',
            color: activeSection === 'REGISTER' ? 'var(--brand-primary, #15803D)' : '#64748B',
            fontWeight: activeSection === 'REGISTER' ? 700 : 500,
            fontSize: '0.86rem',
            padding: '8px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            transition: 'all 0.15s ease'
          }}
        >
          <Receipt style={{ width: 16, height: 16 }} />
          <span>Collection Register</span>
        </button>

        <button
          type="button"
          className="coll-tab"
          onClick={() => setActiveSection('WAIVERS')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeSection === 'WAIVERS' ? '2.5px solid var(--brand-primary, #15803D)' : '2.5px solid transparent',
            color: activeSection === 'WAIVERS' ? 'var(--brand-primary, #15803D)' : '#64748B',
            fontWeight: activeSection === 'WAIVERS' ? 700 : 500,
            fontSize: '0.86rem',
            padding: '8px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            transition: 'all 0.15s ease'
          }}
        >
          <ShieldCheck style={{ width: 16, height: 16 }} />
          <span>Waiver Approvals</span>
          {pendingWaiversCount > 0 && (
            <span style={{
              background: '#D97706',
              color: '#FFFFFF',
              borderRadius: 12,
              padding: '1px 8px',
              fontSize: '0.7rem',
              fontWeight: 700,
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}>
              {pendingWaiversCount} Pending
            </span>
          )}
        </button>
      </div>

      {waiverActionSuccess && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--brand-primary-light, #F0FEF5)',
          border: '1px solid var(--brand-primary-border, #A3F5C1)',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 14,
          fontSize: '0.8rem',
          color: 'var(--brand-primary, #15803D)',
          fontWeight: 600
        }}>
          <CheckCircle2 style={{ width: 16, height: 16, flexShrink: 0 }} />
          <span>{waiverActionSuccess}</span>
        </div>
      )}

      {/* ── REGISTER VIEW ── */}
      {activeSection === 'REGISTER' && (
        <>
          {/* ── Collection Entry Form Card with integrated Page Header ── */}
          <div className="fin-card coll-entry-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: 18, marginBottom: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="coll-reg-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Receipt style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <h1 className="coll-reg-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                    {t('coll.title')}
                  </h1>
                  <p className="coll-reg-subtitle" style={{ margin: 0, fontSize: '0.76rem', color: '#64748B' }}>
                    {t('coll.subtitle')}
                  </p>
                </div>
              </div>
          {targetLoan && (
            <div style={{ fontSize: '0.76rem', color: '#64748B', background: '#F8FAFC', padding: '6px 12px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
              Pending Bal: <strong style={{ color: 'var(--color-danger, #DC2626)' }}>₹{fmt(targetLoan.pending_amount)}</strong> | EMI: <strong style={{ color: 'var(--brand-primary, #15803D)' }}>₹{fmt(targetLoan.installment_amount)}</strong>
            </div>
          )}
        </div>

        {entryError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FECACA)', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: '0.76rem', color: 'var(--color-danger-text, #991B1B)' }}>
            <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />
            <span>{entryError}</span>
          </div>
        )}

        {/* Header Bar: Searchable Loan Selector + Record Collection Trigger */}
        <form onSubmit={(e) => { e.preventDefault(); handleOpenCollectionModal(); }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {/* Searchable Customer / Loan Select */}
            <div className="form-group" style={{ margin: 0, position: 'relative', flex: '1 1 360px' }}>
              <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }}>
                Select Customer / Loan Account *
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
                  placeholder="Search customer name, loan # or phone number..."
                  className="input-control"
                  style={{ height: 38, fontSize: '0.82rem', borderRadius: 8, paddingRight: customerSearch ? 32 : 28 }}
                  required={!selectedLoanId}
                />
                {customerSearch ? (
                  <button
                    type="button"
                    onClick={clearCustomerSelection}
                    title="Clear selection"
                    style={{
                      position: 'absolute', right: 8, top: 10, background: 'none',
                      border: 'none', padding: 2, cursor: 'pointer', color: '#94A3B8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#94A3B8'}
                  >
                    <X style={{ width: 16, height: 16 }} />
                  </button>
                ) : (
                  <Search style={{ position: 'absolute', right: 10, top: 11, width: 16, height: 16, color: '#94A3B8', pointerEvents: 'none' }} />
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
                    background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8,
                    maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 20px rgba(0,0,0,0.12)'
                  }}>
                    {filteredCustomerLoans.length === 0 ? (
                      <div style={{ padding: '10px 14px', fontSize: '0.78rem', color: '#94A3B8', textAlign: 'center' }}>
                        No matching active loans found
                      </div>
                    ) : (
                      filteredCustomerLoans.map(l => (
                        <div
                          key={l.id}
                          onClick={() => {
                            selectLoanItem(l);
                            handleOpenCollectionModal(l);
                          }}
                          style={{
                            padding: '10px 14px', fontSize: '0.78rem', cursor: 'pointer',
                            borderBottom: '1px solid #F1F5F9',
                            background: String(selectedLoanId) === String(l.id) ? 'var(--brand-primary-light, #F0FEF5)' : '#FFFFFF'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                          onMouseLeave={(e) => e.currentTarget.style.background = String(selectedLoanId) === String(l.id) ? 'var(--brand-primary-light, #F0FEF5)' : '#FFFFFF'}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 600, color: '#0F172A' }}>{l.borrower_name}</div>
                            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#2563EB', background: '#EFF6FF', padding: '2px 6px', borderRadius: 4 }}>
                              {l.repayment_method === 'INTEREST_ONLY' ? 'Interest Only' : `EMI: ₹${fmt(l.installment_amount)}`}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', fontSize: '0.72rem', marginTop: 3 }}>
                            <span><strong>{l.loan_account_no}</strong> • {l.phone || 'No phone'} • {l.branch || 'Main Branch'}</span>
                            <span style={{ color: 'var(--color-danger, #DC2626)', fontWeight: 600 }}>Bal: ₹{fmt(l.pending_amount)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Action Button: Opens the Calculation & Collection Modal */}
            <div style={{ margin: 0 }}>
              <button
                type="submit"
                className="fin-btn-primary"
                style={{
                  height: 38,
                  padding: '0 20px',
                  justifyContent: 'center',
                  background: 'var(--brand-primary, #15803D)',
                  borderColor: 'var(--brand-primary, #15803D)',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 2px 5px rgba(21, 128, 61, 0.2)'
                }}
              >
                <Receipt style={{ width: 16, height: 16 }} />
                <span>Record Collection</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className={`coll-card-container coll-view-${dataView === 'CARDS' ? 'cards' : 'table'}`}>
        {/* Toolbar Header - Fixed Top */}
        <div className="coll-toolbar-row">
          {/* Search Box */}
          <div className="coll-toolbar-search">
            <Search style={{ position: 'absolute', left: 8, top: 8, width: 13, height: 13, color: '#94A3B8' }} />
            <input
              style={{ paddingLeft: 26, width: '100%', height: 30, borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.75rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              type="text"
              placeholder="Search customer, loan..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>

          {/* Branch Filter */}
          <SharedDropdown
            value={branchFilter}
            onChange={(e) => { setBranchFilter(e.target.value); setCurrentPage(1); }}
            disabled={Boolean(selectedBranch && selectedBranch !== 'ALL')}
            size="sm"
            buttonStyle={{ height: 30, minWidth: 120, fontSize: '0.74rem', padding: '0 8px' }}
            options={[
              { value: 'ALL', label: 'All Branches' },
              ...branchesList.map(b => ({ value: b.name, label: b.name }))
            ]}
          />

          {/* Payment Mode Filter */}
          <SharedDropdown
            value={modeFilter}
            onChange={(e) => { setModeFilter(e.target.value); setCurrentPage(1); }}
            size="sm"
            buttonStyle={{ height: 30, minWidth: 120, fontSize: '0.74rem', padding: '0 8px' }}
            options={[
              { value: 'ALL', label: `All Modes (${countAll})` },
              { value: 'CASH', label: `Cash (${countCash})` },
              { value: 'UPI', label: `UPI (${countUpi})` },
              { value: 'CHEQUE', label: `Cheque (${countCheque})` }
            ]}
          />

          {/* Date Preset Filter */}
          <SharedDropdown
            value={datePreset}
            onChange={(e) => handleDatePresetChange(e.target.value)}
            size="sm"
            buttonStyle={{ height: 30, minWidth: 110, fontSize: '0.74rem', padding: '0 8px' }}
            options={[
              { value: 'ALL', label: 'All Dates' },
              { value: 'TODAY', label: 'Today' },
              { value: '7D', label: '7 Days' },
              { value: '30D', label: '30 Days' },
              { value: 'CUSTOM', label: 'Custom' }
            ]}
          />

          {/* Table / Card view toggle — compact, works at every screen size */}
          <div className="coll-view-switch" role="group" aria-label="Data view">
            <button
              type="button"
              className={dataView === 'TABLE' ? 'active' : ''}
              onClick={() => setDataView('TABLE')}
              title="Table view"
            >
              <List style={{ width: 15, height: 15 }} />
            </button>
            <button
              type="button"
              className={dataView === 'CARDS' ? 'active' : ''}
              onClick={() => setDataView('CARDS')}
              title="Card view"
            >
              <LayoutGrid style={{ width: 15, height: 15 }} />
            </button>
          </div>

          {/* Custom Date Pickers (only shown if datePreset === 'CUSTOM') */}
          {datePreset === 'CUSTOM' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <SharedDatePicker
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
                size="sm"
                buttonStyle={{ height: 30, minWidth: 120, fontSize: '0.72rem' }}
              />
              <span style={{ fontSize: '0.7rem', color: '#64748B' }}>to</span>
              <SharedDatePicker
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
                size="sm"
                buttonStyle={{ height: 30, minWidth: 120, fontSize: '0.72rem' }}
              />
            </div>
          )}
        </div>

        {/* 1. Desktop High-Density Table Area (>= 768px) */}
        <div className="coll-desktop-view coll-scroll-area">
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
                <th className="num" style={{ color: '#D97706' }}>Charges (₹)</th>
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
                  <td colSpan="11" style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
                    {t('coll.no_records')}
                  </td>
                </tr>
              ) : (
                paginatedCollections.map((c, idx) => {
                  const amount = parseFloat(c.amount) || 0;
                  const penaltyPortion = Number(c.penalty ?? c.penalty_paid ?? c.additional_charges ?? c.penaltyPortion ?? 0);
                  const interestPortion = Number(c.interest_paid ?? c.interest_portion ?? c.interestPaid ?? 0);
                  const principalPortion = Number(c.principal_paid ?? c.principal_portion ?? c.principalPaid ?? Math.max(0, amount - interestPortion - penaltyPortion));
                  const timestamp = c.collection_date || c.date || '—';
                  const timeStr = c.created_at ? new Date(c.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';

                  const matchedLoan = loans.find(l => String(l.id) === String(c.loan_id) || l.loan_account_no === c.loan_account_no) || null;
                  const loanAccNo = c.loan_account_no || matchedLoan?.loan_account_no || '—';
                  const remainingBal = c.new_principal_balance !== undefined && c.new_principal_balance !== null
                    ? Number(c.new_principal_balance)
                    : (c.newPrincipalBalance ?? (matchedLoan?.pending_amount ?? 0));
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
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--brand-primary, #15803D)'; e.currentTarget.style.textDecoration = 'underline'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#0F172A'; e.currentTarget.style.textDecoration = c.reverted ? 'line-through' : 'none'; }}
                          >
                            {c.borrower_name || `Loan #${c.loan_id}`}
                          </span>
                        </div>
                      </td>

                      <td className="code" style={{ fontWeight: 400 }}>
                        <span
                          style={{ color: 'var(--brand-primary, #15803D)', fontWeight: 600, cursor: 'pointer', ...textDecor }}
                          onClick={() => setSelectedReceipt(c)}
                          title="Click to view Official Collection Voucher"
                        >
                          {loanAccNo}
                        </span>
                      </td>

                      <td className="num" style={{ color: 'var(--brand-primary, #15803D)', fontWeight: 600, ...textDecor }}>₹{fmt(amount)}</td>
                      <td className="num" style={{ fontWeight: 400, ...textDecor }}>₹{fmt(principalPortion)}</td>
                      <td className="num" style={{ color: '#0E7490', fontWeight: 400, ...textDecor }}>₹{fmt(interestPortion)}</td>
                      <td className="num" style={{ color: penaltyPortion > 0 ? '#D97706' : '#94A3B8', fontWeight: penaltyPortion > 0 ? 600 : 400, ...textDecor }}>
                        {penaltyPortion > 0 ? `₹${fmt(penaltyPortion)}` : '—'}
                      </td>
                      <td className="num" style={{ color: remainingBal > 0 ? 'var(--color-danger, #DC2626)' : 'var(--brand-primary, #15803D)', fontWeight: 400 }}>₹{fmt(remainingBal)}</td>

                      <td style={{ textAlign: 'center', fontWeight: 400 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                          <span style={{ fontSize: '0.74rem', color: '#334155' }}>
                            {c.payment_mode || 'CASH'}
                          </span>
                          {Boolean(c.reverted) && (
                            <span style={{ fontSize: '0.62rem', color: 'var(--color-danger, #DC2626)' }}>{t('coll.reverted_badge')}</span>
                          )}
                          {!c.reverted && c.clearance_status === 'PENDING_CLEARANCE' && (
                            <span style={{ fontSize: '0.62rem', color: 'var(--color-warning-hover, #B45309)' }}>{t('coll.pending_clearance_badge')}</span>
                          )}
                          {!c.reverted && c.clearance_status === 'BOUNCED' && (
                            <span style={{ fontSize: '0.62rem', color: 'var(--color-danger, #DC2626)' }}>{t('coll.bounced_badge')}</span>
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
                              width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0,
                              background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 6,
                              color: '#334155', cursor: 'pointer', display: 'inline-flex',
                              alignItems: 'center', justifyContent: 'center'
                            }}
                          >
                            <Eye size={16} color="#334155" strokeWidth={2} style={{ display: 'block' }} />
                          </button>
                          {!c.reverted && canControl && (
                            <>
                              <button
                                type="button"
                                onClick={() => prefillCollectionForEdit(c)}
                                title="Edit Collection (Prefills Form)"
                                style={{
                                  width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0,
                                  background: 'var(--color-info-light, #EFF6FF)', border: '1px solid #93C5FD', borderRadius: 6,
                                  color: 'var(--color-info, #2563EB)', cursor: 'pointer', display: 'inline-flex',
                                  alignItems: 'center', justifyContent: 'center'
                                }}
                              >
                                <Pencil size={15} color="var(--color-info, #2563EB)" strokeWidth={2} style={{ display: 'block' }} />
                              </button>
                              {c.clearance_status !== 'BOUNCED' && (
                              <button
                                type="button"
                                onClick={() => setRevertTarget(c)}
                                title="Revert Collection"
                                style={{
                                  width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0,
                                  background: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FCA5A5)', borderRadius: 6,
                                  color: 'var(--color-danger, #DC2626)', cursor: 'pointer', display: 'inline-flex',
                                  alignItems: 'center', justifyContent: 'center'
                                }}
                              >
                                <Undo2 size={15} color="var(--color-danger, #DC2626)" strokeWidth={2} style={{ display: 'block' }} />
                              </button>
                              )}
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

        {/* 2. Mobile Responsive Card Deck View (< 768px) */}
        <div className="coll-mobile-view">
          {paginatedCollections.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#94A3B8', fontSize: '0.84rem' }}>
              {t('coll.no_records')}
            </div>
          ) : (
            paginatedCollections.map((c, idx) => {
              const amount = parseFloat(c.amount) || 0;
              const penaltyPortion = Number(c.penalty ?? c.penalty_paid ?? c.additional_charges ?? c.penaltyPortion ?? 0);
              const interestPortion = Number(c.interest_paid ?? c.interest_portion ?? c.interestPaid ?? 0);
              const principalPortion = Number(c.principal_paid ?? c.principal_portion ?? c.principalPaid ?? Math.max(0, amount - interestPortion - penaltyPortion));
              const timestamp = c.collection_date || c.date || '—';
              const matchedLoan = loans.find(l => String(l.id) === String(c.loan_id) || l.loan_account_no === c.loan_account_no) || null;
              const loanAccNo = c.loan_account_no || matchedLoan?.loan_account_no || '—';
              const remainingBal = c.new_principal_balance !== undefined && c.new_principal_balance !== null
                ? Number(c.new_principal_balance)
                : (c.newPrincipalBalance ?? (matchedLoan?.pending_amount ?? 0));
              const linkedBorrower = getLinkedBorrower(c);

              return (
                <div
                  key={c.id || idx}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 10,
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    opacity: c.reverted ? 0.6 : 1
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, color: 'var(--brand-primary, #15803D)', fontSize: '0.78rem' }}>{loanAccNo}</span>
                      <span style={{ fontSize: '0.72rem', color: '#64748B' }}>{formatDateDDMMYYYY(timestamp)}</span>
                    </div>
                    <span style={{
                      padding: '2px 7px',
                      borderRadius: 6,
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      background: c.reverted ? '#FEF2F2' : '#F1F5F9',
                      color: c.reverted ? '#DC2626' : '#334155'
                    }}>
                      {c.reverted ? 'REVERTED' : (c.payment_mode || 'CASH')}
                    </span>
                  </div>

                  <div>
                    <div
                      onClick={() => setSelectedCustomerForProfile(linkedBorrower)}
                      style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', cursor: 'pointer' }}
                    >
                      {c.borrower_name || `Loan #${c.loan_id}`}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                      {linkedBorrower.phone || '—'} · {c.branch || 'Main Branch'}
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 6,
                    background: '#F8FAFC',
                    borderRadius: 8,
                    padding: '8px 10px',
                    fontSize: '0.75rem'
                  }}>
                    <div>
                      <span style={{ color: '#64748B', fontSize: '0.68rem', display: 'block' }}>Paid Amount</span>
                      <strong style={{ color: 'var(--brand-primary, #15803D)', fontSize: '0.86rem' }}>₹{fmt(amount)}</strong>
                      <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block' }}>
                        Pr: ₹{fmt(principalPortion)} | Int: ₹{fmt(interestPortion)}{penaltyPortion > 0 ? ` | Chg: ₹${fmt(penaltyPortion)}` : ''}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', fontSize: '0.68rem', display: 'block' }}>Remaining Balance</span>
                      <strong style={{ color: remainingBal > 0 ? '#DC2626' : '#15803D', fontSize: '0.86rem' }}>₹{fmt(remainingBal)}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                    <button
                      type="button"
                      onClick={() => setSelectedReceipt(c)}
                      style={{
                        flex: 1,
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        color: '#334155',
                        borderRadius: 6,
                        padding: '6px 8px',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                      }}
                    >
                      <Eye style={{ width: 14, height: 14 }} />
                      <span>Voucher</span>
                    </button>

                    {!c.reverted && canControl && (
                      <>
                        <button
                          type="button"
                          onClick={() => prefillCollectionForEdit(c)}
                          style={{
                            background: '#EFF6FF',
                            border: '1px solid #93C5FD',
                            color: '#2563EB',
                            borderRadius: 6,
                            padding: '6px 10px',
                            fontSize: '0.76rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Edit"
                        >
                          <Pencil style={{ width: 14, height: 14 }} />
                        </button>

                        {c.clearance_status !== 'BOUNCED' && (
                          <button
                            type="button"
                            onClick={() => setRevertTarget(c)}
                            style={{
                              background: '#FEF2F2',
                              border: '1px solid #FECACA',
                              color: '#DC2626',
                              borderRadius: 6,
                              padding: '6px 10px',
                              fontSize: '0.76rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Revert"
                          >
                            <Undo2 style={{ width: 14, height: 14 }} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
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
        </>
      )}

      {/* ── WAIVER APPROVALS QUEUE VIEW ── */}
      {activeSection === 'WAIVERS' && (
        <div className={`coll-card-container coll-view-${dataView === 'CARDS' ? 'cards' : 'table'}`}>
          {/* Toolbar Header */}
          <div className="coll-toolbar-row" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap' }} className="coll-toolbar-row-inner">
              {/* Search */}
              <div className="coll-toolbar-search">
                <Search style={{ position: 'absolute', left: 8, top: 8, width: 13, height: 13, color: '#94A3B8' }} />
                <input
                  style={{ paddingLeft: 26, width: '100%', height: 30, borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.75rem', outline: 'none', boxSizing: 'border-box' }}
                  type="text"
                  placeholder="Search borrower, loan # or voucher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Status Filter Dropdown */}
              <SharedDropdown
                value={waiverStatusFilter}
                onChange={(e) => setWaiverStatusFilter(e.target.value)}
                size="sm"
                buttonStyle={{ height: 30, minWidth: 140, fontSize: '0.75rem' }}
                options={[
                  { value: 'ALL', label: `All Statuses (${waiverCollections.length})` },
                  { value: 'PENDING_APPROVAL', label: `Pending Approval (${pendingWaiversCount})` },
                  { value: 'APPROVED', label: `Approved (${waiverCollections.filter(c => c.waiver_status === 'APPROVED').length})` },
                  { value: 'REJECTED', label: `Rejected (${waiverCollections.filter(c => c.waiver_status === 'REJECTED').length})` }
                ]}
              />

              {/* Branch Filter */}
              <SharedDropdown
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                disabled={Boolean(selectedBranch && selectedBranch !== 'ALL')}
                size="sm"
                buttonStyle={{ height: 30, minWidth: 120, fontSize: '0.75rem' }}
                options={[
                  { value: 'ALL', label: 'All Branches' },
                  ...branchesList.map(b => ({ value: b.name, label: b.name }))
                ]}
              />
            </div>

            <div style={{ fontSize: '0.76rem', color: '#64748B', whiteSpace: 'nowrap' }}>
              Showing <strong>{filteredWaivers.length}</strong> waiver requests
            </div>
          </div>

          {/* 1. Desktop High-Density Table View (>= 768px) */}
          <div className="coll-desktop-view coll-scroll-area">
            <table className="fin-grid-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'center', width: 35 }}>#</th>
                  <th style={{ width: 85 }}>Date</th>
                  <th style={{ width: 140 }}>Voucher Code</th>
                  <th>Customer / Loan A/c</th>
                  <th className="num" style={{ width: 90 }}>Paid (₹)</th>
                  <th className="num" style={{ width: 95, color: '#059669' }}>Waived (₹)</th>
                  <th style={{ width: 145 }}>Period Covered</th>
                  <th style={{ textAlign: 'center', width: 110 }}>Status</th>
                  <th style={{ textAlign: 'right', width: 90 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredWaivers.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '48px 20px', color: '#94A3B8' }}>
                      <ShieldCheck style={{ width: 36, height: 36, margin: '0 auto 10px auto', opacity: 0.4, color: '#94A3B8' }} />
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#64748B' }}>No waiver approval requests found</div>
                      <div style={{ fontSize: '0.74rem' }}>When staff submit collections with waived shortfall concessions, they will queue here for authorization.</div>
                    </td>
                  </tr>
                ) : (
                  filteredWaivers.map((c, idx) => {
                    const isPending = c.waiver_status === 'PENDING_APPROVAL' || (!c.waiver_status && Number(c.interest_waiver || 0) > 0);
                    const isApproved = c.waiver_status === 'APPROVED';
                    const isRejected = c.waiver_status === 'REJECTED';
                    const linkedBorrower = getLinkedBorrower(c);

                    return (
                      <tr key={c.id || idx}>
                        <td style={{ textAlign: 'center', color: '#94A3B8' }}>{idx + 1}</td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.74rem' }}>{formatDateDDMMYYYY(c.collection_date)}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => setSelectedWaiverForDetail(c)}
                            style={{
                              background: '#F1F5F9',
                              border: '1px solid #CBD5E1',
                              borderRadius: 6,
                              padding: '3px 8px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              color: 'var(--brand-primary, #15803D)',
                              fontFamily: 'monospace',
                              cursor: 'pointer'
                            }}
                            title="View & authorize waiver"
                          >
                            {c.voucher_no || `REC-${c.id}`}
                          </button>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.8rem' }}>
                            {c.borrower_name} <span style={{ color: '#64748B', fontWeight: 400 }}>({c.loan_account_no})</span>
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748B' }}>
                            {c.phone || linkedBorrower.phone || '—'} · {c.branch || 'Main Branch'} · By: {c.collector_name || 'Staff'}
                          </div>
                        </td>
                        <td className="num">
                          <div style={{ fontWeight: 600, color: 'var(--brand-primary, #15803D)', fontSize: '0.82rem' }}>₹{fmt(c.amount)}</div>
                          <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Int: ₹{fmt(c.interest_paid || c.interest_portion || 0)}</div>
                        </td>
                        <td className="num" style={{ fontWeight: 700, color: '#059669', fontSize: '0.86rem' }}>
                          ₹{fmt(c.interest_waiver || 0)}
                        </td>
                        <td style={{ fontSize: '0.72rem' }}>
                          {c.interest_from_date ? (
                            <span style={{ color: '#4338CA', fontWeight: 600 }}>
                              {c.interest_from_date} → {c.interest_paid_upto} {c.interest_days ? `(${c.interest_days}d)` : ''}
                            </span>
                          ) : (
                            c.interest_paid_upto ? `Up to ${c.interest_paid_upto}` : '—'
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: isPending ? '#FFFBEB' : isApproved ? '#F0FDF4' : '#FEF2F2',
                            color: isPending ? '#B45309' : isApproved ? '#15803D' : '#DC2626',
                            border: `1px solid ${isPending ? '#FDE68A' : isApproved ? '#BBF7D0' : '#FECACA'}`
                          }}>
                            {isPending ? 'Pending' : isApproved ? 'Approved' : 'Rejected'}
                          </span>
                          {isApproved && c.waiver_approved_by && (
                            <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: 2 }}>by {c.waiver_approved_by}</div>
                          )}
                          {isRejected && c.waiver_rejection_reason && (
                            <div style={{ fontSize: '0.65rem', color: '#DC2626', marginTop: 2 }}>{c.waiver_rejection_reason}</div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => setSelectedWaiverForDetail(c)}
                              title={isPending ? 'Review & Authorize Waiver' : 'View Waiver Details'}
                              style={{
                                width: 32,
                                height: 32,
                                minWidth: 32,
                                minHeight: 32,
                                padding: 0,
                                background: isPending ? 'var(--brand-primary-light, #F0FEF5)' : '#F1F5F9',
                                border: `1px solid ${isPending ? 'var(--brand-primary-border, #A3F5C1)' : '#CBD5E1'}`,
                                color: isPending ? 'var(--brand-primary, #15803D)' : '#334155',
                                borderRadius: 6,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <Eye size={16} color={isPending ? '#15803D' : '#334155'} strokeWidth={2.2} style={{ display: 'block' }} />
                            </button>

                            <button
                              type="button"
                              onClick={() => setPrintThermalReceipt(c)}
                              style={{
                                width: 32,
                                height: 32,
                                minWidth: 32,
                                minHeight: 32,
                                padding: 0,
                                background: '#FFFFFF',
                                border: '1px solid #CBD5E1',
                                color: '#475569',
                                borderRadius: 6,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Print Thermal Receipt"
                            >
                              <Printer size={15} color="#475569" strokeWidth={2} style={{ display: 'block' }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 2. Mobile Responsive Card Deck View (< 768px) */}
          <div className="coll-mobile-view">
            {filteredWaivers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94A3B8' }}>
                <ShieldCheck style={{ width: 32, height: 32, margin: '0 auto 8px auto', opacity: 0.4 }} />
                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#64748B' }}>No waiver requests found</div>
                <div style={{ fontSize: '0.72rem', marginTop: 4 }}>When staff submit collections with concessions, they appear here.</div>
              </div>
            ) : (
              filteredWaivers.map((c, idx) => {
                const isPending = c.waiver_status === 'PENDING_APPROVAL' || (!c.waiver_status && Number(c.interest_waiver || 0) > 0);
                const isApproved = c.waiver_status === 'APPROVED';
                const isRejected = c.waiver_status === 'REJECTED';
                const linkedBorrower = getLinkedBorrower(c);

                return (
                  <div
                    key={c.id || idx}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 10,
                      padding: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}
                  >
                    {/* Header Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => setPrintThermalReceipt(c)}
                          style={{
                            background: '#F1F5F9',
                            border: '1px solid #CBD5E1',
                            borderRadius: 6,
                            padding: '3px 8px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            color: 'var(--brand-primary, #15803D)',
                            fontFamily: 'monospace',
                            cursor: 'pointer'
                          }}
                        >
                          {c.voucher_no || `REC-${c.id}`}
                        </button>
                        <span style={{ fontSize: '0.72rem', color: '#64748B' }}>{formatDateDDMMYYYY(c.collection_date)}</span>
                      </div>

                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: isPending ? '#FFFBEB' : isApproved ? '#F0FDF4' : '#FEF2F2',
                        color: isPending ? '#B45309' : isApproved ? '#15803D' : '#DC2626',
                        border: `1px solid ${isPending ? '#FDE68A' : isApproved ? '#BBF7D0' : '#FECACA'}`
                      }}>
                        {isPending ? 'Pending' : isApproved ? 'Approved' : 'Rejected'}
                      </span>
                    </div>

                    {/* Customer & Loan */}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A' }}>
                        {c.borrower_name} <span style={{ fontWeight: 400, color: '#64748B', fontSize: '0.78rem' }}>({c.loan_account_no})</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>
                        {c.phone || linkedBorrower.phone || '—'} · {c.branch || 'Main Branch'} · By: {c.collector_name || 'Staff'}
                      </div>
                    </div>

                    {/* Amount vs Waived Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 8,
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 8,
                      padding: '8px 10px'
                    }}>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>Amount Paid</span>
                        <strong style={{ color: 'var(--brand-primary, #15803D)', fontSize: '0.86rem' }}>₹{fmt(c.amount)}</strong>
                        <span style={{ fontSize: '0.66rem', color: '#64748B', display: 'block' }}>Int: ₹{fmt(c.interest_paid || c.interest_portion || 0)}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>Waived Concession</span>
                        <strong style={{ color: '#059669', fontSize: '0.94rem' }}>₹{fmt(c.interest_waiver || 0)}</strong>
                      </div>
                    </div>

                    {/* Period */}
                    {c.interest_from_date && (
                      <div style={{ fontSize: '0.72rem', color: '#4338CA', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 6, padding: '5px 8px', fontWeight: 600 }}>
                        Period: {c.interest_from_date} → {c.interest_paid_upto} {c.interest_days ? `(${c.interest_days}d)` : ''}
                      </div>
                    )}

                    {/* Approver / Rejection Note */}
                    {isApproved && c.waiver_approved_by && (
                      <div style={{ fontSize: '0.72rem', color: '#15803D', fontWeight: 500 }}>Approved by: {c.waiver_approved_by}</div>
                    )}
                    {isRejected && c.waiver_rejection_reason && (
                      <div style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: 500 }}>Reason: {c.waiver_rejection_reason}</div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                      <button
                        type="button"
                        onClick={() => setSelectedWaiverForDetail(c)}
                        style={{
                          flex: 1,
                          background: isPending ? 'var(--brand-primary, #15803D)' : '#F1F5F9',
                          color: isPending ? '#FFFFFF' : '#334155',
                          border: isPending ? 'none' : '1px solid #CBD5E1',
                          borderRadius: 8,
                          padding: '8px 12px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                      >
                        <Eye style={{ width: 15, height: 15 }} />
                        <span>{isPending ? 'Review & Authorize' : 'View Details'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPrintThermalReceipt(c)}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          color: '#475569',
                          borderRadius: 8,
                          padding: '8px 12px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4
                        }}
                      >
                        <Printer style={{ width: 14, height: 14 }} />
                        <span>Receipt</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

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
                    <div className="head-icon-badge" style={{ background: 'var(--brand-primary-light, #F0FEF5)', borderColor: 'var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)' }}>
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
                    <div style={{ background: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FECACA)', borderRadius: 8, padding: '10px 14px', fontSize: '0.78rem', color: 'var(--color-danger-text, #991B1B)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0, color: 'var(--color-danger, #DC2626)' }} />
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
                      <div style={{ fontSize: '0.75rem', color: 'var(--brand-primary, #15803D)', fontWeight: 600 }}>{selectedReceipt.loan_account_no || selectedReceipt.loan_code}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Phone: {linkedBorrower.phone}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.66rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Total Paid</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--brand-primary, #15803D)' }}>₹{fmt(selectedReceipt.amount)}</div>
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
                        <strong style={{ color: '#0F172A' }}>₹{fmt(selectedReceipt.principal_paid ?? selectedReceipt.principal_portion ?? selectedReceipt.principalPaid ?? 0)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748B' }}>Interest Portion:</span>
                        <strong style={{ color: '#0E7490' }}>₹{fmt(selectedReceipt.interest_paid ?? selectedReceipt.interest_portion ?? selectedReceipt.interestPaid ?? 0)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: 6 }}>
                        <span style={{ color: '#64748B' }}>Remaining Balance:</span>
                        {(() => {
                          const linkedLoan = (loans || []).find(l => String(l.id) === String(selectedReceipt.loan_id) || l.loan_account_no === selectedReceipt.loan_account_no);
                          const remainingBal = selectedReceipt.new_principal_balance ?? selectedReceipt.newPrincipalBalance ?? (linkedLoan ? linkedLoan.pending_amount : 0);
                          return (
                            <strong style={{ color: Number(remainingBal) > 0 ? 'var(--color-danger, #DC2626)' : 'var(--brand-primary, #15803D)' }}>
                              ₹{fmt(remainingBal)}
                            </strong>
                          );
                        })()}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: 6 }}>
                        <span style={{ color: '#64748B' }}>Received By:</span>
                        <span style={{ color: '#334155', fontWeight: 600 }}>{selectedReceipt.collector_name || user?.name || '—'}</span>
                      </div>
                      {Number(selectedReceipt.penalty) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748B' }}>Late Fee / Penalty:</span>
                          <strong style={{ color: 'var(--color-warning, #D97706)' }}>₹{fmt(selectedReceipt.penalty)}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Details Card — branch, notes, proof, location.
                      Optional/collapsed by default: most people just want the
                      amount/mode breakdown above, not every field. */}
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => setShowMoreReceiptDetails(v => !v)}
                      style={{
                        width: '100%', background: '#F1F5F9', border: 'none', cursor: 'pointer',
                        padding: '8px 12px', fontSize: '0.75rem', fontWeight: 700, color: '#334155',
                        borderBottom: showMoreReceiptDetails ? '1px solid #E2E8F0' : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                      }}
                    >
                      <span>Additional Details</span>
                      {showMoreReceiptDetails ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
                    </button>
                    {showMoreReceiptDetails && (
                      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748B' }}>Branch:</span>
                          <strong style={{ color: '#0F172A' }}>{selectedReceipt.branch || linkedBorrower.branch || '—'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748B' }}>Received At:</span>
                          <strong style={{ color: '#0F172A' }}>{selectedReceipt.received_at === 'FIELD_VISIT' ? 'Field Visit' : 'Branch Counter'}</strong>
                        </div>
                        {(selectedReceipt.latitude != null && selectedReceipt.longitude != null) && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748B' }}>GPS Location:</span>
                            <a
                              href={`https://maps.google.com/?q=${selectedReceipt.latitude},${selectedReceipt.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: 'var(--color-info, #2563EB)', fontFamily: 'monospace', fontSize: '0.72rem' }}
                            >
                              {Number(selectedReceipt.latitude).toFixed(5)}, {Number(selectedReceipt.longitude).toFixed(5)}
                            </a>
                          </div>
                        )}
                        {selectedReceipt.notes && (
                          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 6 }}>
                            <span style={{ color: '#64748B', display: 'block', marginBottom: 3 }}>Remarks:</span>
                            <span style={{ color: '#334155' }}>{selectedReceipt.notes}</span>
                          </div>
                        )}
                        {selectedReceipt.proof_image && (
                          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 8 }}>
                            <span style={{ color: '#64748B', display: 'block', marginBottom: 6 }}>Proof of Payment:</span>
                            <img
                              src={selectedReceipt.proof_image}
                              alt="Proof of payment"
                              onClick={() => setPreviewImage(selectedReceipt.proof_image)}
                              style={{ width: 90, height: 90, borderRadius: 8, objectFit: 'cover', border: '1px solid #E2E8F0', cursor: 'pointer' }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {chequeClearError && (
                  <div style={{ padding: '8px 20px', fontSize: '0.76rem', color: 'var(--color-danger-text, #991B1B)', background: 'var(--color-danger-light, #FEF2F2)', borderTop: '1px solid var(--color-danger-border, #FECACA)' }}>
                    {chequeClearError}
                  </div>
                )}

                {/* Modal Footer */}
                <div className="saas-modal-footer" style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setPrintThermalReceipt(selectedReceipt)}
                    style={{
                      background: 'var(--brand-primary, #15803D)', border: '1px solid var(--brand-primary, #15803D)', color: '#FFFFFF',
                      padding: '7px 14px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600,
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                      boxShadow: '0 2px 4px rgba(var(--brand-primary-rgb), 0.2)'
                    }}
                  >
                    <Printer style={{ width: 14, height: 14, color: '#FFFFFF' }} />
                    <span>Print Receipt</span>
                  </button>

                  {!selectedReceipt.reverted && selectedReceipt.payment_mode === 'CHEQUE' && selectedReceipt.clearance_status === 'PENDING_CLEARANCE' && canControl && (
                    <>
                      <button
                        type="button"
                        disabled={chequeClearBusy}
                        onClick={async () => {
                          setChequeClearBusy(true);
                          setChequeClearError('');
                          try {
                            await onMarkChequeCleared(selectedReceipt.id);
                            closeReceiptModal();
                          } catch (err) {
                            setChequeClearError(err?.response?.data?.message || err?.message || 'Could not mark this cheque as cleared.');
                          } finally {
                            setChequeClearBusy(false);
                          }
                        }}
                        style={{ background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)', padding: '7px 14px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, cursor: chequeClearBusy ? 'not-allowed' : 'pointer', opacity: chequeClearBusy ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      >
                        <CheckCircle2 style={{ width: 14, height: 14 }} />
                        <span>{chequeClearBusy ? 'Processing…' : 'Mark Cleared'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setBounceTarget(selectedReceipt); setSelectedReceipt(null); }}
                        style={{ background: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FECACA)', color: 'var(--color-danger, #DC2626)', padding: '7px 14px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
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
          <VoucherReceiptModal
            company={tenant}
            voucher={{
              voucher_no: printThermalReceipt.voucher_no || `REC-${printThermalReceipt.id}`,
              date: formatDateDDMMYYYY(printThermalReceipt.collection_date),
              loan_account_no: printThermalReceipt.loan_account_no,
              branch: printThermalReceipt.branch || linkedBorrower.branch,
              borrower_name: printThermalReceipt.borrower_name,
              phone: linkedBorrower.phone,
              payment_mode: printThermalReceipt.payment_mode,
              reference_no: printThermalReceipt.reference_no,
              amount: printThermalReceipt.amount,
              principal_paid: printThermalReceipt.principal_paid ?? printThermalReceipt.principal_portion ?? printThermalReceipt.principalPaid ?? 0,
              interest_paid: printThermalReceipt.interest_paid ?? printThermalReceipt.interest_portion ?? printThermalReceipt.interestPaid ?? 0,
              penalty: printThermalReceipt.penalty ?? printThermalReceipt.penalty_portion ?? 0,
              interest_from_date: printThermalReceipt.interest_from_date || null,
              interest_paid_upto: printThermalReceipt.interest_paid_upto || printThermalReceipt.interest_to_date || null,
              interest_days: printThermalReceipt.interest_days ?? null,
              interest_shortfall: printThermalReceipt.interest_shortfall || 0,
              interest_waiver: printThermalReceipt.interest_waiver || 0,
              pending_balance: printThermalReceipt.new_principal_balance ?? printThermalReceipt.newPrincipalBalance ?? (linkedLoan ? linkedLoan.pending_amount : 0),
              collector_name: printThermalReceipt.collector_name || user?.name
            }}
            typeLabel="COLLECTION RECEIPT"
            onClose={() => setPrintThermalReceipt(null)}
          />
        );
      })()}



      {/* ── Record Loan Collection & Interest Accrual Calculation Modal ── */}
      {collectionModalData && (() => {
        const loan = collectionModalData.loan;
        const isEdit = Boolean(collectionModalData.is_edit);
        const linkedBorrower = getLinkedBorrower(loan);
        const customerName = loan.borrower_name || linkedBorrower.full_name || 'Customer';
        const customerPhone = loan.phone || linkedBorrower.phone || '—';
        const branchName = loan.branch || linkedBorrower.branch || 'Main Branch';

        const principal = parseFloat(loan.principal_amount) || 0;
        const pendingPrincipal = parseFloat(loan.pending_amount) || 0;
        const monthlyRate = parseFloat(loan.monthly_interest_rate) || 2.0;
        const dailyRate = (monthlyRate / 100) / 30;

        const effectivePaymentDate = collectionModalData.collectionDate || new Date().toISOString().slice(0, 10);
        const lastPaidDate = resolveLastPaymentDate(loan, effectivePaymentDate);
        const daysElapsed = daysBetween(lastPaidDate, effectivePaymentDate);

        // Interest calculation
        let calculatedInterestDue = 0;
        let suggestedPrincipalDue = 0;

        if (loan.repayment_method === 'INTEREST_ONLY') {
          const base = (loan.interest_calculation === 'CONSTANT_FLAT') ? principal : pendingPrincipal;
          calculatedInterestDue = Math.round(base * dailyRate * daysElapsed);
          suggestedPrincipalDue = 0;
        } else {
          // EMI loan
          const emi = parseFloat(loan.installment_amount) || 0;
          const baseInterest = Math.round(principal * (monthlyRate / 100));
          calculatedInterestDue = baseInterest;
          suggestedPrincipalDue = Math.max(0, emi - calculatedInterestDue);
        }

        const suggestedTotal = loan.repayment_method === 'INTEREST_ONLY'
          ? Math.max(0, calculatedInterestDue)
          : (parseFloat(loan.installment_amount) || (calculatedInterestDue + suggestedPrincipalDue));

        const currentAmount = collectionModalData.amountPaid !== ''
          ? collectionModalData.amountPaid
          : (suggestedTotal > 0 ? String(suggestedTotal) : '');

        const numAmount = parseFloat(currentAmount) || 0;

        const liveAlloc = calculatePaymentAllocation({
          loan,
          paymentAmount: numAmount,
          paymentDate: effectivePaymentDate
        });

        const handleModalSubmit = async (e) => {
          e.preventDefault();
          if (numAmount <= 0) {
            setEntryError('Please enter a valid collection amount.');
            return;
          }
          if (!isEdit && numAmount > loan.pending_amount) {
            setEntryError(`Collection amount (₹${fmt(numAmount)}) cannot exceed pending balance (₹${fmt(loan.pending_amount)}).`);
            return;
          }

          setPosting(true);
          try {
            const isNonCash = (collectionModalData.paymentMode || 'CASH') !== 'CASH';
            const selectedBank = bankAccounts.find(b => String(b.id) === String(collectionModalData.bankAccountId)) || (isNonCash ? bankAccounts[0] : null);

            const payload = {
              is_edit: isEdit,
              collection_id: collectionModalData.collection_id,
              loan_id: loan.id,
              loan_account_no: loan.loan_account_no,
              borrower_name: customerName,
              phone: customerPhone,
              branch: branchName,
              amount: numAmount,
              principal_portion: liveAlloc.principalPortion,
              interest_portion: liveAlloc.interestPortion,
              new_principal_balance: liveAlloc.newPendingPrincipal,
              updated_schedule: liveAlloc.updatedSchedule,
              payment_mode: collectionModalData.paymentMode || 'CASH',
              bank_account_id: isNonCash && selectedBank ? selectedBank.id : null,
              settlement_account_code: isNonCash && selectedBank ? (selectedBank.ledger_account_code || '1002') : null,
              reference_no: collectionModalData.referenceNo || '',
              collector_name: collectionModalData.collectorName || user?.name || 'Staff Collector',
              collection_date: effectivePaymentDate,
              notes: collectionModalData.notes || '',
              allocation: liveAlloc
            };

            let res;
            if (isEdit) {
              res = await onUpdateCollection(collectionModalData.collection_id, payload);
            } else {
              res = await onRecordCollection(payload);
            }

            // Success feedback
            setShowSuccessTick(true);
            setTimeout(() => setShowSuccessTick(false), 800);

            // Automatically open printable thermal receipt
            setPrintThermalReceipt(res?.data || payload);

            // Reset selection & close modal
            clearCustomerSelection();
            setCollectionModalData(null);
          } catch (err) {
            setEntryError(err?.response?.data?.message || err?.message || 'Failed to record collection entry.');
          } finally {
            setPosting(false);
          }
        };

        return (
          <div className="saas-modal-backdrop" style={{ zIndex: 1000000 }}>
            <div className="saas-modal-card" style={{ maxWidth: 620, borderRadius: 14, overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif' }}>
              {/* Modal Header */}
              <div className="saas-modal-header" style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '16px 22px' }}>
                <div className="head-left">
                  <div className="head-icon-badge" style={{ background: 'var(--brand-primary-light, #F0FEF5)', borderColor: 'var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)' }}>
                    <Receipt style={{ width: 20, height: 20 }} />
                  </div>
                  <div className="head-titles">
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                      {isEdit ? 'Edit Collection Entry' : 'Record Loan Collection'}
                    </h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#64748B' }}>
                      {loan.loan_account_no} • {customerName} • {branchName}
                    </p>
                  </div>
                </div>
                <button onClick={() => setCollectionModalData(null)} className="close-btn" type="button"><X style={{ width: 18, height: 18 }} /></button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleModalSubmit}>
                <div className="saas-modal-body" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 'calc(85vh - 120px)', overflowY: 'auto' }}>

                  {/* Customer & Loan Overview Card */}
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, fontSize: '0.76rem' }}>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>Customer Name</span>
                        <strong style={{ color: '#0F172A', fontSize: '0.82rem' }}>{customerName}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>Loan Account No</span>
                        <strong style={{ color: 'var(--brand-primary, #15803D)', fontSize: '0.82rem' }}>{loan.loan_account_no}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>Sanctioned Principal</span>
                        <strong style={{ color: '#0F172A' }}>₹{fmt(principal)}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>Outstanding Balance</span>
                        <strong style={{ color: pendingPrincipal > 0 ? 'var(--color-danger, #DC2626)' : 'var(--brand-primary, #15803D)' }}>
                          ₹{fmt(pendingPrincipal)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Interest Accrual Calculation Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFEFF 100%)',
                    border: '1px solid #A7F3D0',
                    borderRadius: 10,
                    padding: '14px 16px'
                  }}>
                    <button
                      type="button"
                      onClick={() => setShowAccrualDetails(v => !v)}
                      style={{
                        width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginBottom: showAccrualDetails ? 10 : 0
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#065F46', fontWeight: 700, fontSize: '0.82rem' }}>
                        <Clock style={{ width: 16, height: 16, color: '#059669' }} />
                        <span>Interest Accrual & Period Calculation</span>
                        {showAccrualDetails ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
                      </div>
                      <span style={{
                        background: '#D1FAE5', color: '#065F46', fontSize: '0.7rem',
                        fontWeight: 700, padding: '3px 8px', borderRadius: 6, border: '1px solid #A7F3D0'
                      }}>
                        {daysElapsed} Days Elapsed
                      </span>
                    </button>

                    {showAccrualDetails && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, fontSize: '0.76rem' }}>
                          <div>
                            <span style={{ color: '#047857', display: 'block', fontSize: '0.7rem' }}>Interest Last Paid Date</span>
                            <strong style={{ color: '#0F172A' }}>{formatDateDDMMYYYY(lastPaidDate)}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#047857', display: 'block', fontSize: '0.7rem' }}>Collection Date (To Date)</span>
                            <strong style={{ color: '#0F172A' }}>{formatDateDDMMYYYY(effectivePaymentDate)}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#047857', display: 'block', fontSize: '0.7rem' }}>Rate ({loan.repayment_method || 'EMI'})</span>
                            <strong style={{ color: '#0F172A' }}>{monthlyRate}% / mo ({(dailyRate * 100).toFixed(4)}%/d)</strong>
                          </div>
                          <div>
                            <span style={{ color: '#047857', display: 'block', fontSize: '0.7rem' }}>Calculated Interest Due</span>
                            <strong style={{ color: '#0E7490', fontSize: '0.92rem' }}>₹{fmt(calculatedInterestDue)}</strong>
                          </div>
                        </div>

                        {/* Summary of Suggested Payable */}
                        <div style={{
                          marginTop: 10, paddingTop: 10, borderTop: '1px dashed #A7F3D0',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem'
                        }}>
                          <span style={{ color: '#065F46' }}>
                            Suggested Amount ({loan.repayment_method === 'INTEREST_ONLY' ? 'Interest Accrued' : 'Scheduled EMI'}):
                          </span>
                          <strong style={{ color: 'var(--brand-primary, #15803D)', fontSize: '0.96rem' }}>
                            ₹{fmt(suggestedTotal)}
                          </strong>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Payment Inputs */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
                    {/* Amount Paid */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#334155', marginBottom: 4, display: 'block' }}>
                        Amount Received (₹) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        max={loan.pending_amount}
                        value={currentAmount}
                        onChange={(e) => {
                          setCollectionModalData(prev => ({ ...prev, amountPaid: e.target.value }));
                          setEntryError('');
                        }}
                        placeholder="0.00"
                        className="input-control mono"
                        style={{ height: 38, fontSize: '0.95rem', fontWeight: 700, color: 'var(--brand-primary, #15803D)', borderRadius: 8 }}
                        required
                        autoFocus
                      />
                    </div>

                    {/* Payment Mode */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#334155', marginBottom: 4, display: 'block' }}>
                        Payment Mode *
                      </label>
                      <SharedDropdown
                        value={collectionModalData.paymentMode || 'CASH'}
                        onChange={(e) => setCollectionModalData(prev => ({ ...prev, paymentMode: e.target.value }))}
                        options={PAYMENT_MODES.map(m => ({ value: m, label: m }))}
                      />
                    </div>

                    {/* Collection Date */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#334155', marginBottom: 4, display: 'block' }}>
                        Collection Date *
                      </label>
                      <SharedDatePicker
                        max={getTodayISO()}
                        value={effectivePaymentDate}
                        onChange={(e) => setCollectionModalData(prev => ({ ...prev, collectionDate: e.target.value }))}
                        buttonStyle={{ height: 38, fontSize: '0.8rem', borderRadius: 8 }}
                        required
                      />
                    </div>

                    {/* Received By — pick from the real staff list, or type a
                        name manually when the collector isn't one of them
                        (a field agent not yet added as an employee record,
                        a one-off substitute, etc). */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#334155', marginBottom: 4, display: 'block' }}>
                        Received By
                      </label>
                      {collectorEntryMode === 'MANUAL' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            type="text"
                            autoFocus
                            value={collectionModalData.collectorName || ''}
                            onChange={(e) => setCollectionModalData(prev => ({ ...prev, collectorName: e.target.value }))}
                            placeholder="Enter staff name"
                            className="input-control"
                            style={{ height: 38, fontSize: '0.8rem', borderRadius: 8, flex: 1 }}
                          />
                          <button
                            type="button"
                            onClick={() => { setCollectorEntryMode('SELECT'); setCollectionModalData(prev => ({ ...prev, collectorName: '' })); }}
                            title="Pick from staff list instead"
                            style={{ height: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#475569', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            List
                          </button>
                        </div>
                      ) : (
                        <SharedDropdown
                          value={collectionModalData.collectorName || ''}
                          onChange={(e) => {
                            if (e.target.value === '__MANUAL__') {
                              setCollectorEntryMode('MANUAL');
                              setCollectionModalData(prev => ({ ...prev, collectorName: '' }));
                            } else {
                              setCollectionModalData(prev => ({ ...prev, collectorName: e.target.value }));
                            }
                          }}
                          placeholder="Select staff..."
                          searchable
                          buttonStyle={{ height: 38, fontSize: '0.8rem' }}
                          options={[
                            ...employees.map(emp => ({ value: emp.name, label: emp.name })),
                            { value: '__MANUAL__', label: '+ Enter name manually...' }
                          ]}
                        />
                      )}
                    </div>
                  </div>

                  {/* Non-Cash Settlement Bank & Reference No */}
                  {(collectionModalData.paymentMode !== 'CASH') && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#334155', marginBottom: 4, display: 'block' }}>
                          Receiving Bank Account *
                        </label>
                        <SharedDropdown
                          value={collectionModalData.bankAccountId ? String(collectionModalData.bankAccountId) : (bankAccounts[0]?.id ? String(bankAccounts[0].id) : '')}
                          onChange={(e) => setCollectionModalData(prev => ({ ...prev, bankAccountId: e.target.value }))}
                          options={bankAccounts.map(b => ({
                            value: String(b.id),
                            label: `${b.bank_name} (${b.account_number ? '...' + String(b.account_number).slice(-4) : b.account_name})`
                          }))}
                          buttonStyle={{ height: 36, fontSize: '0.8rem', borderRadius: 8 }}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#334155', marginBottom: 4, display: 'block' }}>
                          {collectionModalData.paymentMode === 'UPI' ? 'UPI UTR / Ref No *' : collectionModalData.paymentMode === 'CHEQUE' ? 'Cheque No *' : 'Bank Reference No *'}
                        </label>
                        <input
                          type="text"
                          value={collectionModalData.referenceNo || ''}
                          onChange={(e) => setCollectionModalData(prev => ({ ...prev, referenceNo: e.target.value }))}
                          placeholder={collectionModalData.paymentMode === 'UPI' ? 'e.g. 423489123891' : collectionModalData.paymentMode === 'CHEQUE' ? 'e.g. Cheque #491021' : 'e.g. UTR / Ref #'}
                          className="input-control"
                          style={{ height: 36, fontSize: '0.8rem', borderRadius: 8 }}
                          required={collectionModalData.paymentMode !== 'CASH'}
                        />
                      </div>
                    </div>
                  )}

                  {/* Remarks / Notes */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#334155', marginBottom: 4, display: 'block' }}>
                      Notes / Remarks
                    </label>
                    <input
                      type="text"
                      value={collectionModalData.notes || ''}
                      onChange={(e) => setCollectionModalData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Optional notes regarding this collection..."
                      className="input-control"
                      style={{ height: 36, fontSize: '0.8rem', borderRadius: 8 }}
                    />
                  </div>

                  {/* Live Real-time Allocation Box */}
                  {numAmount > 0 && liveAlloc && (
                    <div style={{
                      background: '#F8FAFC', border: '1px solid #CBD5E1',
                      borderRadius: 10, padding: '12px 16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      flexWrap: 'wrap', gap: 12, fontSize: '0.78rem'
                    }}>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>Principal Covered</span>
                        <strong style={{ color: '#0F172A', fontSize: '0.88rem' }}>₹{fmt(liveAlloc.principalPortion)}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>Interest Covered</span>
                        <strong style={{ color: '#0E7490', fontSize: '0.88rem' }}>₹{fmt(liveAlloc.interestPortion)}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>New Outstanding Balance</span>
                        <strong style={{ color: liveAlloc.newPendingPrincipal > 0 ? 'var(--color-danger, #DC2626)' : 'var(--brand-primary, #15803D)', fontSize: '0.88rem' }}>
                          ₹{fmt(liveAlloc.newPendingPrincipal)}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="saas-modal-footer" style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', padding: '14px 22px' }}>
                  <button type="button" onClick={() => setCollectionModalData(null)} className="btn-cancel" disabled={posting} style={{ borderRadius: 8 }}>
                    {t('btn.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={posting || numAmount <= 0}
                    className="btn-submit"
                    style={{
                      background: 'var(--brand-primary, #15803D)',
                      boxShadow: '0 2px 6px rgba(var(--brand-primary-rgb), 0.3)',
                      borderRadius: 8,
                      padding: '9px 20px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      opacity: posting ? 0.7 : 1,
                      cursor: posting ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {posting ? 'Processing Payment...' : isEdit ? 'Update Collection' : `Confirm & Record Collection (₹${fmt(numAmount)})`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

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
              width: 56, height: 56, borderRadius: '50%', background: 'var(--brand-primary-light, #F0FEF5)',
              border: '2px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)', display: 'flex',
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
                <div className="head-icon-badge" style={{ background: 'var(--color-danger-light, #FEF2F2)', color: 'var(--color-danger, #DC2626)' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FECACA)', borderRadius: 9, padding: '9px 12px', fontSize: '0.76rem', color: 'var(--color-danger-text, #991B1B)' }}>
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
                style={{ background: 'var(--color-danger, #DC2626)', boxShadow: '0 2px 6px rgba(var(--color-danger-rgb), 0.3)', opacity: revertBusy ? 0.7 : 1, cursor: revertBusy ? 'not-allowed' : 'pointer' }}
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
                <div className="head-icon-badge" style={{ background: 'var(--color-danger-light, #FEF2F2)', color: 'var(--color-danger, #DC2626)' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FECACA)', borderRadius: 9, padding: '9px 12px', fontSize: '0.76rem', color: 'var(--color-danger-text, #991B1B)' }}>
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
              <button type="button" disabled={bounceBusy} onClick={() => { setBounceTarget(null); setBounceError(''); }} className="btn-cancel">{t('btn.cancel')}</button>
              <button
                type="button"
                disabled={bounceBusy}
                onClick={confirmBounce}
                className="btn-submit"
                style={{ background: 'var(--color-danger, #DC2626)', boxShadow: '0 2px 6px rgba(var(--color-danger-rgb), 0.3)', opacity: bounceBusy ? 0.6 : 1, cursor: bounceBusy ? 'not-allowed' : 'pointer' }}
              >
                {bounceBusy ? 'Processing…' : t('coll.mark_bounced')}
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
            @keyframes collRevertPulse { 0% { box-shadow: 0 0 0 0 rgba(var(--color-danger-rgb), 0.4); } 70% { box-shadow: 0 0 0 24px rgba(var(--color-danger-rgb), 0); } 100% { box-shadow: 0 0 0 0 rgba(var(--color-danger-rgb), 0); } }
          `}</style>
          <div style={{ background: '#FFFFFF', borderRadius: 22, padding: '32px 44px', textAlign: 'center', animation: 'collRevertPop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-danger, #DC2626)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto', animation: 'collRevertPulse 1.6s infinite' }}>
              <Undo2 style={{ width: 32, height: 32, strokeWidth: 2.5 }} />
            </div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>{t('coll.reverted_badge')}</h3>
            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>{t('coll.revert_confirm_desc')}</span>
          </div>
        </div>
      )}

      {/* ── Reject Waiver Modal ───────────────────────────────── */}
      {rejectTarget && (
        <div className="saas-modal-backdrop" style={{ zIndex: 1000000 }}>
          <div className="saas-modal-card" style={{ maxWidth: 440 }}>
            <div className="saas-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--color-danger-light, #FEF2F2)', color: 'var(--color-danger, #DC2626)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <XCircle style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#0F172A' }}>
                    Reject Interest Waiver
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                    Voucher: {rejectTarget.voucher_no || rejectTarget.id} · Concession: ₹{fmt(rejectTarget.interest_waiver)}
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => { setRejectTarget(null); setRejectionReason(''); }} className="modal-close-btn">
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div className="saas-modal-body" style={{ padding: '16px 20px' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.78rem', color: '#475569', lineHeight: 1.45 }}>
                Rejecting this waiver will move the <strong>₹{fmt(rejectTarget.interest_waiver)}</strong> concession back into the borrower&apos;s pending interest arrears on loan <strong>{rejectTarget.loan_account_no}</strong>.
              </p>
              <div className="form-group">
                <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#334155', marginBottom: 4, display: 'block' }}>
                  Reason for Rejection *
                </label>
                <textarea
                  rows={2}
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  className="input-control"
                  style={{ height: 'auto', padding: '10px 12px', fontSize: '0.8rem' }}
                  placeholder="e.g. Concession not approved for overdue account..."
                />
              </div>
            </div>
            <div className="saas-modal-footer">
              <button
                type="button"
                disabled={waiverBusy}
                onClick={() => { setRejectTarget(null); setRejectionReason(''); }}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={waiverBusy}
                onClick={handleConfirmRejectWaiver}
                className="btn-submit"
                style={{ background: 'var(--color-danger, #DC2626)', opacity: waiverBusy ? 0.6 : 1 }}
              >
                {waiverBusy ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Waiver Detail & Authorization Modal ─────────────────── */}
      {selectedWaiverForDetail && (() => {
        const c = selectedWaiverForDetail;
        const isPending = c.waiver_status === 'PENDING_APPROVAL' || (!c.waiver_status && Number(c.interest_waiver || 0) > 0);
        const isApproved = c.waiver_status === 'APPROVED';
        const isRejected = c.waiver_status === 'REJECTED';
        const linkedBorrower = getLinkedBorrower(c);
        const amount = parseFloat(c.amount) || 0;
        const interestPortion = Number(c.interest_paid ?? c.interest_portion ?? c.interestPaid ?? 0);
        const principalPortion = Number(c.principal_paid ?? c.principal_portion ?? c.principalPaid ?? (amount - interestPortion));
        const waiverAmount = Number(c.interest_waiver || 0);

        return (
          <div className="saas-modal-backdrop" style={{ zIndex: 1000000 }}>
            <div className="saas-modal-card" style={{ maxWidth: 520, width: '95vw' }}>
              {/* Modal Header */}
              <div className="saas-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: isPending ? '#FFFBEB' : isApproved ? '#F0FDF4' : '#FEF2F2',
                    color: isPending ? '#B45309' : isApproved ? '#15803D' : '#DC2626',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${isPending ? '#FDE68A' : isApproved ? '#BBF7D0' : '#FECACA'}`
                  }}>
                    <ShieldCheck style={{ width: 20, height: 20 }} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
                      Waiver Authorization Review
                    </h3>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      Voucher: <strong style={{ color: 'var(--brand-primary, #15803D)', fontFamily: 'monospace' }}>{c.voucher_no || `REC-${c.id}`}</strong> · {formatDateDDMMYYYY(c.collection_date)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    padding: '3px 9px',
                    borderRadius: 6,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: isPending ? '#FFFBEB' : isApproved ? '#F0FDF4' : '#FEF2F2',
                    color: isPending ? '#B45309' : isApproved ? '#15803D' : '#DC2626',
                    border: `1px solid ${isPending ? '#FDE68A' : isApproved ? '#BBF7D0' : '#FECACA'}`
                  }}>
                    {isPending ? 'Pending' : isApproved ? 'Approved' : 'Rejected'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedWaiverForDetail(null)}
                    className="modal-close-btn"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#64748B' }}
                  >
                    <X style={{ width: 18, height: 18 }} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="saas-modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 'calc(85vh - 140px)', overflowY: 'auto' }}>
                {/* Customer & Loan Box */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, fontSize: '0.76rem' }}>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>Customer Name</span>
                      <strong style={{ color: '#0F172A', fontSize: '0.84rem' }}>{c.borrower_name}</strong>
                      <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{c.phone || linkedBorrower.phone || '—'}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>Loan Account No</span>
                      <strong style={{ color: 'var(--brand-primary, #15803D)', fontSize: '0.84rem' }}>{c.loan_account_no}</strong>
                      <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{c.branch || 'Main Branch'}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>Recorded By</span>
                      <strong style={{ color: '#334155' }}>{c.collector_name || 'Staff'}</strong>
                      <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Mode: {c.payment_mode || 'CASH'}</div>
                    </div>
                  </div>
                </div>

                {/* Financial Concession Breakdown Banner */}
                <div style={{
                  background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFEFF 100%)',
                  border: '1px solid #A7F3D0',
                  borderRadius: 10,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#065F46', fontWeight: 600, display: 'block' }}>
                      Requested Interest Concession / Discount
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#047857' }}>
                      Interest shortfall to be waived upon authorization
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>
                      ₹{fmt(waiverAmount)}
                    </span>
                  </div>
                </div>

                {/* Detailed Numbers Breakdown */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 10,
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  padding: '12px 14px',
                  textAlign: 'center'
                }}>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>Total Paid</span>
                    <strong style={{ color: 'var(--brand-primary, #15803D)', fontSize: '0.92rem' }}>₹{fmt(amount)}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>Principal Paid</span>
                    <strong style={{ color: '#334155', fontSize: '0.92rem' }}>₹{fmt(principalPortion)}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.68rem' }}>Interest Paid</span>
                    <strong style={{ color: '#0E7490', fontSize: '0.92rem' }}>₹{fmt(interestPortion)}</strong>
                  </div>
                </div>

                {/* Period & Settlement Details */}
                {c.interest_from_date && (
                  <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 8, padding: '10px 14px', fontSize: '0.76rem', color: '#3730A3' }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>Interest Period Settlement:</div>
                    <div>
                      {c.interest_from_date} → {c.interest_paid_upto} {c.interest_days ? `(${c.interest_days} days)` : ''}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#4338CA', marginTop: 4 }}>
                      • <strong>If Approved:</strong> Period marked fully settled up to {c.interest_paid_upto} with ₹{fmt(waiverAmount)} discount.<br />
                      • <strong>If Rejected:</strong> ₹{fmt(waiverAmount)} shortfall remains in pending interest arrears.
                    </div>
                  </div>
                )}

                {/* Audit notes if already processed */}
                {isApproved && (
                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '10px 14px', fontSize: '0.76rem', color: '#166534' }}>
                    <strong>Approval Audit:</strong> Authorized by <strong>{c.waiver_approved_by || 'Manager'}</strong>.
                  </div>
                )}
                {isRejected && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: '0.76rem', color: '#991B1B' }}>
                    <strong>Rejection Reason:</strong> {c.waiver_rejection_reason || 'Rejected by supervisor'}.
                  </div>
                )}
              </div>

              {/* Modal Footer with Actions */}
              <div className="saas-modal-footer" style={{ padding: '14px 20px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedWaiverForDetail;
                    setSelectedWaiverForDetail(null);
                    setPrintThermalReceipt(target);
                  }}
                  className="btn-cancel"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Printer style={{ width: 14, height: 14 }} />
                  <span>Thermal Receipt</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isPending && canControl ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const target = selectedWaiverForDetail;
                          setSelectedWaiverForDetail(null);
                          setRejectTarget(target);
                        }}
                        disabled={waiverBusy}
                        style={{
                          background: '#FFFFFF',
                          color: 'var(--color-danger, #DC2626)',
                          border: '1px solid var(--color-danger-border, #FECACA)',
                          borderRadius: 8,
                          padding: '8px 16px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <X style={{ width: 14, height: 14, strokeWidth: 3 }} />
                        <span>Reject Concession</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          const target = selectedWaiverForDetail;
                          setSelectedWaiverForDetail(null);
                          await handleApproveWaiverClick(target);
                        }}
                        disabled={waiverBusy}
                        style={{
                          background: 'var(--brand-primary, #15803D)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: 8,
                          padding: '8px 18px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          boxShadow: '0 2px 4px rgba(21, 128, 61, 0.25)'
                        }}
                      >
                        <Check style={{ width: 15, height: 15, strokeWidth: 3 }} />
                        <span>Approve Waiver (₹{fmt(waiverAmount)})</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedWaiverForDetail(null)}
                      className="btn-submit"
                      style={{ background: 'var(--brand-primary, #15803D)' }}
                    >
                      Done
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
