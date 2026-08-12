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

export default function BorrowersView({ borrowers = [], loans = [], branches = [], selectedBranch = 'ALL', tenant, onCreateBorrower, onUpdateBorrower, onDeleteBorrower }) {
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

  // Excel auto-detects long digit-only cells as numbers and reformats them
  // into scientific notation (e.g. a 12-digit Aadhaar number becomes
  // "9.87654E+11") the moment the CSV is opened — standard CSV quoting
  // doesn't stop this, since it's Excel's own numeric-sniffing, not a CSV
  // escaping problem. Wrapping the value as an `="..."` formula is the
  // standard workaround: Excel evaluates it as a literal text string instead.
  const forceTextCell = (val) => (val ? `="${String(val).replace(/"/g, '""')}"` : '');

  const handleExportCsv = () => {
    const headers = [
      'Customer Code', 'Full Name', 'Father/Spouse Name', 'DOB', 'Gender', 'Phone', 'Alt Phone',
      'Email', 'Address Line 1', 'City', 'State', 'Pincode', 'Aadhaar Number', 'PAN Number', 'Loans Count', 'Active Loans', 'Completed Loans'
    ];

    const rows = borrowersList.map(b => [
      b.borrower_code || '',
      b.full_name || '',
      b.father_spouse_name || '',
      b.dob || '',
      b.gender || '',
      forceTextCell(b.phone),
      forceTextCell(b.alt_phone),
      b.email || '',
      b.address_line1 || '',
      b.city || '',
      b.state || '',
      b.pincode || '',
      forceTextCell(b.aadhaar_number),
      b.pan_number || '',
      b.loansCount || 0,
      b.activeLoansCount || 0,
      b.completedLoansCount || 0
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
      // Prefer the real borrower_id link; phone is only a fallback for legacy
      // rows created before that link existed (matching by phone alone breaks
      // the moment a customer's phone number is ever corrected/updated).
      const relatedLoans = loans.filter(l => (
        (l.borrower_id != null && l.borrower_id === b.id)
        || (!l.borrower_id && normalizePhone(l.phone) === normalizePhone(b.phone) && normalizePhone(b.phone))
      ));
      // PENDING/APPROVED/REJECTED loans are applications — no cash has left the
      // vault yet (APPROVED means "reviewed", not "disbursed"; see loan.service.js's
      // APPROVED->ACTIVE transition, which is the actual disbursal step). Counting
      // any of them as real exposure/outstanding balance showed a customer as
      // carrying debt for loans that don't exist yet, or never will if rejected.
      const disbursedStatuses = ['ACTIVE', 'OVERDUE', 'PENDING_CLOSURE', 'CLOSED'];
      const disbursedLoans = relatedLoans.filter(l => disbursedStatuses.includes(l.status));
      const totalOutstanding = relatedLoans
        .filter(l => l.status === 'ACTIVE' || l.status === 'OVERDUE' || l.status === 'PENDING_CLOSURE')
        .reduce((acc, l) => acc + (parseFloat(l.pending_amount) || 0), 0);
      const disbursedAmount = disbursedLoans.reduce((acc, l) => acc + (parseFloat(l.principal_amount) || 0), 0);
      const activeLoansCount = relatedLoans.filter(l => l.status === 'ACTIVE' || l.status === 'OVERDUE' || l.status === 'PENDING_CLOSURE').length;
      const completedLoansCount = relatedLoans.filter(l => l.status === 'CLOSED').length;
      return {
        ...b,
        loansCount: disbursedLoans.length,
        activeLoansCount,
        completedLoansCount,
        totalOutstanding,
        disbursedAmount,
        // CustomerProfileModal's "Associated Loan Accounts" section literally
        // labels each row "Disbursed ₹X" — showing a PENDING/APPROVED/REJECTED
        // application there claimed money had gone out the door for a loan
        // that doesn't exist yet (or never will, if rejected). Only genuinely
        // disbursed accounts belong under that heading; applications have
        // their own dedicated page (Loan Applications).
        loansList: disbursedLoans
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
      (b.loansList || []).some(l => (l.loan_code || l.loan_number || '').toLowerCase().includes(q))
    );
    if (!matchesSearch) return false;
    if (branchFilter !== 'ALL' && b.branch !== branchFilter) return false;
    if (statusFilter === 'ACTIVE_LOANS') return b.totalOutstanding > 0;
    return true;
  });

  const totalPages = Math.ceil(borrowersList.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
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
        tenant={tenant}
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
            <div className="fin-page-header__icon" style={{ background: 'var(--brand-primary-light, #F0FEF5)', border: '1px solid var(--brand-primary-border, #A3F5C1)', color: 'var(--brand-primary, #15803D)' }}>
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
              <Printer style={{ width: 15, height: 15, color: 'var(--brand-primary, #15803D)' }} />
              <span>Export / Print</span>
              <ChevronDown style={{ width: 14, height: 14, color: '#64748B' }} />
            </button>

            {exportDropdownOpen && (
              <div className="export-menu-dropdown">
                <button
                  type="button"
                  onClick={() => { setShowDirectoryReport(true); setExportDropdownOpen(false); }}
                >
                  <Printer style={{ width: 14, height: 14, color: 'var(--brand-primary, #15803D)' }} />
                  <span>Print Directory Report (B&W Sheet)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setShowDirectoryReport(true); setExportDropdownOpen(false); }}
                >
                  <FileText style={{ width: 14, height: 14, color: 'var(--color-info, #2563EB)' }} />
                  <span>Export PDF Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => { handleExportCsv(); setExportDropdownOpen(false); }}
                >
                  <Download style={{ width: 14, height: 14, color: 'var(--color-warning, #D97706)' }} />
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
                  <th className="num">Active Loans</th>
                  <th className="num">Completed Loans</th>
                  <th className="num">{t('col.loan_exposure')}</th>
                  <th style={{ textAlign: 'right' }}>{t('col.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
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
                            background: 'var(--brand-primary-light, #F0FEF5)', color: 'var(--brand-primary, #15803D)', border: '1px solid var(--brand-primary-border, #A3F5C1)',
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
                            <div className="code" style={{ fontSize: '0.7rem' }}>{b.borrower_code || '—'}</div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{b.phone || '—'}</span>
                          {b.email && <span style={{ color: '#94A3B8', fontSize: '0.72rem' }}>{b.email}</span>}
                        </div>
                      </td>

                      <td>{b.branch || '—'}</td>

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

                      <td className="num" style={{ fontWeight: 600, color: b.activeLoansCount > 0 ? 'var(--brand-primary, #15803D)' : '#94A3B8' }}>{b.activeLoansCount}</td>

                      <td className="num" style={{ fontWeight: 600, color: '#64748B' }}>{b.completedLoansCount}</td>

                      <td className="num" style={{ fontWeight: 600, color: b.totalOutstanding > 0 ? 'var(--color-danger, #DC2626)' : 'var(--brand-primary, #15803D)' }}>
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
                            <Printer style={{ width: 14, height: 14, color: 'var(--brand-primary, #15803D)' }} />
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
                      <span>{b.borrower_code || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="borrower-card__body">
                  <div className="info-item">
                    <span className="lbl">Mobile</span>
                    <span className="val">{b.phone || '—'}</span>
                  </div>
                  <div className="info-item">
                    <span className="lbl">Branch</span>
                    <span className="val">{b.branch || '—'}</span>
                  </div>
                  <div className="info-item">
                    <span className="lbl">Active Loans</span>
                    <span className="val">{b.activeLoansCount} Accounts</span>
                  </div>
                  <div className="info-item">
                    <span className="lbl">Completed Loans</span>
                    <span className="val">{b.completedLoansCount} Accounts</span>
                  </div>
                  <div className="info-item">
                    <span className="lbl">Exposure</span>
                    <span className="val" style={{ color: b.totalOutstanding > 0 ? 'var(--color-danger, #DC2626)' : 'var(--brand-primary, #15803D)' }}>
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
                      <Printer style={{ width: 13, height: 13, color: 'var(--brand-primary, #15803D)' }} />
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
                <div className="head-icon-badge" style={{ background: 'var(--color-danger-light, #FEF2F2)', borderColor: 'var(--color-danger-border, #FECACA)', color: 'var(--color-danger, #DC2626)' }}>
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
                style={{ background: 'var(--color-danger, #DC2626)', boxShadow: '0 2px 6px rgba(var(--color-danger-rgb), 0.3)' }}
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
        />
      )}

      {/* Printable Black & White Application Form Sheet Modal */}
      {printTarget && (
        <PrintableCustomerApplicationForm
          formData={printTarget}
          profileImage={printTarget.profile_image}
          documents={printTarget.documents || []}
          tenant={tenant}
          onClose={() => setPrintTarget(null)}
        />
      )}

      {/* Printable Black & White Customer Master Directory Report Modal */}
      {showDirectoryReport && (
        <PrintableCustomerDirectoryReport
          borrowers={borrowersList}
          tenant={tenant}
          onClose={() => setShowDirectoryReport(false)}
        />
      )}
    </div>
  );
}
