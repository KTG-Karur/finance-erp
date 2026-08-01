import React, { useState, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Search,
  Plus,
  LayoutGrid,
  List,
  Eye,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import CustomerFormPage from './CustomerFormPage';

const normalizePhone = (p) => (p || '').toString().replace(/\D/g, '');

function KycBadge({ status }) {
  if (status === 'VERIFIED') {
    return <span className="kyc-verified-badge"><ShieldCheck style={{ width: 12, height: 12 }} /><span>VERIFIED</span></span>;
  }
  if (status === 'REJECTED') {
    return <span className="kyc-verified-badge kyc-verified-badge--rejected"><ShieldAlert style={{ width: 12, height: 12 }} /><span>REJECTED</span></span>;
  }
  return <span className="kyc-verified-badge kyc-verified-badge--pending"><ShieldQuestion style={{ width: 12, height: 12 }} /><span>PENDING</span></span>;
}

export default function BorrowersView({ borrowers = [], loans = [], branches = [], onCreateBorrower, onUpdateBorrower, onDeleteBorrower, onOpenKycReview }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('TABLE');
  const [selectedBorrower, setSelectedBorrower] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('CREATE');
  const [formInitialData, setFormInitialData] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fmt = n => Number(n || 0).toLocaleString('en-IN');

  const enrichedBorrowers = useMemo(() => {
    return borrowers.map(b => {
      const relatedLoans = loans.filter(l => normalizePhone(l.phone) === normalizePhone(b.phone) && normalizePhone(b.phone));
      const totalOutstanding = relatedLoans.reduce((acc, l) => acc + (parseFloat(l.pending_amount) || 0), 0);
      const disbursedAmount = relatedLoans.reduce((acc, l) => acc + (parseFloat(l.principal_amount) || 0), 0);
      return {
        ...b,
        loansCount: relatedLoans.length,
        totalOutstanding,
        disbursedAmount,
        loansList: relatedLoans
      };
    });
  }, [borrowers, loans]);

  const borrowersList = enrichedBorrowers.filter(b => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      (b.full_name || '').toLowerCase().includes(q) ||
      (b.phone || '').includes(q) ||
      (b.aadhaar_number || '').includes(q) ||
      (b.pan_number || '').toLowerCase().includes(q) ||
      (b.borrower_code || '').toLowerCase().includes(q) ||
      (b.city || '').toLowerCase().includes(q)
    );
    if (!matchesSearch) return false;
    if (statusFilter === 'ACTIVE_LOANS') return b.totalOutstanding > 0;
    if (statusFilter === 'VERIFIED') return b.kyc_status === 'VERIFIED';
    if (statusFilter === 'PENDING_KYC') return b.kyc_status === 'PENDING' || !b.kyc_status;
    return true;
  });

  const totalPages = Math.ceil(borrowersList.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedList = borrowersList.slice(startIndex, startIndex + pageSize);

  const totalBorrowers = enrichedBorrowers.length;

  const openCreateForm = () => {
    setFormMode('CREATE');
    setFormInitialData(null);
    setFormOpen(true);
  };

  const openEditForm = (borrower) => {
    setFormMode('EDIT');
    setFormInitialData(borrower);
    setFormOpen(true);
  };

  const handleFormSubmit = async (payload, id) => {
    if (formMode === 'EDIT' && id) {
      await onUpdateBorrower(id, payload);
    } else {
      await onCreateBorrower(payload);
    }
    setFormOpen(false);
  };

  if (formOpen) {
    return (
      <CustomerFormPage
        mode={formMode}
        initialData={formInitialData}
        branches={branches}
        onCancel={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
      />
    );
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await onDeleteBorrower(deleteTarget.id);
      setDeleteTarget(null);
      if (selectedBorrower?.id === deleteTarget.id) setSelectedBorrower(null);
    } catch (err) {
      setDeleteError(err?.response?.data?.message || 'Unable to delete this customer.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="borrowers-page">

      {/* ── 1. Top Page Professional Header ───────────────────────────────── */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 14,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Users style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
              Customer Directory
            </h1>
            <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '3px 0 0 0', fontWeight: 400 }}>
              Manage master customer profiles, KYC records, and active loan exposure
            </p>
          </div>
        </div>

        <button
          className="btn-add-borrower"
          onClick={openCreateForm}
          style={{
            border: 'none',
            background: '#059669',
            color: '#FFFFFF',
            fontSize: '0.78rem',
            fontWeight: 500,
            padding: '8px 16px',
            borderRadius: 9,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)'
          }}
        >
          <Plus style={{ width: 15, height: 15 }} />
          <span>Register New Customer</span>
        </button>
      </div>

      {/* ── 3. Directory Toolbar (Non-collapsing) ─────────────────────── */}
      <div className="borrowers-toolbar">
        <div className="borrowers-toolbar__left">
          <div className="borrowers-toolbar__search">
            <Search className="search-icon" style={{ width: 15, height: 15 }} />
            <input
              type="text"
              placeholder="Search Customer name, Code, Phone, Aadhaar, or PAN..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <div className="borrowers-toolbar__tabs">
            <button
              className={`borrowers-toolbar__tab-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
            >
              All Customers ({totalBorrowers})
            </button>
            <button
              className={`borrowers-toolbar__tab-btn ${statusFilter === 'ACTIVE_LOANS' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('ACTIVE_LOANS'); setCurrentPage(1); }}
            >
              Active Loans Only
            </button>
            <button
              className={`borrowers-toolbar__tab-btn ${statusFilter === 'VERIFIED' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('VERIFIED'); setCurrentPage(1); }}
            >
              Verified KYC
            </button>
            <button
              className={`borrowers-toolbar__tab-btn ${statusFilter === 'PENDING_KYC' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('PENDING_KYC'); setCurrentPage(1); }}
            >
              Pending KYC
            </button>
          </div>
        </div>

        <div className="borrowers-toolbar__right">
          <div className="borrowers-toolbar__view-switch">
            <button
              className={viewMode === 'TABLE' ? 'active' : ''}
              onClick={() => setViewMode('TABLE')}
              title="Table View"
            >
              <List style={{ width: 16, height: 16 }} />
            </button>
            <button
              className={viewMode === 'CARDS' ? 'active' : ''}
              onClick={() => setViewMode('CARDS')}
              title="Cards Grid View"
            >
              <LayoutGrid style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'TABLE' ? (
        <div className="borrowers-table-card">
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 50, textAlign: 'center' }}>S.No</th>
                  <th>Customer Profile</th>
                  <th>Contact Phone</th>
                  <th>Branch</th>
                  <th style={{ textAlign: 'center' }}>Active Accounts</th>
                  <th style={{ textAlign: 'right' }}>Total Exposure</th>
                  <th style={{ textAlign: 'center' }}>KYC Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
                      No customer master records match your search criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((b, idx) => (
                    <tr key={b.id}>
                      <td style={{ textAlign: 'center', color: '#64748B', fontWeight: 500 }}>
                        {startIndex + idx + 1}
                      </td>

                      <td>
                        <div className="borrower-profile-cell">
                          <div className="avatar">
                            {b.profile_image ? <img src={b.profile_image} alt={b.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} /> : (b.full_name || '?').charAt(0)}
                          </div>
                          <div className="details">
                            <strong style={{ fontWeight: 600 }}>{b.full_name}</strong>
                            <div style={{ fontSize: '0.68rem', color: '#94A3B8', fontFamily: 'monospace' }}>{b.borrower_code}</div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 500 }}>
                          {b.phone}
                        </span>
                      </td>

                      <td>
                        <span style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: 500 }}>
                          {b.branch || '—'}
                        </span>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span className="loans-badge">
                          {b.loansCount} {b.loansCount === 1 ? 'Loan' : 'Loans'}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <strong style={{ color: b.totalOutstanding > 0 ? '#DC2626' : '#059669', fontSize: '0.85rem', fontWeight: 600 }}>
                          ₹{fmt(b.totalOutstanding)}
                        </strong>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                          <KycBadge status={b.kyc_status} />
                          {(b.kyc_status === 'PENDING' || !b.kyc_status) && (
                            <button
                              onClick={() => onOpenKycReview?.(b)}
                              style={{
                                border: 'none', background: '#D97706', color: '#FFFFFF', fontSize: '0.66rem', fontWeight: 700,
                                padding: '2px 10px', borderRadius: 20, cursor: 'pointer', letterSpacing: '0.02em'
                              }}
                            >
                              VERIFY
                            </button>
                          )}
                        </div>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div className="action-btn-group">
                          <button
                            className="btn-action"
                            onClick={() => setSelectedBorrower(b)}
                            title="Inspect Full Profile"
                          >
                            <Eye style={{ width: 12, height: 12 }} />
                          </button>
                          <button
                            className="btn-action"
                            onClick={() => openEditForm(b)}
                            title="Edit Customer"
                          >
                            <Pencil style={{ width: 12, height: 12 }} />
                          </button>
                          <button
                            className="btn-action btn-action--danger"
                            onClick={() => { setDeleteTarget(b); setDeleteError(''); }}
                            title="Delete Customer"
                          >
                            <Trash2 style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="table-pagination">
            <div className="table-pagination__info">
              Showing <strong>{borrowersList.length === 0 ? 0 : startIndex + 1}</strong> to <strong>{Math.min(startIndex + pageSize, borrowersList.length)}</strong> of <strong>{borrowersList.length}</strong> entries
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
      ) : (
        <div className="borrowers-cards-grid">
          {borrowersList.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#94A3B8' }}>
              No customer master records match your search criteria.
            </div>
          ) : borrowersList.map((b) => (
            <div className="borrower-card" key={b.id}>
              <div className="borrower-card__head">
                <div className="b-user">
                  <div className="b-avatar">
                    {b.profile_image ? <img src={b.profile_image} alt={b.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} /> : (b.full_name || '?').charAt(0)}
                  </div>
                  <div className="b-meta">
                    <strong>{b.full_name}</strong>
                    <span>{b.phone} • {b.branch || 'No branch'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                  <KycBadge status={b.kyc_status} />
                  {(b.kyc_status === 'PENDING' || !b.kyc_status) && (
                    <button
                      onClick={() => onOpenKycReview?.(b)}
                      style={{
                        border: 'none', background: '#D97706', color: '#FFFFFF', fontSize: '0.66rem', fontWeight: 700,
                        padding: '2px 10px', borderRadius: 20, cursor: 'pointer', letterSpacing: '0.02em'
                      }}
                    >
                      VERIFY
                    </button>
                  )}
                </div>
              </div>

              <div className="borrower-card__stats-row">
                <div className="b-stat">
                  <span>Disbursed Principal</span>
                  <strong>₹{fmt(b.disbursedAmount)}</strong>
                </div>
                <div className="b-stat">
                  <span>Outstanding Balance</span>
                  <strong className={b.totalOutstanding > 0 ? 'red' : ''}>₹{fmt(b.totalOutstanding)}</strong>
                </div>
              </div>

              <div className="borrower-card__footer">
                <button className="btn-secondary" onClick={() => setSelectedBorrower(b)}>
                  <Eye style={{ width: 14, height: 14 }} />
                  <span>View</span>
                </button>
                <button className="btn-secondary" onClick={() => openEditForm(b)}>
                  <Pencil style={{ width: 14, height: 14 }} />
                  <span>Edit</span>
                </button>
                <button className="btn-danger-outline" onClick={() => { setDeleteTarget(b); setDeleteError(''); }}>
                  <Trash2 style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 5. Borrower Profile Modal / Quick Inspection ──────────────── */}
      {selectedBorrower && (
        <div className="saas-modal-backdrop">
          <div className="saas-modal-card saas-modal-card--lg">

            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge">
                  <Users style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3 style={{ fontWeight: 600 }}>Customer Master Profile</h3>
                  <p>{selectedBorrower.borrower_code} • KYC Verification Records & Active Loan Accounts</p>
                </div>
              </div>
              <button onClick={() => setSelectedBorrower(null)} className="close-btn" type="button">
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div className="saas-modal-banner">
              <div className="banner-top">
                <div>
                  <div className="borrower-name" style={{ fontWeight: 600 }}>{selectedBorrower.full_name}</div>
                  <div className="borrower-sub">Phone: {selectedBorrower.phone} • Branch: {selectedBorrower.branch || '—'}</div>
                </div>
                <KycBadge status={selectedBorrower.kyc_status} />
              </div>

              <div className="banner-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="stat-col">
                  <span>Guarantor</span>
                  <strong style={{ color: '#059669', fontWeight: 600 }}>{selectedBorrower.guarantor_name || '—'}</strong>
                </div>
                <div className="stat-col">
                  <span>Aadhaar Number</span>
                  <strong style={{ fontWeight: 600 }}>{selectedBorrower.aadhaar_number || '—'}</strong>
                </div>
                <div className="stat-col">
                  <span>PAN Number</span>
                  <strong style={{ textTransform: 'uppercase', fontWeight: 600 }}>{selectedBorrower.pan_number || '—'}</strong>
                </div>
                <div className="stat-col">
                  <span>Total Exposure</span>
                  <strong className="orange" style={{ fontWeight: 600 }}>₹{fmt(selectedBorrower.totalOutstanding)}</strong>
                </div>
              </div>
            </div>

            <div className="saas-modal-body" style={{ maxHeight: '52vh', overflowY: 'auto' }}>
              <div className="form-row">
                <div className="form-group">
                  <label>Address</label>
                  <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                    {[selectedBorrower.address_line1, selectedBorrower.address_line2, selectedBorrower.city, selectedBorrower.state, selectedBorrower.pincode].filter(Boolean).join(', ') || '—'}
                  </div>
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <div style={{ fontSize: '0.8rem', color: '#334155' }}>{selectedBorrower.email || '—'}</div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Occupation</label>
                  <div style={{ fontSize: '0.8rem', color: '#334155' }}>{selectedBorrower.occupation || '—'} {selectedBorrower.employer_name ? `(${selectedBorrower.employer_name})` : ''}</div>
                </div>
                <div className="form-group">
                  <label>Monthly Income</label>
                  <div style={{ fontSize: '0.8rem', color: '#334155' }}>{selectedBorrower.monthly_income ? `₹${fmt(selectedBorrower.monthly_income)}` : '—'}</div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Nominee</label>
                  <div style={{ fontSize: '0.8rem', color: '#334155' }}>{selectedBorrower.nominee_name ? `${selectedBorrower.nominee_name} (${selectedBorrower.nominee_relation || 'N/A'})` : '—'}</div>
                </div>
                <div className="form-group">
                  <label>Account Status</label>
                  <div style={{ fontSize: '0.8rem', color: '#334155' }}>{selectedBorrower.status || 'ACTIVE'}</div>
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Associated Loan Accounts ({selectedBorrower.loansList.length})</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  {selectedBorrower.loansList.length === 0 && (
                    <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>No loan accounts linked to this customer yet.</div>
                  )}
                  {selectedBorrower.loansList.map(loan => (
                    <div
                      key={loan.id}
                      style={{
                        padding: 12,
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.8rem'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{loan.loan_account_no}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          Disbursed: ₹{fmt(loan.principal_amount)} • EMI: ₹{loan.installment_amount}/day
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: loan.pending_amount > 0 ? '#DC2626' : '#059669' }}>
                          Pending: ₹{fmt(loan.pending_amount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="saas-modal-footer">
              <button
                type="button"
                onClick={() => { openEditForm(selectedBorrower); setSelectedBorrower(null); }}
                className="btn-cancel"
                style={{ fontWeight: 500 }}
              >
                Edit Profile
              </button>
              {(selectedBorrower.kyc_status === 'PENDING' || !selectedBorrower.kyc_status) && (
                <button
                  type="button"
                  onClick={() => { onOpenKycReview?.(selectedBorrower); setSelectedBorrower(null); }}
                  style={{
                    border: 'none', background: '#D97706', color: '#FFFFFF', fontWeight: 600, padding: '9px 18px',
                    borderRadius: 9, cursor: 'pointer', fontSize: '0.78rem'
                  }}
                >
                  Review KYC
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedBorrower(null)}
                className="btn-submit"
                style={{ fontWeight: 500 }}
              >
                Close Profile
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── 6. Delete Confirmation Modal ──────────────────────────────── */}
      {deleteTarget && (
        <div className="saas-modal-backdrop">
          <div className="saas-modal-card">
            <div className="saas-modal-header">
              <div className="head-left">
                <div className="head-icon-badge" style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#DC2626' }}>
                  <Trash2 style={{ width: 18, height: 18 }} />
                </div>
                <div className="head-titles">
                  <h3>Delete Customer Record</h3>
                  <p>This action cannot be undone</p>
                </div>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="close-btn" type="button">
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div className="saas-modal-body">
              <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0 }}>
                Are you sure you want to permanently delete <strong>{deleteTarget.full_name}</strong> ({deleteTarget.borrower_code}) from the customer directory?
              </p>
              {deleteError && (
                <div className="form-alert form-alert--error">
                  <AlertTriangle style={{ width: 14, height: 14 }} />
                  <span>{deleteError}</span>
                </div>
              )}
            </div>
            <div className="saas-modal-footer">
              <button type="button" onClick={() => setDeleteTarget(null)} className="btn-cancel">
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteLoading}
                className="btn-submit"
                style={{ background: '#DC2626', boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)' }}
              >
                {deleteLoading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
