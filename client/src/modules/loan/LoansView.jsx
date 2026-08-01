import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Receipt,
  TrendingUp,
  AlertCircle,
  Banknote,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  ShieldCheck,
  Building2,
  UserCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function LoansView({ loans, borrowers = [], loanSchemes = [], activeTab, onOpenCollectDrawer, onQuickAction, onApproveApplication, onRejectApplication }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const schemeName = (schemeId) => loanSchemes.find(s => s.id === schemeId)?.name || '—';
  const linkedBorrower = (loan) => borrowers.find(b => b.id === loan.borrower_id) || null;

  const isApplicationsTab = activeTab.includes('loan-applications');
  const isClosedTab = activeTab.includes('closed-loans');

  // Filter loans for current activeTab
  const displayList = loans.filter(l => {
    let matchesTab = true;
    if (isApplicationsTab) matchesTab = l.status === 'PENDING';
    else if (isClosedTab) matchesTab = l.status === 'CLOSED';
    else matchesTab = l.status === 'ACTIVE' || l.status === 'OVERDUE';

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      (l.borrower_name && l.borrower_name.toLowerCase().includes(q)) ||
      (l.loan_account_no && l.loan_account_no.toLowerCase().includes(q)) ||
      (l.phone && l.phone.includes(q))
    );

    let matchesStatus = true;
    if (!isApplicationsTab) {
      if (statusFilter === 'DUE_TODAY') matchesStatus = (l.installment_amount || 0) > 0;
      if (statusFilter === 'OVERDUE') matchesStatus = l.status === 'OVERDUE';
    }

    return matchesTab && matchesSearch && matchesStatus;
  });

  // Calculate Pagination
  const totalPages = Math.ceil(displayList.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedList = displayList.slice(startIndex, startIndex + pageSize);

  // Calculate Metrics (all real aggregates — no hardcoded/fabricated figures)
  const totalPrincipal = displayList.reduce((acc, l) => acc + (parseFloat(l.principal_amount) || 0), 0);
  const totalCollected = displayList.reduce((acc, l) => acc + (parseFloat(l.collected_amount) || 0), 0);
  const totalOutstanding = displayList.reduce((acc, l) => acc + (parseFloat(l.pending_amount) || 0), 0);
  const overdueCount = loans.filter(l => l.status === 'OVERDUE').length;
  const avgRequestedAmount = displayList.length ? totalPrincipal / displayList.length : 0;
  const kycVerifiedCount = displayList.filter(l => linkedBorrower(l)?.kyc_status === 'VERIFIED').length;
  const kycVerifiedRate = displayList.length ? Math.round((kycVerifiedCount / displayList.length) * 100) : 0;

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  const handleApprove = (app) => {
    onApproveApplication?.(app.id);
    setSelectedApplication(null);
    setActionSuccessMsg(`Loan Application ${app.loan_account_no} for ${app.borrower_name} has been approved and disbursed!`);
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  const handleRejectConfirm = (app) => {
    if (!rejectReason.trim()) return;
    onRejectApplication?.(app.id, rejectReason.trim());
    setSelectedApplication(null);
    setRejecting(false);
    setRejectReason('');
    setActionSuccessMsg(`Application ${app.loan_account_no} rejected.`);
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  return (
    <div className="active-loans-page">

      {actionSuccessMsg && (
        <div style={{
          background: '#ECFDF5',
          border: '1px solid #A7F3D0',
          color: '#047857',
          padding: '10px 16px',
          borderRadius: 10,
          fontSize: '0.8rem',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <CheckCircle2 style={{ width: 16, height: 16 }} />
          <span>{actionSuccessMsg}</span>
        </div>
      )}
      
      {/* ── 1. Top Page Executive Header with Icon Logo Badge ──────────── */}
      <div className="active-loans-header">
        <div className="header-left">
          <div className="header-badge-icon" style={{
            background: isApplicationsTab ? '#FFFBEB' : '#ECFDF5',
            borderColor: isApplicationsTab ? '#FDE68A' : '#A7F3D0',
            color: isApplicationsTab ? '#D97706' : '#059669'
          }}>
            {isApplicationsTab ? (
              <Clock style={{ width: 20, height: 20 }} />
            ) : (
              <FileText style={{ width: 20, height: 20 }} />
            )}
          </div>
          <div className="header-text">
            <h1>
              {isApplicationsTab ? 'Pending Loan Applications' : isClosedTab ? 'Closed Loans Archive' : 'Active Loans Register'}
            </h1>
            <p>
              {isApplicationsTab
                ? 'Review credit risk evaluation, requested loan amounts, KYC compliance, and approve disbursements'
                : 'Monitor active loan accounts, daily collection due amounts, and outstanding balances'}
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="btn-disburse"
            onClick={() => onQuickAction?.(isApplicationsTab ? 'APPLICATION' : 'LOAN')}
            style={{
              background: isApplicationsTab ? '#D97706' : '#059669'
            }}
          >
            <Plus style={{ width: 15, height: 15 }} />
            <span>{isApplicationsTab ? 'Submit Application' : 'Disburse New Loan'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. Top Summary KPI Cards Strip ───────────────────────────── */}
      <div className="loans-kpi-grid">
        <div className="loan-kpi-card">
          <div className="loan-kpi-card__icon loan-kpi-card__icon--blue">
            {isApplicationsTab ? <Clock style={{ width: 20, height: 20 }} /> : <Banknote style={{ width: 20, height: 20 }} />}
          </div>
          <div className="loan-kpi-card__info">
            <span>{isApplicationsTab ? 'Total Pending Reviews' : 'Total Disbursed Principal'}</span>
            <strong>{isApplicationsTab ? `${displayList.length} Applications` : `₹${fmt(totalPrincipal)}`}</strong>
          </div>
        </div>

        <div className="loan-kpi-card">
          <div className="loan-kpi-card__icon loan-kpi-card__icon--green">
            <TrendingUp style={{ width: 20, height: 20 }} />
          </div>
          <div className="loan-kpi-card__info">
            <span>{isApplicationsTab ? 'Requested Credit Volume' : 'Total Collected Amount'}</span>
            <strong>₹{fmt(isApplicationsTab ? totalPrincipal : totalCollected)}</strong>
          </div>
        </div>

        <div className="loan-kpi-card">
          <div className="loan-kpi-card__icon loan-kpi-card__icon--purple">
            <ShieldCheck style={{ width: 20, height: 20 }} />
          </div>
          <div className="loan-kpi-card__info">
            <span>{isApplicationsTab ? 'KYC Verified (of Applicants)' : 'Outstanding Balance'}</span>
            <strong>{isApplicationsTab ? `${kycVerifiedRate}% (${kycVerifiedCount}/${displayList.length})` : `₹${fmt(totalOutstanding)}`}</strong>
          </div>
        </div>

        <div className="loan-kpi-card">
          <div className="loan-kpi-card__icon loan-kpi-card__icon--orange">
            <AlertCircle style={{ width: 20, height: 20 }} />
          </div>
          <div className="loan-kpi-card__info">
            <span>{isApplicationsTab ? 'Avg Requested Amount' : 'Overdue Exposure Accounts'}</span>
            <strong>{isApplicationsTab ? `₹${fmt(avgRequestedAmount)}` : `${overdueCount} Accounts`}</strong>
          </div>
        </div>
      </div>

      {/* ── 3. Interactive Toolbar & Search (Non-collapsing) ─────────── */}
      <div className="loans-toolbar">
        <div className="loans-toolbar__left">
          <div className="loans-toolbar__search">
            <Search className="search-icon" style={{ width: 15, height: 15 }} />
            <input
              type="text"
              placeholder={isApplicationsTab ? "Search applicant name, Application No, phone..." : "Search Customer name, Loan account no, phone..."}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <div className="loans-toolbar__tabs">
            <button
              className={`loans-toolbar__tab-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
            >
              All {isApplicationsTab ? 'Applications' : 'Accounts'} ({displayList.length})
            </button>
            {!isApplicationsTab && (
              <>
                <button
                  className={`loans-toolbar__tab-btn ${statusFilter === 'DUE_TODAY' ? 'active' : ''}`}
                  onClick={() => { setStatusFilter('DUE_TODAY'); setCurrentPage(1); }}
                >
                  Due Today
                </button>
                <button
                  className={`loans-toolbar__tab-btn ${statusFilter === 'OVERDUE' ? 'active' : ''}`}
                  onClick={() => { setStatusFilter('OVERDUE'); setCurrentPage(1); }}
                >
                  Overdue Risk ({overdueCount})
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Master Data Table with S.No & Pagination ──────────────── */}
      <div className="loans-table-card">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th style={{ width: 50, textAlign: 'center' }}>S.No</th>
                <th>{isApplicationsTab ? 'Application No' : 'Loan Account'}</th>
                <th>{isApplicationsTab ? 'Applicant Name' : 'Customer Name'}</th>
                <th>Branch</th>
                <th style={{ textAlign: 'right' }}>{isApplicationsTab ? 'Requested Principal' : 'Principal (₹)'}</th>
                <th style={{ textAlign: 'right' }}>{isApplicationsTab ? 'Proposed Daily EMI' : 'Daily EMI (₹)'}</th>
                {!isApplicationsTab && <th style={{ textAlign: 'right' }}>Collected (₹)</th>}
                {!isApplicationsTab && <th style={{ textAlign: 'right' }}>Outstanding (₹)</th>}
                <th style={{ textAlign: 'center' }}>{isApplicationsTab ? 'KYC Status' : 'Status'}</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
                    {isApplicationsTab ? 'No pending loan applications found.' : 'No loan accounts match your search criteria.'}
                  </td>
                </tr>
              ) : (
                paginatedList.map((loan, idx) => (
                  <tr key={loan.id}>
                    <td style={{ textAlign: 'center', color: '#64748B' }}>
                      {startIndex + idx + 1}
                    </td>

                    <td>
                      <span className="acc-no" style={{ color: isApplicationsTab ? '#D97706' : '#059669' }}>
                        {loan.loan_account_no}
                      </span>
                    </td>

                    <td>
                      <span style={{ color: '#0F172A', fontSize: '0.82rem' }}>
                        {loan.borrower_name}
                      </span>
                    </td>

                    <td>
                      <span style={{ color: '#64748B', fontSize: '0.75rem' }}>
                        {loan.branch || 'Main Branch'}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right', color: '#334155' }}>
                      ₹{fmt(loan.principal_amount)}
                    </td>

                    <td style={{ textAlign: 'right', color: '#047857' }}>
                      ₹{fmt(loan.installment_amount || 500)} / day
                    </td>

                    {!isApplicationsTab && (
                      <>
                        <td style={{ textAlign: 'right', color: '#059669' }}>
                          ₹{fmt(loan.collected_amount)}
                        </td>
                        <td style={{ textAlign: 'right', color: loan.pending_amount > 0 ? '#DC2626' : '#059669' }}>
                          ₹{fmt(loan.pending_amount)}
                        </td>
                      </>
                    )}

                    <td style={{ textAlign: 'center' }}>
                      {isApplicationsTab ? (
                        (() => {
                          const kyc = linkedBorrower(loan)?.kyc_status;
                          const cfg = kyc === 'VERIFIED'
                            ? { bg: '#ECFDF5', border: '#A7F3D0', color: '#047857', label: 'Verified' }
                            : kyc === 'PENDING'
                              ? { bg: '#FFFBEB', border: '#FDE68A', color: '#92400E', label: 'Pending' }
                              : { bg: '#F1F5F9', border: '#E2E8F0', color: '#64748B', label: 'Not Linked' };
                          return (
                            <span style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, fontSize: '0.7rem', padding: '3px 8px', borderRadius: 20 }}>
                              {cfg.label}
                            </span>
                          );
                        })()
                      ) : (
                        <span className={`status-pill ${
                          loan.status === 'ACTIVE' ? 'status-pill--active' :
                          loan.status === 'OVERDUE' ? 'status-pill--overdue' : 'status-pill--closed'
                        }`}>
                          {loan.status}
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', items: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        {isApplicationsTab ? (
                          <>
                            <button
                              type="button"
                              className="btn-collect-sm"
                              style={{ background: '#3B82F6' }}
                              onClick={() => setSelectedApplication(loan)}
                              title="Review Application Details"
                            >
                              <Eye style={{ width: 12, height: 12 }} />
                              <span>Inspect</span>
                            </button>
                            <button
                              type="button"
                              className="btn-collect-sm"
                              onClick={() => handleApprove(loan)}
                              title="Approve Loan & Disburse Funds"
                            >
                              <CheckCircle2 style={{ width: 12, height: 12 }} />
                              <span>Approve</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn-collect-sm"
                            onClick={() => onOpenCollectDrawer?.(loan)}
                            title="Record Payment Collection"
                          >
                            <Receipt style={{ width: 12, height: 12 }} />
                            <span>Collect</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        <div className="table-pagination">
          <div className="table-pagination__info">
            Showing <strong>{displayList.length === 0 ? 0 : startIndex + 1}</strong> to <strong>{Math.min(startIndex + pageSize, displayList.length)}</strong> of <strong>{displayList.length}</strong> entries
          </div>
          <div className="table-pagination__controls">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft style={{ width: 14, height: 14 }} />
              <span>Previous</span>
            </button>
            <span className="page-indicator">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <span>Next</span>
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>

      </div>

      {/* ── 5. Application Inspection & Approval Modal ─────────────── */}
      {selectedApplication && (
        <div className="saas-modal-backdrop">
          <div className="saas-modal-card saas-modal-card--lg">
            
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: '#FFFBEB', color: '#D97706' }}>
                  <Clock style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3>Loan Application Evaluation</h3>
                  <p>Credit Risk Audit & Disbursement Approval</p>
                </div>
              </div>
              <button onClick={() => setSelectedApplication(null)} className="close-btn" type="button">
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div className="saas-modal-banner">
              <div className="banner-top">
                <div>
                  <div className="borrower-name">{selectedApplication.borrower_name}</div>
                  <div className="borrower-sub">Phone: {selectedApplication.phone} • Branch: {selectedApplication.branch}</div>
                </div>
                <span className="status-badge status-badge--active" style={{ background: '#FEF3C7', color: '#92400E', borderColor: '#FDE68A' }}>
                  PENDING REVIEW
                </span>
              </div>

              <div className="banner-stats" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                <div className="stat-col">
                  <span>Application No</span>
                  <strong>{selectedApplication.loan_account_no}</strong>
                </div>
                <div className="stat-col">
                  <span>Requested Amount</span>
                  <strong style={{ color: '#059669' }}>₹{fmt(selectedApplication.principal_amount)}</strong>
                </div>
                <div className="stat-col">
                  <span>Daily Installment</span>
                  <strong style={{ color: '#2563EB' }}>₹{fmt(selectedApplication.installment_amount || 500)}/day</strong>
                </div>
                <div className="stat-col">
                  <span>Loan Scheme</span>
                  <strong>{schemeName(selectedApplication.scheme_id)}</strong>
                </div>
                <div className="stat-col">
                  <span>Guarantor</span>
                  <strong>{selectedApplication.guarantor || 'Self'}</strong>
                </div>
              </div>
            </div>

            <div className="saas-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ padding: 14, background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase' }}>Aadhaar KYC Number</span>
                  <div style={{ fontSize: '0.85rem', color: '#0F172A', marginTop: 2 }}>{selectedApplication.aadhaar || '—'}</div>
                </div>
                <div style={{ padding: 14, background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase' }}>PAN Card Number</span>
                  <div style={{ fontSize: '0.85rem', color: '#0F172A', marginTop: 2, textTransform: 'uppercase' }}>{selectedApplication.pan || '—'}</div>
                </div>
                <div style={{ padding: 14, background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase' }}>Customer Directory Link</span>
                  <div style={{ fontSize: '0.85rem', color: linkedBorrower(selectedApplication) ? '#059669' : '#94A3B8', marginTop: 2 }}>
                    {linkedBorrower(selectedApplication) ? `Linked — ${linkedBorrower(selectedApplication).borrower_code} (KYC: ${linkedBorrower(selectedApplication).kyc_status})` : 'Not linked — no matching phone number in Customer Directory'}
                  </div>
                </div>
                <div style={{ padding: 14, background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase' }}>Loan Purpose</span>
                  <div style={{ fontSize: '0.85rem', color: '#0F172A', marginTop: 2 }}>{selectedApplication.purpose || '—'}</div>
                </div>
              </div>

              {rejecting && (
                <div style={{ marginTop: 14, padding: 14, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10 }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Rejection Reason *
                  </label>
                  <textarea
                    rows={2}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Insufficient income proof, KYC mismatch..."
                    className="input-control"
                    style={{ width: '100%', marginTop: 8, height: 'auto', padding: '8px 12px', background: '#FFFFFF' }}
                  />
                </div>
              )}
            </div>

            <div className="saas-modal-footer" style={{ justifyContent: 'space-between' }}>
              {!rejecting ? (
                <button
                  type="button"
                  onClick={() => setRejecting(true)}
                  style={{
                    border: '1px solid #FECACA',
                    background: '#FEF2F2',
                    color: '#991B1B',
                    padding: '8px 16px',
                    borderRadius: 9,
                    cursor: 'pointer',
                    fontSize: '0.78rem'
                  }}
                >
                  Reject Application
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRejectConfirm(selectedApplication)}
                  disabled={!rejectReason.trim()}
                  style={{
                    border: 'none',
                    background: '#DC2626',
                    color: '#FFF',
                    padding: '8px 16px',
                    borderRadius: 9,
                    cursor: rejectReason.trim() ? 'pointer' : 'not-allowed',
                    opacity: rejectReason.trim() ? 1 : 0.6,
                    fontSize: '0.78rem',
                    fontWeight: 600
                  }}
                >
                  Confirm Rejection
                </button>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => { setSelectedApplication(null); setRejecting(false); setRejectReason(''); }}
                  style={{
                    border: '1px solid #CBD5E1',
                    background: '#FFF',
                    color: '#334155',
                    padding: '8px 16px',
                    borderRadius: 9,
                    cursor: 'pointer',
                    fontSize: '0.78rem'
                  }}
                >
                  Cancel
                </button>
                {!rejecting && (
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedApplication)}
                    className="btn-submit"
                  >
                    Approve & Disburse Loan
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
