import React, { useState, useEffect } from 'react';
import PrintablePaymentHistorySheet from './PrintablePaymentHistorySheet';
import LoanDetailPage from './LoanDetailPage';
import CustomerProfileModal from '../borrowers/CustomerProfileModal';
import {
  Banknote,
  Archive,
  Search,
  CheckCircle2,
  Eye,
  DollarSign,
  ShieldCheck,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  History,
  X
} from 'lucide-react';
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

// Underline-style status tabs — plain text with a colored bottom border on
// the active tab, matching Investor Capital / Fixed Deposits / Collections.
function StatusTabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderBottom: '1px solid #E2E8F0' }}>
      {tabs.map(tab => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 4px', marginBottom: -1,
              border: 'none', borderBottom: isActive ? '2px solid #059669' : '2px solid transparent',
              background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: '0.8rem', fontWeight: isActive ? 700 : 500,
              color: isActive ? '#059669' : '#64748B', marginRight: 18
            }}
          >
            <span>{tab.label}</span>
            <span style={{
              fontSize: '0.68rem', fontWeight: 700, borderRadius: 999, padding: '1px 7px',
              background: isActive ? '#ECFDF5' : '#F1F5F9',
              color: isActive ? '#059669' : '#94A3B8'
            }}>{tab.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function ActionPill({ icon, label, onClick, tone = 'neutral' }) {
  const tones = {
    neutral: { bg: '#FFFFFF', border: '#E2E8F0', color: '#334155' },
    good: { bg: '#ECFDF5', border: '#A7F3D0', color: '#059669' }
  };
  const c = tones[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
        border: `1px solid ${c.border}`, background: c.bg, color: c.color,
        borderRadius: 6, padding: '4px 9px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer'
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function statusBadgeCls(status) {
  if (status === 'ACTIVE' || status === 'APPROVED') return 'fin-badge fin-badge--ok';
  if (status === 'OVERDUE') return 'fin-badge fin-badge--warn';
  return 'fin-badge';
}

// Loan Register: active + closed accounts, plus closure-approval requests.
// Loan applications (creation + approve/reject) live on their own dedicated
// page now — an approved & disbursed application shows up here as an
// ordinary ACTIVE account, not before.
export default function LoansView({
  loans = [],
  borrowers = [],
  loanSchemes = [],
  receipts = [],
  activeTab = 'loan-management',
  onApproveLoanClosure,
  onRejectLoanClosure
}) {
  const { t, tStatus } = useLanguage();
  // Primary Account View Mode: 'ACTIVE' | 'CLOSED' | 'CLOSURE_REQUESTS'
  const [viewMode, setViewMode] = useState(() => (activeTab.includes('closed-loans') ? 'CLOSED' : 'ACTIVE'));

  useEffect(() => {
    setViewMode(activeTab.includes('closed-loans') ? 'CLOSED' : 'ACTIVE');
  }, [activeTab]);

  // Closure Requests: loans fully paid off, awaiting Admin's review before CLOSED.
  const [expandedClosureId, setExpandedClosureId] = useState(null);
  const [closureRejectTarget, setClosureRejectTarget] = useState(null);
  const [closureRejectReason, setClosureRejectReason] = useState('');
  const closureRequestsList = loans.filter(l => l.status === 'PENDING_CLOSURE');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, DUE_TODAY, OVERDUE
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Selected Loan for Payment History Statement Modal
  const [historyLoan, setHistoryLoan] = useState(null);

  // Selected Borrower for Customer Profile Modal
  const [selectedCustomerForProfile, setSelectedCustomerForProfile] = useState(null);

  // Full-screen Loan Detail Page (customer + loan + payment history + chart)
  const [viewingLoan, setViewingLoan] = useState(null);

  const schemeName = (schemeId) => loanSchemes.find(s => s.id === schemeId)?.name || 'Standard Scheme';
  const linkedBorrower = (loan) => borrowers.find(b => b.id === loan.borrower_id || b.phone === loan.phone) || null;

  const isClosedTab = viewMode === 'CLOSED';

  // Counts for top view tabs
  const activeLoansCount = loans.filter(l => l.status === 'ACTIVE' || l.status === 'OVERDUE' || l.status === 'APPROVED').length;
  const closedLoansCount = loans.filter(l => l.status === 'CLOSED').length;

  // Filter loans for current viewMode
  const displayList = loans.filter(l => {
    const matchesTab = isClosedTab
      ? l.status === 'CLOSED'
      : (l.status === 'ACTIVE' || l.status === 'OVERDUE' || l.status === 'APPROVED');

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      (l.borrower_name && l.borrower_name.toLowerCase().includes(q)) ||
      (l.loan_account_no && l.loan_account_no.toLowerCase().includes(q)) ||
      (l.phone && l.phone.includes(q))
    );

    let matchesStatus = true;
    if (statusFilter === 'DUE_TODAY') matchesStatus = (l.installment_amount || 0) > 0;
    if (statusFilter === 'OVERDUE') matchesStatus = l.status === 'OVERDUE';

    return matchesTab && matchesSearch && matchesStatus;
  });

  // Calculate Pagination
  const totalPages = Math.ceil(displayList.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedList = displayList.slice(startIndex, startIndex + pageSize);

  // Calculate Metrics
  const totalPrincipal = displayList.reduce((acc, l) => acc + (parseFloat(l.principal_amount) || 0), 0);
  const totalCollected = displayList.reduce((acc, l) => acc + (parseFloat(l.collected_amount) || 0), 0);
  const totalOutstanding = displayList.reduce((acc, l) => acc + (parseFloat(l.pending_amount) || 0), 0);
  const overdueCount = loans.filter(l => l.status === 'OVERDUE').length;

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  if (viewingLoan) {
    return (
      <LoanDetailPage
        loan={viewingLoan}
        borrower={linkedBorrower(viewingLoan)}
        receipts={receipts}
        onBack={() => setViewingLoan(null)}
      />
    );
  }

  const TABS = [
    { id: 'ACTIVE', label: t('loans.tab_active'), count: activeLoansCount },
    { id: 'CLOSED', label: t('loans.tab_closed'), count: closedLoansCount },
    ...(closureRequestsList.length > 0 ? [{ id: 'CLOSURE_REQUESTS', label: t('loans.closure_requests_tab'), count: closureRequestsList.length }] : [])
  ];

  return (
    <div className="fin-page">
      <div className="fin-header-card">
        <div className="fin-page-header">
          <div className="fin-page-header__left">
            <div className="fin-page-header__icon" style={{ background: isClosedTab ? '#F1F5F9' : '#ECFDF5', border: `1px solid ${isClosedTab ? '#CBD5E1' : '#A7F3D0'}`, color: isClosedTab ? '#475569' : '#059669' }}>
              {isClosedTab ? <Archive style={{ width: 18, height: 18 }} /> : <Banknote style={{ width: 18, height: 18 }} />}
            </div>
            <div>
              <h1 className="fin-page-header__title">{isClosedTab ? t('loans.closed_title') : t('loans.active_title')}</h1>
              <p className="fin-page-header__subtitle">{isClosedTab ? t('loans.closed_subtitle') : t('loans.active_subtitle')}</p>
            </div>
          </div>
        </div>

        <div className="fin-header-stats">
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{isClosedTab ? t('loans.total_settled') : t('loans.total_disbursed')}</span>
            <span className="fin-header-stat__value">{isClosedTab ? displayList.length : `₹${fmt(totalPrincipal)}`}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('loans.total_collected_label')}</span>
            <span className="fin-header-stat__value fin-header-stat__value--good">₹{fmt(totalCollected)}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('loans.outstanding_balance_label')}</span>
            <span className="fin-header-stat__value">₹{fmt(totalOutstanding)}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">{t('loans.overdue_exposure_label')}</span>
            <span className="fin-header-stat__value" style={{ color: overdueCount > 0 ? '#DC2626' : undefined }}>{overdueCount}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <StatusTabs tabs={TABS} active={viewMode} onChange={(id) => { setViewMode(id); setCurrentPage(1); }} />

        {viewMode !== 'CLOSURE_REQUESTS' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative', width: 220 }}>
              <Search style={{ position: 'absolute', left: 9, top: 8, width: 13, height: 13, color: '#94A3B8' }} />
              <input
                style={{ paddingLeft: 27, width: '100%', height: 32, borderRadius: 7, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.75rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                type="text"
                placeholder={t('loans.search_active')}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>
            {!isClosedTab && (
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                style={{
                  height: 32, padding: '0 8px', borderRadius: 7, border: '1px solid #CBD5E1',
                  background: '#FFFFFF', fontSize: '0.75rem', fontWeight: 600, color: '#0F172A',
                  fontFamily: 'inherit', cursor: 'pointer', width: 165, flexShrink: 0
                }}
              >
                <option value="ALL">{t('loans.filter_all_accounts')} ({activeLoansCount})</option>
                <option value="DUE_TODAY">{t('loans.filter_due_today')}</option>
                <option value="OVERDUE">{t('loans.filter_overdue')} ({overdueCount})</option>
              </select>
            )}
          </div>
        )}
      </div>

      {/* ── Closure Requests: fully-paid loans awaiting Admin approval ──── */}
      {viewMode === 'CLOSURE_REQUESTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {closureRequestsList.length === 0 ? (
            <div className="fin-empty-state">{t('loans.no_closure_requests')}</div>
          ) : (
            closureRequestsList.map(loan => {
              const snapshot = loan.closure_snapshot || {};
              const history = snapshot.payment_history || [];
              const isExpanded = expandedClosureId === loan.id;
              return (
                <div key={loan.id} className="fin-tablewrap" style={{ padding: 20, overflow: 'visible' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className="code" style={{ color: '#059669', fontWeight: 600, fontSize: '0.9rem' }}>{loan.loan_account_no}</span>
                        <span className="fin-badge" style={{ background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' }}>{t('loans.pending_closure_badge')}</span>
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: '#0F172A' }}>{loan.borrower_name}</div>
                      <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: 2 }}>
                        {t('loans.requested_by_prefix')} {loan.closure_requested_by || 'Collector'} {t('loans.requested_on_prefix')} {loan.closure_requested_at}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 24 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{t('loans.principal_sanctioned')}</div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0F172A' }}>₹{fmt(snapshot.principal_amount ?? loan.principal_amount)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{t('loans.total_collected_label')}</div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#059669' }}>₹{fmt(snapshot.total_collected ?? loan.collected_amount)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{t('loans.payments_label')}</div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0F172A' }}>{snapshot.total_payments ?? history.length}</div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedClosureId(isExpanded ? null : loan.id)}
                    style={{ background: 'none', border: 'none', color: '#059669', fontSize: '0.76rem', fontWeight: 500, cursor: 'pointer', padding: '10px 0 0 0', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <History style={{ width: 13, height: 13 }} />
                    {isExpanded ? t('loans.hide_payment_history') : t('loans.view_payment_history')} ({history.length})
                  </button>

                  {isExpanded && (
                    <div style={{ marginTop: 10, overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 10 }}>
                      <table className="fin-grid-table">
                        <thead>
                          <tr>
                            <th>{t('col.date')}</th>
                            <th>{t('col.receipt_no')}</th>
                            <th className="num">{t('col.amount')}</th>
                            <th className="num">{t('col.principal')}</th>
                            <th className="num">{t('col.interest')}</th>
                            <th>{t('col.mode')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map(rec => (
                            <tr key={rec.id}>
                              <td>{rec.collection_date}</td>
                              <td className="code">{rec.receipt_no}</td>
                              <td className="num" style={{ fontWeight: 600 }}>₹{fmt(rec.amount)}</td>
                              <td className="num">₹{fmt(rec.principalPaid)}</td>
                              <td className="num">₹{fmt(rec.interestPaid)}</td>
                              <td>{rec.payment_mode}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14, paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
                    <ActionPill icon={<X style={{ width: 12, height: 12 }} />} label={t('loans.reject_btn')} onClick={() => setClosureRejectTarget(loan)} />
                    <button
                      type="button"
                      onClick={() => onApproveLoanClosure?.(loan.id)}
                      className="fin-btn-primary"
                      style={{ padding: '8px 20px' }}
                    >
                      <CheckCircle2 style={{ width: 14, height: 14 }} />
                      <span>{t('loans.approve_close_btn')}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Reject Closure Reason Modal */}
      {closureRejectTarget && (
        <div className="saas-modal-backdrop">
          <div className="saas-modal-card" style={{ maxWidth: 400 }}>
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                  <X style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3>{t('loans.reject_closure_title')}</h3>
                  <p>{closureRejectTarget.loan_account_no} {t('loans.reject_closure_desc')}</p>
                </div>
              </div>
              <button onClick={() => { setClosureRejectTarget(null); setClosureRejectReason(''); }} className="close-btn" type="button"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <div className="saas-modal-body">
              <div className="form-group">
                <label>{t('loans.reject_reason_label')}</label>
                <textarea
                  value={closureRejectReason}
                  onChange={(e) => setClosureRejectReason(e.target.value)}
                  placeholder={t('loans.reject_reason_placeholder')}
                  rows={3}
                  className="input-control"
                  style={{ height: 'auto', padding: '10px 12px' }}
                />
              </div>
            </div>
            <div className="saas-modal-footer">
              <button type="button" onClick={() => { setClosureRejectTarget(null); setClosureRejectReason(''); }} className="btn-cancel">{t('btn.cancel')}</button>
              <button
                type="button"
                onClick={() => { onRejectLoanClosure?.(closureRejectTarget.id, closureRejectReason); setClosureRejectTarget(null); setClosureRejectReason(''); }}
                className="btn-submit"
                style={{ background: '#DC2626' }}
              >
                {t('loans.reject_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Master Data Table ─────────────────────────────────────── */}
      {viewMode !== 'CLOSURE_REQUESTS' && (
        <div className="fin-tablewrap">
          <table className="fin-grid-table">
            <thead>
              <tr>
                <th style={{ width: 50, textAlign: 'center' }}>{t('col.sno')}</th>
                <th>{t('col.customer_name')}</th>
                <th>{t('col.loan_account')}</th>
                <th>{t('col.scheme')}</th>
                <th className="num">{t('col.principal_rs')}</th>
                <th className="num">{t('col.daily_emi_rs')}</th>
                <th className="num">{t('col.collected_rs')}</th>
                <th className="num">{t('col.outstanding_rs')}</th>
                <th style={{ textAlign: 'center' }}>{t('col.status')}</th>
                <th style={{ textAlign: 'right' }}>{t('col.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
                    {t('loans.no_accounts_match')}
                  </td>
                </tr>
              ) : (
                paginatedList.map((loan, idx) => {
                  const borrower = linkedBorrower(loan);
                  return (
                    <tr key={loan.id}>
                      <td style={{ textAlign: 'center', color: '#94A3B8' }}>{startIndex + idx + 1}</td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={loan.borrower_name} photo={borrower?.profile_image || loan.profile_image} />
                          <div style={{ minWidth: 0 }}>
                            <div
                              onClick={() => {
                                const b = borrower || {
                                  id: loan.borrower_id || loan.id,
                                  full_name: loan.borrower_name,
                                  phone: loan.phone,
                                  aadhaar_number: loan.aadhaar,
                                  pan_number: loan.pan,
                                  branch: loan.branch,
                                  borrower_code: loan.borrower_code || 'KTG-CUST',
                                  kyc_status: 'VERIFIED'
                                };
                                setSelectedCustomerForProfile(b);
                              }}
                              title="Click to view full customer details"
                              style={{ color: '#0F172A', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = '#059669'; e.currentTarget.style.textDecoration = 'underline'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = '#0F172A'; e.currentTarget.style.textDecoration = 'none'; }}
                            >
                              {loan.borrower_name}
                            </div>
                            {loan.phone && <div style={{ color: '#94A3B8', fontSize: '0.7rem' }}>{loan.phone}</div>}
                          </div>
                        </div>
                      </td>

                      <td className="code">
                        <span
                          onClick={() => setViewingLoan(loan)}
                          title="Click to view full Loan Details"
                          style={{ color: isClosedTab ? '#475569' : '#059669', cursor: 'pointer', fontWeight: 600 }}
                        >
                          {loan.loan_account_no}
                        </span>
                      </td>

                      <td style={{ color: '#334155', fontSize: '0.78rem' }}>{schemeName(loan.scheme_id)}</td>
                      <td className="num" style={{ fontWeight: 600 }}>₹{fmt(loan.principal_amount)}</td>
                      <td className="num" style={{ color: '#047857', fontWeight: 600 }}>₹{fmt(loan.installment_amount || 500)}</td>
                      <td className="num" style={{ color: '#059669' }}>₹{fmt(loan.collected_amount)}</td>
                      <td className="num" style={{ color: loan.pending_amount > 0 ? '#DC2626' : '#059669' }}>₹{fmt(loan.pending_amount)}</td>

                      <td style={{ textAlign: 'center' }}>
                        <span className={statusBadgeCls(loan.status)}>{tStatus(loan.status)}</span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <ActionPill icon={<Eye style={{ width: 11, height: 11 }} />} label={t('loans.view_pill')} onClick={() => setViewingLoan(loan)} />
                          <ActionPill icon={<History style={{ width: 11, height: 11 }} />} label={t('loans.history_pill')} onClick={() => setHistoryLoan(loan)} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Table Pagination Footer */}
          <div className="table-pagination">
            <div className="table-pagination__info">
              Showing <strong>{displayList.length === 0 ? 0 : startIndex + 1}</strong> to <strong>{Math.min(startIndex + pageSize, displayList.length)}</strong> of <strong>{displayList.length}</strong> entries
            </div>
            <div className="table-pagination__controls">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>
                <ChevronLeft style={{ width: 14, height: 14 }} />
                <span>Previous</span>
              </button>
              <span className="page-indicator">Page {safePage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                <span>Next</span>
                <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Printable Payment Collection History Statement Sheet ────────── */}
      {historyLoan && (
        <PrintablePaymentHistorySheet
          loan={historyLoan}
          borrower={linkedBorrower(historyLoan)}
          receipts={receipts}
          onClose={() => setHistoryLoan(null)}
        />
      )}

      {/* ── Customer Profile Modal ────────── */}
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
