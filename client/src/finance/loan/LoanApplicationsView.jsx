import React, { useState } from 'react';
import NewLoanApplicationPage from './NewLoanApplicationPage';
import PrintableLoanApplicationSheet from './PrintableLoanApplicationSheet';
import CustomerProfileModal from '../borrowers/CustomerProfileModal';
import {
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Plus,
  ChevronLeft,
  ChevronRight,
  RotateCcw
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
              background: isActive ? (tab.id === 'PENDING' ? '#FEF3C7' : tab.id === 'APPROVED' ? '#ECFDF5' : '#FEF2F2') : '#E2E8F0',
              color: isActive ? (tab.id === 'PENDING' ? '#D97706' : tab.id === 'APPROVED' ? '#059669' : '#DC2626') : '#64748B'
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
    good: { bg: '#ECFDF5', border: '#A7F3D0', color: '#059669' },
    bad: { bg: '#FEF2F2', border: '#FECACA', color: '#DC2626' },
    warn: { bg: '#FFFBEB', border: '#FDE68A', color: '#B45309' }
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

function appStatusBadgeCls(status) {
  if (status === 'APPROVED') return 'fin-badge fin-badge--ok';
  if (status === 'REJECTED') return 'fin-badge fin-badge--warn';
  return 'fin-badge';
}

// Dedicated "creation + approval" page: new applications get submitted here
// and admins approve/reject/revert them here. Once APPROVED (and eventually
// disbursed), the account shows up in the Loans register page instead — this
// page only ever shows PENDING / APPROVED / REJECTED applications.
export default function LoanApplicationsView({
  loans = [],
  borrowers = [],
  loanSchemes = [],
  branches = [],
  externalSearchQuery = '',
  onCreateBorrower,
  onQuickAction,
  onApproveApplication,
  onRejectApplication,
  onRevertApplication
}) {
  const { t, tStatus } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const activeSearch = externalSearchQuery || searchQuery;
  const [appStatusFilter, setAppStatusFilter] = useState('PENDING'); // PENDING, APPROVED, REJECTED
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [selectedApplication, setSelectedApplication] = useState(null);
  const [modalAction, setModalAction] = useState('VIEW'); // 'VIEW' | 'APPROVE' | 'REJECT'
  const [rejectReason, setRejectReason] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [createAppPageOpen, setCreateAppPageOpen] = useState(false);
  const [selectedCustomerForProfile, setSelectedCustomerForProfile] = useState(null);

  const schemeName = (schemeId) => loanSchemes.find(s => s.id === schemeId)?.name || 'Standard Scheme';
  const linkedBorrower = (loan) => borrowers.find(b => b.id === loan.borrower_id || b.phone === loan.phone) || null;

  const allAppsList = loans.filter(l => l.status === 'PENDING' || l.status === 'APPROVED' || l.status === 'REJECTED');
  const allAppsCount = allAppsList.length;
  const pendingAppsCount = loans.filter(l => l.status === 'PENDING').length;
  const approvedAppsCount = loans.filter(l => l.status === 'APPROVED').length;
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
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedList = displayList.slice(startIndex, startIndex + pageSize);

  const totalPrincipal = displayList.reduce((acc, l) => acc + (parseFloat(l.principal_amount) || 0), 0);
  const avgRequestedAmount = displayList.length ? totalPrincipal / displayList.length : 0;
  const kycVerifiedCount = displayList.filter(l => linkedBorrower(l)?.kyc_status === 'VERIFIED').length;
  const kycVerifiedRate = displayList.length ? Math.round((kycVerifiedCount / displayList.length) * 100) : 0;

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

  const handleApproveConfirm = (app) => {
    if (!app) return;
    onApproveApplication?.(app.id);
    handleCloseModal();
    setActionSuccessMsg(`Loan Application ${app.loan_account_no} for ${app.borrower_name} has been approved successfully!`);
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  const handleRejectConfirm = (app) => {
    if (!app || !rejectReason.trim()) return;
    onRejectApplication?.(app.id, rejectReason.trim());
    handleCloseModal();
    setActionSuccessMsg(`Loan Application ${app.loan_account_no} for ${app.borrower_name} has been rejected.`);
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  const handleRevertConfirm = (app) => {
    if (!app) return;
    onRevertApplication?.(app.id);
    setActionSuccessMsg(`Loan Application ${app.loan_account_no} for ${app.borrower_name} has been reverted back to Pending status.`);
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  if (createAppPageOpen) {
    return (
      <NewLoanApplicationPage
        borrowers={borrowers}
        loanSchemes={loanSchemes}
        branches={branches}
        onCreateBorrower={onCreateBorrower}
        onCancel={() => setCreateAppPageOpen(false)}
        onSubmit={(payload) => {
          onQuickAction?.('SUBMIT_APPLICATION', payload);
          setCreateAppPageOpen(false);
          setActionSuccessMsg(`Loan Application submitted successfully for ${payload.borrower_name}!`);
          setTimeout(() => setActionSuccessMsg(''), 4000);
        }}
      />
    );
  }

  const TABS = [
    { id: 'PENDING', label: t('kyc.pending_review'), count: pendingAppsCount },
    { id: 'APPROVED', label: tStatus('APPROVED'), count: approvedAppsCount },
    { id: 'REJECTED', label: tStatus('REJECTED'), count: rejectedAppsCount }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {actionSuccessMsg && (
        <div style={{
          background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857',
          padding: '10px 16px', borderRadius: 10, fontWeight: 600, fontSize: '0.82rem',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <CheckCircle2 style={{ width: 16, height: 16 }} />
          <span>{actionSuccessMsg}</span>
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
                        onClick={() => handleOpenModal(loan, 'VIEW')}
                        title="Click to view full Application Details"
                        style={{ color: '#059669', cursor: 'pointer', fontWeight: 600 }}
                      >
                        {loan.loan_account_no}
                      </span>
                    </td>

                    <td style={{ color: '#64748B', fontSize: '0.78rem' }}>{loan.branch || 'Main Branch'}</td>
                    <td style={{ color: '#334155', fontSize: '0.78rem' }}>{schemeName(loan.scheme_id)}</td>
                    <td className="num" style={{ fontWeight: 600 }}>₹{fmt(loan.principal_amount)}</td>
                    <td className="num" style={{ color: '#047857', fontWeight: 600 }}>₹{fmt(loan.installment_amount || 500)}</td>

                    <td style={{ textAlign: 'center' }}>
                      <span className={appStatusBadgeCls(loan.status)}>
                        {loan.status === 'PENDING' ? t('kyc.pending_review') : tStatus(loan.status)}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <ActionPill icon={<Eye style={{ width: 11, height: 11 }} />} label="View" onClick={() => handleOpenModal(loan, 'VIEW')} />
                        {loan.status === 'PENDING' && (
                          <>
                            <ActionPill icon={<CheckCircle2 style={{ width: 11, height: 11 }} />} label="Approve" tone="good" onClick={() => handleOpenModal(loan, 'APPROVE')} />
                            <ActionPill icon={<XCircle style={{ width: 11, height: 11 }} />} label="Reject" tone="bad" onClick={() => handleOpenModal(loan, 'REJECT')} />
                          </>
                        )}
                        {loan.status === 'REJECTED' && (
                          <ActionPill icon={<RotateCcw style={{ width: 11, height: 11 }} />} label="Revert" tone="warn" onClick={() => handleRevertConfirm(loan)} />
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
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
              <ChevronLeft style={{ width: 14, height: 14 }} />
              <span>Previous</span>
            </button>
            <span className="page-indicator">Page {currentPage} of {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              <span>Next</span>
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      </div>

      {selectedApplication && (
        <PrintableLoanApplicationSheet
          applicationData={selectedApplication}
          borrowerData={linkedBorrower(selectedApplication) || {
            full_name: selectedApplication.borrower_name,
            phone: selectedApplication.phone,
            aadhaar_number: selectedApplication.aadhaar,
            pan_number: selectedApplication.pan,
            branch: selectedApplication.branch,
            kyc_status: linkedBorrower(selectedApplication)?.kyc_status || 'VERIFIED'
          }}
          initialMode={modalAction}
          onClose={handleCloseModal}
          onApprove={modalAction === 'APPROVE' ? (app) => handleApproveConfirm(app) : null}
          onReject={modalAction === 'REJECT' ? (app, reason) => {
            setRejectReason(reason);
            handleRejectConfirm(app);
          } : null}
        />
      )}

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
