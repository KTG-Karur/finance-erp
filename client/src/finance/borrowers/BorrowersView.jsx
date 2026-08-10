import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Search,
  Plus,
  LayoutGrid,
  List,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Printer,
  Filter,
  ChevronDown,
  Download,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import CustomerFormPage from './CustomerFormPage';
import PrintableCustomerApplicationForm from './PrintableCustomerApplicationForm';
import PrintableCustomerDirectoryReport from './PrintableCustomerDirectoryReport';
import CustomerProfileModal from './CustomerProfileModal';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

const normalizePhone = (p) => (p || '').toString().replace(/\D/g, '');

function KycBadge({ status }) {
  const { tStatus } = useLanguage();
  if (status === 'VERIFIED') {
    return (
      <span className="kyc-dot-badge kyc-dot-badge--verified">
        <span className="dot"></span>
        <span>{tStatus('VERIFIED')}</span>
      </span>
    );
  }
  return (
    <span className="kyc-dot-badge kyc-dot-badge--pending">
      <span className="dot"></span>
      <span>{tStatus('PENDING')}</span>
    </span>
  );
}

export default function BorrowersView({ borrowers = [], loans = [], branches = [], selectedBranch = 'ALL', onCreateBorrower, onUpdateBorrower, onDeleteBorrower, onOpenKycReview }) {
  const { t, tStatus } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  useEffect(() => {
    if (selectedBranch && selectedBranch !== 'ALL') setBranchFilter(selectedBranch);
  }, [selectedBranch]);
  const [viewMode, setViewMode] = useState('TABLE');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('CREATE');
  const [formInitialData, setFormInitialData] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [printTarget, setPrintTarget] = useState(null);
  const [profileTarget, setProfileTarget] = useState(null);

  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [showDirectoryReport, setShowDirectoryReport] = useState(false);

  const handleExportCsv = () => {
    const headers = [
      'Customer Code', 'Full Name', 'Father/Spouse Name', 'DOB', 'Gender', 'Phone', 'Alt Phone',
      'Email', 'Address Line 1', 'City', 'State', 'Pincode', 'Aadhaar Number', 'PAN Number', 'Loans Count', 'KYC Status'
    ];

    const rows = borrowersList.map(b => [
      b.borrower_code || '',
      b.full_name || '',
      b.father_spouse_name || '',
      b.dob || '',
      b.gender || '',
      b.phone || '',
      b.alt_phone || '',
      b.email || '',
      b.address_line1 || '',
      b.city || '',
      b.state || '',
      b.pincode || '',
      b.aadhaar_number || '',
      b.pan_number || '',
      b.loansCount || 0,
      b.kyc_status || 'PENDING'
    ]);

    const csvLines = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvLines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Customer_Master_Directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
      (b.alternate_phone || '').includes(q) ||
      (b.email || '').toLowerCase().includes(q) ||
      (b.aadhaar_number || '').includes(q) ||
      (b.pan_number || '').toLowerCase().includes(q) ||
      (b.voter_id || '').toLowerCase().includes(q) ||
      (b.borrower_code || '').toLowerCase().includes(q) ||
      (b.branch || '').toLowerCase().includes(q) ||
      (b.city || '').toLowerCase().includes(q) ||
      (b.state || '').toLowerCase().includes(q) ||
      (b.pincode || '').includes(q) ||
      (b.street_address || b.address || '').toLowerCase().includes(q) ||
      (b.occupation || '').toLowerCase().includes(q) ||
      (b.kyc_status || '').toLowerCase().includes(q) ||
      (b.loansList || []).some(l => (l.loan_code || l.loan_number || '').toLowerCase().includes(q))
    );
    if (!matchesSearch) return false;
    if (branchFilter !== 'ALL' && b.branch !== branchFilter) return false;
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
    } catch (err) {
      setDeleteError(err?.response?.data?.message || 'Unable to delete this customer.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="fin-page">

      {/* ── 1. Top Page Header + Summary Stats ───────────────────────────── */}
      <div className="fin-header-card">
        <div className="fin-page-header">
          <div className="fin-page-header__left">
            <div className="fin-page-header__icon" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#059669' }}>
              <Users style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="fin-page-header__title">{t('cust.title')}</h1>
              <p className="fin-page-header__subtitle">{t('cust.subtitle')}</p>
            </div>
          </div>

          <button type="button" className="fin-btn-primary" onClick={openCreateForm}>
            <Plus style={{ width: 14, height: 14 }} />
            <span>{t('cust.register_new')}</span>
          </button>
        </div>

        <div className="fin-header-stats">
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">Total Registered Customers</span>
            <span className="fin-header-stat__value">{totalBorrowers}</span>
          </div>
          <div className="fin-header-stat">
            <span className="fin-header-stat__label">Active Loan Borrowers</span>
            <span className="fin-header-stat__value fin-header-stat__value--good">{enrichedBorrowers.filter(b => b.totalOutstanding > 0).length}</span>
          </div>
        </div>
      </div>

      {/* ── 2. Directory Toolbar (Search & Filters) ─────────────────────── */}
      <div className="fin-filterbar">
        <div className="fin-field" style={{ minWidth: 200 }}>
          <label>{t('fin.find_transactions_placeholder')}</label>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 9, top: 9, width: 13, height: 13, color: '#94A3B8' }} />
            <input
              className="fin-input"
              style={{ paddingLeft: 28, width: '100%', boxSizing: 'border-box' }}
              type="text"
              placeholder={t('cust.search')}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        <div className="fin-field">
          <label>Filter</label>
          <select
            className="fin-select"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="ALL">All Customers ({totalBorrowers})</option>
            <option value="ACTIVE_LOANS">Active Loans Only</option>
            <option value="VERIFIED">Verified KYC</option>
            <option value="PENDING_KYC">Pending KYC</option>
          </select>
        </div>

        <div className="fin-field">
          <label>{t('fin.branch_label')}</label>
          <select
            className="fin-select"
            value={branchFilter}
            onChange={(e) => { setBranchFilter(e.target.value); setCurrentPage(1); }}
            disabled={Boolean(selectedBranch && selectedBranch !== 'ALL')}
          >
            <option value="ALL">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
          </select>
        </div>

        <div className="fin-quickrow">
          {/* Export / Print Dropdown Menu */}
          <div className="export-dropdown-container">
            <button
              type="button"
              className="btn-export-trigger"
              onClick={() => setExportDropdownOpen(prev => !prev)}
            >
              <Printer style={{ width: 15, height: 15, color: '#059669' }} />
              <span>Export / Print</span>
              <ChevronDown style={{ width: 14, height: 14, color: '#64748B' }} />
            </button>

            {exportDropdownOpen && (
              <div className="export-menu-dropdown">
                <button
                  type="button"
                  onClick={() => { setShowDirectoryReport(true); setExportDropdownOpen(false); }}
                >
                  <Printer style={{ width: 14, height: 14, color: '#059669' }} />
                  <span>Print Directory Report (B&W Sheet)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setShowDirectoryReport(true); setExportDropdownOpen(false); }}
                >
                  <FileText style={{ width: 14, height: 14, color: '#2563EB' }} />
                  <span>Export PDF Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => { handleExportCsv(); setExportDropdownOpen(false); }}
                >
                  <Download style={{ width: 14, height: 14, color: '#D97706' }} />
                  <span>Export Excel Spreadsheet (.csv)</span>
                </button>
              </div>
            )}
          </div>

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
        <div className="fin-tablewrap">
          <table className="fin-grid-table">
              <thead>
                <tr>
                  <th style={{ width: 60, textAlign: 'center' }}>{t('col.sno')}</th>
                  <th>{t('col.customer_profile')}</th>
                  <th>{t('col.contact_info')}</th>
                  <th>{t('col.branch')}</th>
                  <th>{t('col.government_ids')}</th>
                  <th className="num">No. of Loans</th>
                  <th className="num">{t('col.loan_exposure')}</th>
                  <th style={{ textAlign: 'right' }}>{t('col.actions')}</th>
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
                    <tr key={b.id} onClick={() => setProfileTarget(b)} style={{ cursor: 'pointer' }}>
                      <td style={{ textAlign: 'center', color: '#94A3B8' }}>{startIndex + idx + 1}</td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                            background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.78rem', fontWeight: 700
                          }}>
                            {b.profile_image ? (
                              <img src={b.profile_image} alt={b.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              (b.full_name || '?').charAt(0)
                            )}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ color: '#0F172A', fontSize: '0.8rem', fontWeight: 600 }}>{b.full_name}</div>
                            <div className="code" style={{ fontSize: '0.7rem' }}>{b.borrower_code || 'KTG-CUST'}</div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{b.phone || '—'}</span>
                          {b.email && <span style={{ color: '#94A3B8', fontSize: '0.72rem' }}>{b.email}</span>}
                        </div>
                      </td>

                      <td>{b.branch || 'Karur Main'}</td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem' }}>
                          {b.aadhaar_number && <span>Aadhaar: {b.aadhaar_number}</span>}
                          {b.pan_number && <span>PAN: {b.pan_number}</span>}
                          {!b.aadhaar_number && !b.pan_number && (
                            <span style={{ color: '#94A3B8' }}>No ID Recorded</span>
                          )}
                        </div>
                      </td>

                      <td className="num" style={{ fontWeight: 600, color: '#0F172A' }}>{b.loansCount}</td>

                      <td className="num" style={{ fontWeight: 600, color: b.totalOutstanding > 0 ? '#DC2626' : '#059669' }}>
                        ₹{fmt(b.totalOutstanding)}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div className="action-btn-group">
                          <button
                            type="button"
                            className="btn-action"
                            onClick={(e) => { e.stopPropagation(); setPrintTarget(b); }}
                            title="Print Customer Application Form (Xerox Sheet)"
                          >
                            <Printer style={{ width: 14, height: 14, color: '#059669' }} />
                          </button>
                          <button
                            type="button"
                            className="btn-action"
                            onClick={(e) => { e.stopPropagation(); openEditForm(b); }}
                            title="Edit Customer"
                          >
                            <Pencil style={{ width: 14, height: 14 }} />
                          </button>
                          <button
                            type="button"
                            className="btn-action btn-action--danger"
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(b); setDeleteError(''); }}
                            title="Delete Customer"
                          >
                            <Trash2 style={{ width: 14, height: 14 }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

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
          {paginatedList.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#94A3B8' }}>
              No customer master records match your search criteria.
            </div>
          ) : (
            paginatedList.map((b) => (
              <div className="borrower-card" key={b.id} onClick={() => setProfileTarget(b)} style={{ cursor: 'pointer' }}>
                <div className="borrower-card__head">
                  <div className="b-user">
                    <div className="avatar">
                      {b.profile_image ? (
                        <img src={b.profile_image} alt={b.full_name} />
                      ) : (
                        (b.full_name || '?').charAt(0)
                      )}
                    </div>
                    <div className="name-box">
                      <h4>{b.full_name}</h4>
                      <span>{b.borrower_code || 'KTG-CUST'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <KycBadge status={b.kyc_status} />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onOpenKycReview?.(b); }}
                      style={{
                        border: b.kyc_status === 'VERIFIED' ? '1px solid #CBD5E1' : 'none',
                        background: b.kyc_status === 'VERIFIED' ? '#FFFFFF' : '#D97706',
                        color: b.kyc_status === 'VERIFIED' ? '#475569' : '#FFFFFF',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 12,
                        cursor: 'pointer'
                      }}
                    >
                      {b.kyc_status === 'VERIFIED' ? 'Inspect' : 'Review'}
                    </button>
                  </div>
                </div>

                <div className="borrower-card__body">
                  <div className="info-item">
                    <span className="lbl">Mobile</span>
                    <span className="val">{b.phone || '—'}</span>
                  </div>
                  <div className="info-item">
                    <span className="lbl">Branch</span>
                    <span className="val">{b.branch || 'Karur Main'}</span>
                  </div>
                  <div className="info-item">
                    <span className="lbl">Active Loans</span>
                    <span className="val">{b.loansCount} Accounts</span>
                  </div>
                  <div className="info-item">
                    <span className="lbl">Exposure</span>
                    <span className="val" style={{ color: b.totalOutstanding > 0 ? '#DC2626' : '#059669' }}>
                      ₹{fmt(b.totalOutstanding)}
                    </span>
                  </div>
                </div>

                <div className="borrower-card__footer">
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontFamily: 'monospace' }}>
                    {b.aadhaar_number ? `Aadhaar: ${b.aadhaar_number}` : (b.pan_number ? `PAN: ${b.pan_number}` : 'No ID')}
                  </div>
                  <div className="action-btn-group">
                    <button
                      type="button"
                      className="btn-action"
                      onClick={(e) => { e.stopPropagation(); setPrintTarget(b); }}
                      title="Print Customer Form"
                    >
                      <Printer style={{ width: 13, height: 13, color: '#059669' }} />
                    </button>
                    <button
                      type="button"
                      className="btn-action"
                      onClick={(e) => { e.stopPropagation(); openEditForm(b); }}
                      title="Edit Customer"
                    >
                      <Pencil style={{ width: 13, height: 13 }} />
                    </button>
                    <button
                      type="button"
                      className="btn-action btn-action--danger"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(b); setDeleteError(''); }}
                      title="Delete Customer"
                    >
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
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

      {/* Customer Profile Modal — full onscreen record view */}
      {profileTarget && (
        <CustomerProfileModal
          borrower={profileTarget}
          onClose={() => setProfileTarget(null)}
          onEdit={() => { openEditForm(profileTarget); setProfileTarget(null); }}
          onReviewKyc={() => { onOpenKycReview?.(profileTarget); setProfileTarget(null); }}
        />
      )}

      {/* Printable Black & White Application Form Sheet Modal */}
      {printTarget && (
        <PrintableCustomerApplicationForm
          formData={printTarget}
          profileImage={printTarget.profile_image}
          documents={printTarget.documents || []}
          onClose={() => setPrintTarget(null)}
        />
      )}

      {/* Printable Black & White Customer Master Directory Report Modal */}
      {showDirectoryReport && (
        <PrintableCustomerDirectoryReport
          borrowers={borrowersList}
          onClose={() => setShowDirectoryReport(false)}
        />
      )}
    </div>
  );
}
