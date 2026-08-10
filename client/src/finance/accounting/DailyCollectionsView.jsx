import React, { useState } from 'react';
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
  StickyNote
} from 'lucide-react';
import CustomerProfileModal from '../borrowers/CustomerProfileModal';
import ThermalVoucherModal from '../../components/ThermalVoucherModal';
import NewCollectionEntryPage from './NewCollectionEntryPage';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

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

const PAYMENT_MODES = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'];

export default function DailyCollectionsView({
  collections = [],
  loans = [],
  borrowers = [],
  loanSchemes = [],
  user,
  tenant,
  onRecordCollection,
  onQuickAction,
  onRevertCollection,
  onUpdateCollection,
  onMarkChequeCleared,
  onMarkChequeBounced
}) {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState('REGISTER'); // 'REGISTER' | 'ENTRY_PAGE'
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState('ALL');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedCustomerForProfile, setSelectedCustomerForProfile] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [revertTarget, setRevertTarget] = useState(null);
  const [revertReason, setRevertReason] = useState('');
  const [revertError, setRevertError] = useState('');
  const [revertBusy, setRevertBusy] = useState(false);
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

  // Render Full Collection Entry Page
  if (viewMode === 'ENTRY_PAGE') {
    return (
      <NewCollectionEntryPage
        loans={loans}
        borrowers={borrowers}
        collections={collections}
        loanSchemes={loanSchemes}
        onBack={() => setViewMode('REGISTER')}
        onRecordCollection={onRecordCollection}
      />
    );
  }

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

  const searchFiltered = collections.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    return !q || (
      (c.voucher_no && c.voucher_no.toLowerCase().includes(q)) ||
      (c.borrower_name && c.borrower_name.toLowerCase().includes(q)) ||
      (c.collector_name && c.collector_name.toLowerCase().includes(q)) ||
      (c.loan_account_no && c.loan_account_no.toLowerCase().includes(q))
    );
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

  // Calculate Pagination
  const totalPages = Math.ceil(filteredCollections.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedCollections = filteredCollections.slice(startIndex, startIndex + pageSize);

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

  // Revert can fail (e.g. a data inconsistency in the underlying journal) —
  // caught here so it surfaces as an inline error instead of an uncaught
  // exception during the next render, which previously blanked the screen.
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
      <div className="fin-header-card">
        <div className="fin-page-header">
          <div className="fin-page-header__left">
            <div className="fin-page-header__icon" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#059669' }}>
              <Receipt style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="fin-page-header__title">{t('coll.title')}</h1>
              <p className="fin-page-header__subtitle">{t('coll.subtitle')}</p>
            </div>
          </div>
          <button type="button" className="fin-btn-primary" onClick={() => setViewMode('ENTRY_PAGE')}>
            <Plus style={{ width: 14, height: 14 }} />
            <span>{t('coll.record_new')}</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative', width: 200 }}>
          <Search style={{ position: 'absolute', left: 9, top: 8, width: 13, height: 13, color: '#94A3B8' }} />
          <input
            style={{ paddingLeft: 27, width: '100%', height: 32, borderRadius: 7, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.75rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            type="text"
            placeholder={t('coll.search')}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>

        <select
          value={modeFilter}
          onChange={(e) => { setModeFilter(e.target.value); setCurrentPage(1); }}
          style={{
            height: 32, padding: '0 8px', borderRadius: 7, border: '1px solid #CBD5E1',
            background: '#FFFFFF', fontSize: '0.75rem', fontWeight: 600, color: '#0F172A',
            fontFamily: 'inherit', cursor: 'pointer', width: 175, flexShrink: 0
          }}
        >
          <option value="ALL">{t('coll.filter_all')} ({countAll})</option>
          <option value="CASH">{t('coll.filter_cash')} ({countCash})</option>
          <option value="UPI">{t('coll.filter_upi')} ({countUpi})</option>
          <option value="CHEQUE">{t('coll.filter_cheque')} ({countCheque})</option>
        </select>
      </div>

      {/* ── Master Receipts Data Table — allowed to scroll horizontally so
          every column keeps its own comfortable width and nothing is
          cramped or truncated. ─────────────────────────────────────── */}
      <style>{`
        .coll-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .coll-scroll::-webkit-scrollbar { display: none; }
      `}</style>
      <div className="fin-tablewrap" style={{ overflow: 'hidden', maxHeight: 'none' }}>
        <div className="coll-scroll" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 340px)' }}>
        <table className="fin-grid-table" style={{ width: '100%', minWidth: 1080 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'center' }}>{t('col.sno')}</th>
              <th>{t('col.customer')}</th>
              <th>{t('col.loan_acc')}</th>
              <th>{t('col.collector')}</th>
              <th className="num">{t('col.principal')}</th>
              <th className="num">{t('col.interest')}</th>
              <th className="num">{t('col.paid_rs')}</th>
              <th className="num">{t('col.balance')}</th>
              <th style={{ textAlign: 'center' }}>{t('col.mode')}</th>
              <th>{t('col.date_time')}</th>
              <th style={{ textAlign: 'right' }}>{t('col.action')}</th>
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
                const interestPortion = c.interest_portion !== undefined ? Number(c.interest_portion) : Math.round(amount * 0.15);
                const principalPortion = c.principal_portion !== undefined ? Number(c.principal_portion) : (amount - interestPortion);
                const timestamp = c.collection_date || c.date || new Date().toISOString().slice(0, 10);
                const timeStr = c.time || '10:30 AM';

                const matchedLoan = loans.find(l => String(l.id) === String(c.loan_id) || l.loan_account_no === c.loan_account_no) || null;
                const loanAccNo = c.loan_account_no || matchedLoan?.loan_account_no || `LN-2026-0${c.id || idx + 1}`;
                const remainingBal = c.new_principal_balance !== undefined ? Number(c.new_principal_balance) : (matchedLoan?.pending_amount || 0);
                const linkedBorrower = getLinkedBorrower(c);
                const rowStyle = c.reverted ? { opacity: 0.5 } : undefined;
                const textDecor = c.reverted ? { textDecoration: 'line-through' } : {};

                return (
                  <tr key={c.id || idx} style={rowStyle}>
                    <td style={{ textAlign: 'center', color: '#94A3B8' }}>{startIndex + idx + 1}</td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={c.borrower_name} photo={linkedBorrower.profile_image || linkedBorrower.photo} />
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

                    <td className="code">
                      <span
                        style={{ color: '#059669', fontWeight: 600, cursor: 'pointer', ...textDecor }}
                        onClick={() => setSelectedReceipt(c)}
                        title="Click to view Official Collection Voucher"
                      >
                        {loanAccNo}
                      </span>
                    </td>

                    <td style={{ color: '#475569', fontSize: '0.78rem', ...textDecor }}>
                      {c.collector_name || 'K. Ramesh'}
                    </td>

                    <td className="num" style={textDecor}>₹{fmt(principalPortion)}</td>
                    <td className="num" style={{ color: '#0E7490', ...textDecor }}>₹{fmt(interestPortion)}</td>
                    <td className="num" style={{ color: '#059669', fontWeight: 700, ...textDecor }}>₹{fmt(amount)}</td>
                    <td className="num" style={{ color: remainingBal > 0 ? '#DC2626' : '#059669' }}>₹{fmt(remainingBal)}</td>

                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
                        <span className="fin-badge" style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: c.payment_mode === 'CASH' ? '#ECFDF5' : '#F0FDFA',
                          color: c.payment_mode === 'CASH' ? '#047857' : '#0E7490',
                          border: `1px solid ${c.payment_mode === 'CASH' ? '#A7F3D0' : '#99F6E4'}`
                        }}>
                          {modeIcon(c.payment_mode)}
                          {c.payment_mode || 'CASH'}
                        </span>
                        {c.reverted && (
                          <span className="fin-badge fin-badge--warn" style={{ fontSize: '0.6rem' }}>{t('coll.reverted_badge')}</span>
                        )}
                        {!c.reverted && c.clearance_status === 'PENDING_CLEARANCE' && (
                          <span className="fin-badge" style={{ fontSize: '0.6rem', background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' }}>{t('coll.pending_clearance_badge')}</span>
                        )}
                        {!c.reverted && c.clearance_status === 'BOUNCED' && (
                          <span className="fin-badge fin-badge--warn" style={{ fontSize: '0.6rem' }}>{t('coll.bounced_badge')}</span>
                        )}
                      </div>
                    </td>

                    <td style={{ fontSize: '0.74rem' }}>
                      {timestamp}<br /><span style={{ color: '#94A3B8' }}>{timeStr}</span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <ActionPill icon={<Eye style={{ width: 11, height: 11 }} />} label={t('coll.view_pill')} onClick={() => setSelectedReceipt(c)} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>

        {/* Table Pagination Footer */}
        <div className="table-pagination">
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

      {/* ── Official Collection Receipt — same 80mm thermal template used
          right after recording a new collection ─────────────────── */}
      {selectedReceipt && (() => {
        const linkedBorrower = getLinkedBorrower(selectedReceipt);
        const modalBtnStyle = (tone) => {
          const tones = {
            good: { bg: '#ECFDF5', border: '#A7F3D0', color: '#059669' },
            bad: { bg: '#FEF2F2', border: '#FECACA', color: '#DC2626' },
            neutral: { bg: '#FFFFFF', border: '#CBD5E1', color: '#334155' }
          };
          const c = tones[tone];
          return { border: `1px solid ${c.border}`, background: c.bg, color: c.color, padding: '8px 16px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 };
        };

        const statusButtons = [];
        if (!selectedReceipt.reverted && selectedReceipt.payment_mode === 'CHEQUE' && selectedReceipt.clearance_status === 'PENDING_CLEARANCE' && canControl) {
          statusButtons.push(
            <button key="clear" type="button" style={modalBtnStyle('good')} onClick={() => { onMarkChequeCleared(selectedReceipt.id); closeReceiptModal(); }}>
              <CheckCircle2 style={{ width: 14, height: 14 }} />
              <span>{t('coll.mark_cleared')}</span>
            </button>,
            <button key="bounce" type="button" style={modalBtnStyle('bad')} onClick={() => { setBounceTarget(selectedReceipt); setSelectedReceipt(null); }}>
              <XCircle style={{ width: 14, height: 14 }} />
              <span>{t('coll.mark_bounced')}</span>
            </button>
          );
        }
        if (!selectedReceipt.reverted && canControl) {
          statusButtons.push(
            <button key="edit" type="button" style={modalBtnStyle('neutral')} onClick={() => { openEdit(selectedReceipt); setSelectedReceipt(null); }}>
              <Pencil style={{ width: 14, height: 14 }} />
              <span>{t('coll.edit_collection')}</span>
            </button>,
            <button key="revert" type="button" style={modalBtnStyle('bad')} onClick={() => { setRevertTarget(selectedReceipt); setSelectedReceipt(null); }}>
              <Undo2 style={{ width: 14, height: 14 }} />
              <span>{t('coll.revert_collection')}</span>
            </button>
          );
        }

        const isVoid = selectedReceipt.reverted || selectedReceipt.clearance_status === 'BOUNCED';

        return (
          <ThermalVoucherModal
            company={tenant}
            receipt={{
              voucher_no: selectedReceipt.voucher_no,
              date: selectedReceipt.collection_date,
              loan_account_no: selectedReceipt.loan_account_no,
              branch: selectedReceipt.branch || linkedBorrower.branch,
              borrower_name: selectedReceipt.borrower_name,
              phone: linkedBorrower.phone,
              payment_mode: selectedReceipt.payment_mode,
              reference_no: selectedReceipt.reference_no,
              amount: selectedReceipt.amount,
              principal_paid: selectedReceipt.principalPaid,
              interest_paid: selectedReceipt.interestPaid,
              pending_balance: selectedReceipt.newPrincipalBalance ?? selectedReceipt.new_principal_balance,
              collector_name: selectedReceipt.collector_name
            }}
            voidInfo={isVoid ? {
              label: selectedReceipt.reverted ? t('coll.reverted_badge') : t('coll.bounced_badge'),
              reason: selectedReceipt.reverted ? selectedReceipt.revert_reason : selectedReceipt.bounce_reason,
              by: selectedReceipt.reverted ? selectedReceipt.reverted_by : selectedReceipt.bounced_by,
              at: selectedReceipt.reverted ? selectedReceipt.reverted_at : selectedReceipt.bounced_at
            } : null}
            proofImage={selectedReceipt.proof_image}
            location={selectedReceipt.latitude && selectedReceipt.longitude ? { lat: selectedReceipt.latitude, lng: selectedReceipt.longitude } : null}
            onViewProof={setPreviewImage}
            onClose={closeReceiptModal}
            extraActions={statusButtons.length > 0 ? statusButtons : null}
          />
        );
      })()}

      {/* ── Edit Collection — standard modal shell (saas-modal-header/body/
          footer), same field styling (form-group/input-control) as the New
          Collection Entry page. Fields are pre-filled straight from the
          collection record via openEdit(), and both close paths (header X
          and footer Cancel) route through closeEdit() so editTarget and
          editForm are always cleared together. ── */}
      {editTarget && editForm && (
        <div className="saas-modal-backdrop" style={{ zIndex: 1000000 }}>
          <div className="saas-modal-card" style={{ maxWidth: 520 }}>
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: '#ECFDF5', borderColor: '#A7F3D0', color: '#059669' }}>
                  <Pencil style={{ width: 16, height: 16 }} />
                </div>
                <div className="head-titles">
                  <h3>{t('coll.edit_collection')}</h3>
                  <p>{editTarget.voucher_no} — {editTarget.borrower_name}</p>
                </div>
              </div>
              <button onClick={closeEdit} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <form onSubmit={submitEdit}>
              <div className="saas-modal-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 16px' }}>
                  <Avatar name={editTarget.borrower_name} photo={getLinkedBorrower(editTarget).profile_image || getLinkedBorrower(editTarget).photo} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>{editTarget.borrower_name}</div>
                    <div className="code" style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{editTarget.loan_account_no || editTarget.voucher_no}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.62rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>{t('col.paid_rs')}</span>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#059669' }}>₹{fmt(editTarget.amount)}</span>
                  </div>
                </div>

                <div style={{ background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: 9, padding: '9px 12px', fontSize: '0.74rem', color: '#0F766E' }}>{t('coll.edit_hint')}</div>
                {editError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 9, padding: '9px 12px', fontSize: '0.76rem', color: '#991B1B' }}>
                    <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />
                    <span>{editError}</span>
                  </div>
                )}

                <div className="form-row form-row--3">
                  <div className="form-group">
                    <label>{t('col.mode')}</label>
                    <select value={editForm.payment_mode} onChange={e => setEditForm(f => ({ ...f, payment_mode: e.target.value }))} className="input-control">
                      {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>{t('col.date_time')}</label>
                    <input type="date" value={editForm.collection_date} onChange={e => setEditForm(f => ({ ...f, collection_date: e.target.value }))} className="input-control" />
                  </div>
                  <div className="form-group">
                    <label>{t('col.collector')}</label>
                    <input type="text" value={editForm.collector_name} onChange={e => setEditForm(f => ({ ...f, collector_name: e.target.value }))} className="input-control" placeholder="Collector name" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>{t('coll.reference_no_label')}</label>
                    <input type="text" value={editForm.reference_no} onChange={e => setEditForm(f => ({ ...f, reference_no: e.target.value }))} className="input-control mono" placeholder="Reference number" />
                  </div>
                  <div className="form-group">
                    <label>{t('fin.branch_label')}</label>
                    <input type="text" value={editForm.branch} onChange={e => setEditForm(f => ({ ...f, branch: e.target.value }))} className="input-control" placeholder="Branch" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><StickyNote style={{ width: 12, height: 12 }} />{t('col.notes')}</label>
                    <textarea rows={2} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className="input-control" style={{ height: 'auto', padding: '10px 12px' }} placeholder="Optional notes..." />
                  </div>
                </div>
              </div>
              <div className="saas-modal-footer">
                <button type="button" onClick={closeEdit} className="btn-cancel">{t('btn.cancel')}</button>
                <button type="submit" className="btn-submit" style={{ background: '#059669' }}>{t('form.save_changes')}</button>
              </div>
            </form>
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
