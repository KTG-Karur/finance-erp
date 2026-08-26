import React, { useState, useEffect } from 'react';
import NewLoanApplicationPage from './NewLoanApplicationPage';
import PrintableLoanApplicationSheet from './PrintableLoanApplicationSheet';
import CustomerProfileModal from '../borrowers/CustomerProfileModal';
import DisburseLoanModal from './DisburseLoanModal';
import {
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Plus,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Printer,
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
      background: 'var(--brand-primary-light, #F0FEF5)', color: 'var(--brand-primary, #15803D)', border: '1px solid var(--brand-primary-border, #A3F5C1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700
    }}>
      {getInitials(name) || '—'}
    </div>
  );
}

function StatusTabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F1F5F9', padding: '3px 4px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
      {tabs.map(tab => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
              border: 'none', borderRadius: 6,
              background: isActive ? '#FFFFFF' : 'transparent',
              boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
              cursor: 'pointer', fontFamily: 'inherit',
              fontSize: '0.78rem', fontWeight: isActive ? 700 : 500,
              color: isActive ? '#0F172A' : '#64748B', transition: 'all 0.15s ease'
            }}
          >
            <span>{tab.label}</span>
            <span style={{
              fontSize: '0.66rem', fontWeight: 700, borderRadius: 999, padding: '1px 6px',
              background: isActive ? (tab.id === 'PENDING' ? '#FEF3C7' : tab.id === 'APPROVED' ? 'var(--brand-primary-light, #F0FEF5)' : 'var(--color-danger-light, #FEF2F2)') : '#E2E8F0',
              color: isActive ? (tab.id === 'PENDING' ? 'var(--color-warning, #D97706)' : tab.id === 'APPROVED' ? 'var(--brand-primary, #15803D)' : 'var(--color-danger, #DC2626)') : '#64748B'
            }}>{tab.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function ActionPill({ icon, label, onClick, tone = 'neutral', disabled = false }) {
  const tones = {
    neutral: { bg: '#FFFFFF', border: '#E2E8F0', color: '#334155' },
    good: { bg: 'var(--brand-primary-light, #F0FEF5)', border: 'var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)' },
    bad: { bg: 'var(--color-danger-light, #FEF2F2)', border: 'var(--color-danger-border, #FECACA)', color: 'var(--color-danger, #DC2626)' },
    warn: { bg: 'var(--color-warning-light, #FFFBEB)', border: 'var(--color-warning-border, #FDE68A)', color: 'var(--color-warning-hover, #B45309)' }
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
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function appStatusBadgeCls(status) {
  if (status === 'APPROVED') return 'fin-badge fin-badge--ok';
  if (status === 'PENDING_DISBURSAL') return 'fin-badge fin-badge--warn';
  if (status === 'REJECTED') return 'fin-badge fin-badge--bad';
  return 'fin-badge';
}

// Dedicated "creation + approval" page: new applications get submitted here
// and admins approve/reject/revert them here. Once APPROVED (and eventually
// disbursed), the account shows up in the Loans register page instead — this
// page only ever shows PENDING / APPROVED / PENDING_DISBURSAL / REJECTED applications.
export default function LoanApplicationsView({
  loans = [],
  borrowers = [],
  loanSchemes = [],
  branches = [],
  tenant,
  chartOfAccounts = [],
  bankAccounts = [],
  externalSearchQuery = '',
  onCreateBorrower,
  onQuickAction,
  onApproveApplication,
  onRejectApplication,
  onRevertApplication,
  onDisburseApprovedLoan,
  onMarkPendingDisbursal,
  highlightLoanId = null
}) {
  const { t, tStatus } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const activeSearch = externalSearchQuery || searchQuery;
  const [appStatusFilter, setAppStatusFilter] = useState('PENDING'); // PENDING, APPROVED, PENDING_DISBURSAL, REJECTED

  useEffect(() => {
    if (!highlightLoanId) return;
    const target = loans.find(l => l.id === highlightLoanId || l.loan_account_no === highlightLoanId);
    if (!target) return;

    if (target.status === 'PENDING' || target.status === 'APPROVED' || target.status === 'PENDING_DISBURSAL' || target.status === 'REJECTED') {
      setAppStatusFilter(target.status);
    }
  }, [highlightLoanId, loans]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionErrorMsg, setActionErrorMsg] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedAppForApprove, setSelectedAppForApprove] = useState(null);
  const [selectedAppForReject, setSelectedAppForReject] = useState(null);
  const [loanToDisburse, setLoanToDisburse] = useState(null);
  const [modalAction, setModalAction] = useState('VIEW'); // 'VIEW' | 'PRINT'
  const [rejectReason, setRejectReason] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [createAppPageOpen, setCreateAppPageOpen] = useState(false);
  const [selectedCustomerForProfile, setSelectedCustomerForProfile] = useState(null);

  const schemeName = (schemeId) => loanSchemes.find(s => s.id === schemeId)?.name || '—';
  const linkedBorrower = (loan) => borrowers.find(b => b.id === loan.borrower_id || b.phone === loan.phone) || null;

  const allAppsList = loans.filter(l => l.status === 'PENDING' || l.status === 'APPROVED' || l.status === 'PENDING_DISBURSAL' || l.status === 'REJECTED');
  const allAppsCount = allAppsList.length;
  const pendingAppsCount = loans.filter(l => l.status === 'PENDING').length;
  const approvedAppsCount = loans.filter(l => l.status === 'APPROVED').length;
  const pendingDisbursalCount = loans.filter(l => l.status === 'PENDING_DISBURSAL').length;
  const rejectedAppsCount = loans.filter(l => l.status === 'REJECTED').length;

  const displayList = allAppsList.filter(l => {
    const matchesTab = appStatusFilter === 'ALL' ? true : l.status === appStatusFilter;
    const q = activeSearch.toLowerCase().trim();
    const matchesSearch = !q || (
      (l.borrower_name && l.borrower_name.toLowerCase().includes(q)) ||
      (l.loan_account_no && l.loan_account_no.toLowerCase().includes(q)) ||
      (l.phone && l.phone.includes(q))
    );
    return matchesTab && matchesSearch;
  });

  const totalPages = Math.ceil(displayList.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedList = displayList.slice(startIndex, startIndex + pageSize);

  const totalPrincipal = displayList.reduce((acc, l) => acc + (parseFloat(l.principal_amount) || 0), 0);
  const avgRequestedAmount = displayList.length ? totalPrincipal / displayList.length : 0;

  useEffect(() => {
    if (!highlightLoanId) return;
    const targetIndex = displayList.findIndex(l => l.id === highlightLoanId || l.loan_account_no === highlightLoanId);
    if (targetIndex !== -1) {
      const targetPage = Math.floor(targetIndex / pageSize) + 1;
      setCurrentPage(targetPage);
    }
  }, [highlightLoanId, displayList]);

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  const handleOpenModal = (loan, action = 'VIEW') => {
    setSelectedApplication(loan);
    setModalAction(action);
    setRejectReason('');
  };

  const handleCloseModal = () => {
    setSelectedApplication(null);
    setModalAction('VIEW');
    setRejectReason('');
  };

  const handleApproveConfirm = async (app) => {
    if (!app || actionLoading) return;
    setActionLoading(true);
    setActionErrorMsg('');
    try {
      await onApproveApplication?.(app.id);
      setSelectedAppForApprove(null);
      handleCloseModal();
      setActionSuccessMsg(`Loan Application ${app.loan_account_no} for ${app.borrower_name} has been approved successfully!`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (err) {
      setActionErrorMsg(err?.response?.data?.message || 'Failed to approve this application.');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConfirm = async (app, reasonOverride) => {
    const reason = (reasonOverride ?? rejectReason).trim();
    if (!app || !reason || actionLoading) return;
    setActionLoading(true);
    setActionErrorMsg('');
    try {
      await onRejectApplication?.(app.id, reason);
      setSelectedAppForReject(null);
      handleCloseModal();
      setActionSuccessMsg(`Loan Application ${app.loan_account_no} for ${app.borrower_name} has been rejected.`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (err) {
      setActionErrorMsg(err?.response?.data?.message || 'Failed to reject this application.');
      throw err;
    }
    finally {
      setActionLoading(false);
    }
  };

  const handleRevertConfirm = async (app) => {
    if (!app || actionLoading) return;
    setActionLoading(true);
    setActionErrorMsg('');
    try {
      await onRevertApplication?.(app.id);
      setActionSuccessMsg(`Loan Application ${app.loan_account_no} for ${app.borrower_name} has been reverted back to Pending status.`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (err) {
      setActionErrorMsg(err?.response?.data?.message || 'Failed to revert this application.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisburseConfirm = (app) => {
    if (!app || actionLoading) return;
    setLoanToDisburse(app);
  };

  const handleDisburseSubmit = async (disbursalData) => {
    if (!loanToDisburse) return;
    setActionLoading(true);
    setActionErrorMsg('');
    try {
      await onDisburseApprovedLoan?.(loanToDisburse.id, disbursalData);
      setActionSuccessMsg(`Loan ${loanToDisburse.loan_account_no} for ${loanToDisburse.borrower_name} has been disbursed from ${disbursalData.branch} via ${disbursalData.payment_mode}. Voucher posted.`);
      setLoanToDisburse(null);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (err) {
      setActionErrorMsg(err?.response?.data?.message || err?.message || 'Failed to disburse this loan.');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  if (createAppPageOpen) {
    return (
      <NewLoanApplicationPage
        loans={loans}
        borrowers={borrowers}
        loanSchemes={loanSchemes}
        branches={branches}
        tenant={tenant}
        onCreateBorrower={onCreateBorrower}
        onCancel={() => setCreateAppPageOpen(false)}
        onSubmit={async (payload) => {
          await onQuickAction?.('SUBMIT_APPLICATION', payload);
          setCreateAppPageOpen(false);
          setActionSuccessMsg(`Loan Application submitted successfully for ${payload.borrower_name}!`);
          setTimeout(() => setActionSuccessMsg(''), 4000);
        }}
      />
    );
  }

  const TABS = [
    { id: 'PENDING', label: t('kyc.pending_review') || 'Pending Review', count: pendingAppsCount },
    { id: 'APPROVED', label: 'Approved', count: approvedAppsCount },
    { id: 'PENDING_DISBURSAL', label: 'Disbursement Pending', count: pendingDisbursalCount },
    { id: 'REJECTED', label: tStatus('REJECTED') || 'Rejected', count: rejectedAppsCount }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {actionSuccessMsg && (
        <div style={{
          background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary-hover, #0E5327)',
          padding: '10px 16px', borderRadius: 10, fontWeight: 600, fontSize: '0.82rem',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <CheckCircle2 style={{ width: 16, height: 16 }} />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {actionErrorMsg && (
        <div style={{
          background: 'var(--color-danger-light, #FEF2F2)', border: '1px solid var(--color-danger-border, #FECACA)', color: 'var(--color-danger-text, #991B1B)',
          padding: '10px 16px', borderRadius: 10, fontWeight: 600, fontSize: '0.82rem',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <XCircle style={{ width: 16, height: 16 }} />
          <span>{actionErrorMsg}</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <StatusTabs tabs={TABS} active={appStatusFilter} onChange={(id) => { setAppStatusFilter(id); setCurrentPage(1); }} />
      </div>

      <div className="fin-tablewrap">
        <table className="fin-grid-table">
          <thead>
            <tr>
              <th style={{ width: 50, textAlign: 'center' }}>{t('col.sno')}</th>
              <th>{t('col.applicant_name')}</th>
              <th>{t('col.application_no')}</th>
              <th>{t('col.branch')}</th>
              <th>{t('col.scheme')}</th>
              <th className="num">{t('col.amount_rs')}</th>
              <th className="num">{t('col.daily_emi_rs')}</th>
              <th style={{ textAlign: 'center' }}>{t('col.status')}</th>
              <th style={{ textAlign: 'right' }}>{t('col.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedList.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
                  No loan applications match the selected filter.
                </td>
              </tr>
            ) : (
              paginatedList.map((loan, idx) => {
                const borrower = linkedBorrower(loan);
                const isHighlighted = Boolean(highlightLoanId && (loan.id === highlightLoanId || loan.loan_account_no === highlightLoanId));
                return (
                  <tr
                    key={loan.id}
                    className={isHighlighted ? 'highlighted-loan-row' : ''}
                    ref={isHighlighted ? (el) => el?.scrollIntoView({ behavior: 'smooth', block: 'center' }) : null}
                  >
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
                                borrower_code: loan.borrower_code || null
                              };
                              setSelectedCustomerForProfile(b);
                            }}
                            title="Click to view full customer details"
                            style={{ color: '#0F172A', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--brand-primary, #15803D)'; e.currentTarget.style.textDecoration = 'underline'; }}
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
                        onClick={() => handleOpenModal(loan, 'VIEW')}
                        title="Click to view full Application Details"
                        style={{ color: 'var(--brand-primary, #15803D)', cursor: 'pointer', fontWeight: 600 }}
                      >
                        {loan.loan_account_no}
                      </span>
                    </td>

                    <td style={{ color: '#64748B', fontSize: '0.78rem' }}>{loan.branch || '—'}</td>
                    <td style={{ color: '#334155', fontSize: '0.78rem' }}>{schemeName(loan.scheme_id)}</td>
                    <td className="num" style={{ fontWeight: 600 }}>₹{fmt(loan.principal_amount)}</td>
                    <td className="num" style={{ color: 'var(--brand-primary-hover, #0E5327)', fontWeight: 600 }}>{loan.installment_amount != null ? `₹${fmt(loan.installment_amount)}` : '—'}</td>

                    <td style={{ textAlign: 'center' }}>
                      <span className={appStatusBadgeCls(loan.status)}>
                        {loan.status === 'PENDING' ? (t('kyc.pending_review') || 'Pending Review') :
                         loan.status === 'PENDING_DISBURSAL' ? 'Disbursement Pending' :
                         loan.status === 'APPROVED' ? 'Approved' :
                         tStatus(loan.status)}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <ActionPill icon={<Eye style={{ width: 11, height: 11 }} />} label="View" onClick={() => handleOpenModal(loan, 'VIEW')} />
                        <ActionPill icon={<Printer style={{ width: 11, height: 11 }} />} label="Print" onClick={() => handleOpenModal(loan, 'PRINT')} />
                        {loan.status === 'PENDING' && (
                          <>
                            <ActionPill icon={<CheckCircle2 style={{ width: 11, height: 11 }} />} label="Approve" tone="good" onClick={() => setSelectedAppForApprove(loan)} />
                            <ActionPill icon={<XCircle style={{ width: 11, height: 11 }} />} label="Reject" tone="bad" onClick={() => { setRejectReason(''); setSelectedAppForReject(loan); }} />
                          </>
                        )}
                        {loan.status === 'REJECTED' && (
                          <ActionPill icon={<RotateCcw style={{ width: 11, height: 11 }} />} label="Revert" tone="warn" disabled={actionLoading} onClick={() => handleRevertConfirm(loan)} />
                        )}
                        {(loan.status === 'APPROVED' || loan.status === 'PENDING_DISBURSAL') && (
                          <>
                            <ActionPill icon={<CheckCircle2 style={{ width: 11, height: 11 }} />} label={actionLoading ? 'Disbursing…' : 'Disburse'} tone="good" disabled={actionLoading} onClick={() => handleDisburseConfirm(loan)} />
                            <ActionPill icon={<XCircle style={{ width: 11, height: 11 }} />} label="Reject" tone="bad" disabled={actionLoading} onClick={() => { setRejectReason(''); setSelectedAppForReject(loan); }} />
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

      {/* ── Direct Loan Approval Confirmation Modal ── */}
      {selectedAppForApprove && (
        <div className="saas-modal-backdrop" style={{ zIndex: 100000 }}>
          <div className="saas-modal-card" style={{ maxWidth: 480 }}>
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: 'var(--brand-primary-light, #F0FEF5)', color: 'var(--brand-primary, #15803D)' }}>
                  <CheckCircle2 style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3>Confirm Loan Approval</h3>
                  <p>Approve credit application and send to Disbursal queue</p>
                </div>
              </div>
              <button onClick={() => setSelectedAppForApprove(null)} className="close-btn" type="button">
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div className="saas-modal-body">
              <p style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.5, margin: 0 }}>
                Are you sure you want to approve loan application <strong style={{ color: 'var(--brand-primary, #15803D)' }}>{selectedAppForApprove.loan_account_no}</strong> for <strong>{selectedAppForApprove.borrower_name}</strong>?
              </p>

              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Requested Principal:</span>
                  <strong style={{ color: '#0F172A', fontSize: '0.92rem' }}>₹{fmt(selectedAppForApprove.principal_amount)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Installment:</span>
                  <strong style={{ color: 'var(--brand-primary-hover, #0E5327)' }}>
                    ₹{fmt(selectedAppForApprove.installment_amount)} / {selectedAppForApprove.repayment_frequency || 'MONTHLY'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Scheme:</span>
                  <span style={{ fontWeight: 600, color: '#334155' }}>{schemeName(selectedAppForApprove.scheme_id)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Branch:</span>
                  <span style={{ fontWeight: 600, color: '#334155' }}>{selectedAppForApprove.branch || '—'}</span>
                </div>
              </div>
            </div>

            <div className="saas-modal-footer">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setSelectedAppForApprove(null)}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleApproveConfirm(selectedAppForApprove)}
                className="btn-submit"
              >
                <CheckCircle2 style={{ width: 14, height: 14 }} />
                <span>{actionLoading ? 'Approving…' : 'Confirm & Approve'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Direct Loan Rejection Modal ── */}
      {selectedAppForReject && (
        <div className="saas-modal-backdrop" style={{ zIndex: 100000 }}>
          <div className="saas-modal-card" style={{ maxWidth: 480 }}>
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: 'var(--color-danger-light, #FEF2F2)', color: 'var(--color-danger, #DC2626)' }}>
                  <XCircle style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3>Reject Loan Application</h3>
                  <p>Provide a rejection reason for the applicant record</p>
                </div>
              </div>
              <button onClick={() => setSelectedAppForReject(null)} className="close-btn" type="button">
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div className="saas-modal-body">
              <p style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.5, margin: 0 }}>
                Are you sure you want to reject loan application <strong style={{ color: 'var(--color-danger, #DC2626)' }}>{selectedAppForReject.loan_account_no}</strong> for <strong>{selectedAppForReject.borrower_name}</strong>?
              </p>

              <div className="form-group">
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Rejection Reason *
                </label>
                <textarea
                  rows={3}
                  required
                  className="input-control"
                  style={{ height: 'auto', padding: '8px 12px', resize: 'vertical' }}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. KYC mismatch, insufficient income, or high credit risk..."
                />
              </div>
            </div>

            <div className="saas-modal-footer">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setSelectedAppForReject(null)}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || !rejectReason.trim()}
                onClick={() => handleRejectConfirm(selectedAppForReject, rejectReason)}
                className="btn-submit"
                style={{ background: 'var(--color-danger, #DC2626)' }}
              >
                <XCircle style={{ width: 14, height: 14 }} />
                <span>{actionLoading ? 'Rejecting…' : 'Confirm Rejection'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedApplication && (
        <PrintableLoanApplicationSheet
          applicationData={selectedApplication}
          borrowerData={linkedBorrower(selectedApplication) || {
            full_name: selectedApplication.borrower_name,
            phone: selectedApplication.phone,
            aadhaar_number: selectedApplication.aadhaar,
            pan_number: selectedApplication.pan,
            branch: selectedApplication.branch
          }}
          initialMode={modalAction}
          tenant={tenant}
          onClose={handleCloseModal}
          onApprove={(app) => handleApproveConfirm(app)}
          onReject={(app, reason) => handleRejectConfirm(app, reason)}
        />
      )}

      {selectedCustomerForProfile && (
        <CustomerProfileModal
          borrower={selectedCustomerForProfile}
          onClose={() => setSelectedCustomerForProfile(null)}
          onEdit={() => setSelectedCustomerForProfile(null)}
        />
      )}

      {loanToDisburse && (
        <DisburseLoanModal
          loan={loanToDisburse}
          branchesList={branches}
          chartOfAccounts={chartOfAccounts}
          bankAccounts={bankAccounts}
          onConfirm={handleDisburseSubmit}
          onMarkPendingDisbursal={async (loanId, reason) => {
            await onMarkPendingDisbursal?.(loanId, reason);
            setLoanToDisburse(null);
            setActionSuccessMsg('Loan moved to Disbursement Pending stage (awaiting funds).');
            setTimeout(() => setActionSuccessMsg(''), 4000);
          }}
          onClose={() => setLoanToDisburse(null)}
        />
      )}
    </div>
  );
}
